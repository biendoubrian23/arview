import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { detectDevice } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { model_id, type, duration_ms, referrer } = body || {};
    if (!model_id || !["view", "ar_activated", "session_end"].includes(type)) {
      return NextResponse.json({ error: "bad request" }, { status: 400 });
    }
    const ua = req.headers.get("user-agent") || "";
    const country = req.headers.get("x-vercel-ip-country") || null;
    const city = req.headers.get("x-vercel-ip-city") || null;

    const admin = createSupabaseAdmin();
    await admin.from("events").insert({
      model_id,
      type,
      duration_ms: typeof duration_ms === "number" ? duration_ms : null,
      device: detectDevice(ua),
      country,
      city,
      user_agent: ua.slice(0, 500),
      referrer: typeof referrer === "string" ? referrer.slice(0, 500) : null,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
