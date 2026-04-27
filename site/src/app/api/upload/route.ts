import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getPresignedUploadUrl } from "@/lib/cloudflare/r2";
import { nanoid } from "nanoid";

// POST /api/upload — Génère une URL présignée pour upload direct vers R2
export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { filename, contentType } = await request.json() as {
    filename: string;
    contentType: string;
  };

  if (!filename || !contentType) {
    return NextResponse.json({ error: "filename et contentType requis" }, { status: 400 });
  }

  const key = `models/${user.id}/${nanoid()}-${filename}`;
  const { uploadUrl, publicUrl } = await getPresignedUploadUrl(key, contentType);

  return NextResponse.json({ uploadUrl, publicUrl, key });
}
