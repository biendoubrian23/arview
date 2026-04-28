import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

const SCAN_MODE = process.env.NEXT_PUBLIC_SCAN_MODE ?? "local";
const BACKEND   = process.env.PYTHON_BACKEND_URL ?? "http://localhost:8000";
const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN ?? "";

// Modèle Replicate — on utilise l'endpoint /models/ qui prend toujours la dernière version
const REPLICATE_MODEL = process.env.REPLICATE_MODEL ?? "camenduru/triposr";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const formData = await req.formData();

  // ── Mode Replicate : Next.js appelle Replicate directement (pas de backend Python) ──
  if (SCAN_MODE === "replicate") {
    if (!REPLICATE_TOKEN) {
      return NextResponse.json(
        { error: "REPLICATE_API_TOKEN manquant dans .env" },
        { status: 500 },
      );
    }

    const imageFile = formData.get("image") as File | null;
    if (!imageFile) return NextResponse.json({ error: "Image manquante" }, { status: 400 });

    // Encode image as base64 data URI
    const buf = await imageFile.arrayBuffer();
    const b64 = Buffer.from(buf).toString("base64");
    const mime = imageFile.type || "image/jpeg";
    const dataUri = `data:${mime};base64,${b64}`;

    const res = await fetch(`https://api.replicate.com/v1/models/${REPLICATE_MODEL}/predictions`, {
      method: "POST",
      headers: {
        Authorization: `Token ${REPLICATE_TOKEN}`,
        "Content-Type": "application/json",
        "Prefer": "wait",
      },
      body: JSON.stringify({
        input: { image: dataUri },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Replicate ${res.status}: ${text}` },
        { status: res.status },
      );
    }

    const pred = await res.json();
    return NextResponse.json({ job_id: pred.id, mode: "replicate" });
  }

  // ── Mode local : proxy vers le backend Python ──────────────────────────────
  try {
    const res = await fetch(`${BACKEND}/scan/start`, { method: "POST", body: formData });
    const json = await res.json().catch(() => ({ error: "Réponse invalide" }));
    return NextResponse.json(json, { status: res.status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Backend Python inaccessible: ${msg}. Lance .\\.bat dans backend/` },
      { status: 503 },
    );
  }
}
