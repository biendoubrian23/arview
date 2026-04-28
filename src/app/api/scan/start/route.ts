import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

const SCAN_MODE       = process.env.NEXT_PUBLIC_SCAN_MODE ?? "local";
const BACKEND         = process.env.PYTHON_BACKEND_URL ?? "http://localhost:8050";
const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN ?? "";
const REPLICATE_MODEL = process.env.REPLICATE_MODEL ?? "camenduru/triposr";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Upload incomplet ou trop lourd: ${msg}` },
      { status: 413 },
    );
  }

  // Accept both single "image" (legacy) and multiple "images[]"
  const imageFiles = formData.getAll("images") as File[];
  const singleImage = formData.get("image") as File | null;
  const capture = formData.get("capture");
  const allFrames   = imageFiles.length > 0 ? imageFiles : (singleImage ? [singleImage] : []);

  if (allFrames.length === 0) {
    return NextResponse.json({ error: "Aucune image reçue" }, { status: 400 });
  }

  // ── Mode Replicate : pick best frame (largest = most detail) → TripoSR ──────
  if (SCAN_MODE === "replicate") {
    if (!REPLICATE_TOKEN) {
      return NextResponse.json({ error: "REPLICATE_API_TOKEN manquant dans .env" }, { status: 500 });
    }

    // Pick the sharpest frame (proxy: largest file size)
    const bestFrame = allFrames.reduce((a, b) => a.size > b.size ? a : b);

    const buf  = await bestFrame.arrayBuffer();
    const b64  = Buffer.from(buf).toString("base64");
    const mime = bestFrame.type || "image/jpeg";
    const dataUri = `data:${mime};base64,${b64}`;

    const res = await fetch(`https://api.replicate.com/v1/models/${REPLICATE_MODEL}/predictions`, {
      method: "POST",
      headers: {
        Authorization: `Token ${REPLICATE_TOKEN}`,
        "Content-Type": "application/json",
        "Prefer": "wait",
      },
      body: JSON.stringify({ input: { image: dataUri } }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Replicate ${res.status}: ${text}` }, { status: res.status });
    }

    const pred = await res.json();
    return NextResponse.json({
      job_id: pred.id,
      mode: "replicate",
      frames_sent: 1,
      frames_captured: allFrames.length,
    });
  }

  // ── Mode local : forward all frames to Python backend ─────────────────────
  try {
    const fd = new FormData();
    for (const f of allFrames) {
      fd.append("images", f);
    }
    if (typeof capture === "string") {
      fd.append("capture", capture);
    }
    const res  = await fetch(`${BACKEND}/scan/start`, { method: "POST", body: fd });
    const json = await res.json().catch(() => ({ error: "Réponse invalide" }));
    return NextResponse.json(json, { status: res.status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Backend Python inaccessible: ${msg}. Lance .\\start.ps1 dans backend/` },
      { status: 503 },
    );
  }
}
