import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

const SCAN_MODE       = process.env.NEXT_PUBLIC_SCAN_MODE ?? "local";
const BACKEND         = process.env.PYTHON_BACKEND_URL ?? "http://localhost:8000";
const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN ?? "";

function replicateToJob(data: Record<string, unknown>) {
  const s = data.status as string;
  const statusMap: Record<string, string> = {
    starting:   "processing",
    processing: "processing",
    succeeded:  "done",
    failed:     "error",
    canceled:   "error",
  };
  const progressMap: Record<string, number> = {
    starting: 10, processing: 55, succeeded: 100, failed: 0, canceled: 0,
  };
  const msgMap: Record<string, string> = {
    starting:   "Replicate démarre le modèle…",
    processing: "Reconstruction 3D en cours sur Replicate…",
    succeeded:  "Modèle prêt !",
    failed:     String(data.error ?? "Replicate a échoué"),
    canceled:   "Annulé",
  };
  return {
    status:   statusMap[s]  ?? "processing",
    progress: progressMap[s] ?? 30,
    message:  msgMap[s]     ?? `Replicate: ${s}`,
    // Transmit output URL so finalize can download it
    output: s === "succeeded" ? data.output : null,
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { jobId } = await params;

  // ── Mode Replicate : poll directement l'API Replicate ──────────────────────
  if (SCAN_MODE === "replicate") {
    const res = await fetch(`https://api.replicate.com/v1/predictions/${jobId}`, {
      headers: { Authorization: `Token ${REPLICATE_TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ error: "Prediction introuvable" }, { status: 404 });
    return NextResponse.json(replicateToJob(await res.json()));
  }

  // ── Mode local : proxy vers le backend Python ──────────────────────────────
  try {
    const res = await fetch(`${BACKEND}/scan/status/${jobId}`);
    const json = await res.json().catch(() => ({ error: "Réponse invalide" }));
    return NextResponse.json(json, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Backend Python inaccessible" }, { status: 503 });
  }
}
