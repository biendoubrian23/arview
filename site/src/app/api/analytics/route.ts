import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// POST /api/analytics — Enregistre un événement (vue, AR activée, etc.)
export async function POST(request: Request) {
  const supabase = await createServerClient();

  const body = await request.json() as {
    model_id: string;
    event_type: "view" | "ar_activated" | "share" | "qr_scan";
    duration_ms?: number;
  };

  if (!body.model_id || !body.event_type) {
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
  }

  // Extraction pays/ville depuis les headers (Vercel les injecte automatiquement)
  const country = request.headers.get("x-vercel-ip-country") ?? undefined;
  const city    = request.headers.get("x-vercel-ip-city") ?? undefined;

  const { error } = await supabase.from("events").insert({
    model_id:   body.model_id,
    event_type: body.event_type,
    duration_ms: body.duration_ms,
    country,
    city,
    user_agent: request.headers.get("user-agent") ?? undefined,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
