import { NextResponse } from "next/server";

const SCAN_MODE = process.env.NEXT_PUBLIC_SCAN_MODE ?? "local";
const BACKEND   = process.env.PYTHON_BACKEND_URL ?? "http://localhost:8050";

export async function GET() {
  if (SCAN_MODE !== "local") {
    return NextResponse.json({ mode: SCAN_MODE, backend: "not-needed" });
  }

  try {
    const res = await fetch(`${BACKEND}/health`, {
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return NextResponse.json({ mode: SCAN_MODE, backend: "ok", ...data });
  } catch {
    return NextResponse.json(
      { mode: SCAN_MODE, backend: "offline" },
      { status: 503 },
    );
  }
}
