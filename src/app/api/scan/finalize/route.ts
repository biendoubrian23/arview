import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase/server";
import { newSlug } from "@/lib/utils";

const SCAN_MODE       = process.env.NEXT_PUBLIC_SCAN_MODE ?? "local";
const BACKEND         = process.env.PYTHON_BACKEND_URL ?? "http://localhost:8050";
const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN ?? "";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json();
  const { jobId, name, description, category, visibility } = body ?? {};
  if (!jobId) return NextResponse.json({ error: "jobId manquant" }, { status: 400 });

  let glbBuffer: ArrayBuffer;
  let splatBuffer: ArrayBuffer | null = null;

  // ── Mode Replicate : re-poll pour obtenir l'URL du GLB ─────────────────────
  if (SCAN_MODE === "replicate") {
    const res = await fetch(`https://api.replicate.com/v1/predictions/${jobId}`, {
      headers: { Authorization: `Token ${REPLICATE_TOKEN}` },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Prediction Replicate introuvable" }, { status: 404 });
    }
    const pred = await res.json();
    if (pred.status !== "succeeded") {
      return NextResponse.json({ error: `Prediction non terminée: ${pred.status}` }, { status: 400 });
    }

    // output peut être une string ou un tableau selon le modèle
    const glbUrl: string | null =
      typeof pred.output === "string"
        ? pred.output
        : Array.isArray(pred.output)
        ? pred.output.find((u: string) => u.endsWith(".glb") || u.includes("glb")) ?? pred.output[0]
        : null;

    if (!glbUrl) {
      return NextResponse.json(
        { error: "Replicate n'a pas retourné de fichier GLB. Vérifie le modèle choisi sur replicate.com" },
        { status: 500 },
      );
    }

    const dl = await fetch(glbUrl);
    if (!dl.ok) return NextResponse.json({ error: "Téléchargement GLB échoué" }, { status: 500 });
    glbBuffer = await dl.arrayBuffer();
  } else {
    // ── Mode local : télécharge le GLB depuis le backend Python ─────────────
    try {
      const res = await fetch(`${BACKEND}/scan/result/${jobId}`);
      if (!res.ok) {
        return NextResponse.json({ error: `Backend: ${await res.text()}` }, { status: 500 });
      }
      glbBuffer = await res.arrayBuffer();

      const splatRes = await fetch(`${BACKEND}/scan/result/${jobId}/splat`);
      if (splatRes.ok) {
        splatBuffer = await splatRes.arrayBuffer();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: `Backend inaccessible: ${msg}` }, { status: 503 });
    }
  }

  // ── Upload dans Supabase Storage ───────────────────────────────────────────
  const admin = createSupabaseAdmin();
  const slug = newSlug();
  const filePath = `${user.id}/${slug}/model.glb`;
  const splatPath = splatBuffer ? `${user.id}/${slug}/splat.ply` : null;

  const { error: uploadErr } = await admin.storage
    .from("models")
    .upload(filePath, glbBuffer, { contentType: "model/gltf-binary" });

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

  if (splatBuffer && splatPath) {
    const { error: splatUploadErr } = await admin.storage
      .from("models")
      .upload(splatPath, splatBuffer, { contentType: "application/octet-stream" });

    if (splatUploadErr) {
      await admin.storage.from("models").remove([filePath]);
      return NextResponse.json({ error: splatUploadErr.message }, { status: 500 });
    }
  }

  // ── Création de l'enregistrement en base ───────────────────────────────────
  const { data: model, error: dbErr } = await admin
    .from("models")
    .insert({
      user_id: user.id,
      slug,
      name: name?.trim() || "Modèle scanné",
      description: description?.trim() || null,
      category: category || null,
      visibility: visibility || "public",
      status: "ready",
      file_path: filePath,
      file_size: glbBuffer.byteLength,
      splat_path: splatPath,
    })
    .select("id")
    .single();

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({ modelId: model.id });
}
