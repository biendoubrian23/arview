"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { newSlug } from "@/lib/utils";

const BUCKET = "models";

export async function createModelFromUpload(formData: FormData) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non connecté" };

  const file = formData.get("file") as File | null;
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  const category = String(formData.get("category") || "").trim() || null;
  const visibility =
    String(formData.get("visibility") || "public") === "private"
      ? "private"
      : "public";
  const sourceVideo = formData.get("source_video") as File | null;

  if (!file || !name) return { error: "Fichier et nom requis." };

  const allowed = [".glb", ".gltf"];
  const lower = file.name.toLowerCase();
  if (!allowed.some((ext) => lower.endsWith(ext))) {
    return { error: "Format invalide. Utilise un fichier .glb ou .gltf." };
  }
  if (file.size > 100 * 1024 * 1024) {
    return { error: "Fichier trop lourd (>100MB)." };
  }

  const slug = newSlug();
  const ext = lower.endsWith(".gltf") ? "gltf" : "glb";
  const filePath = `${user.id}/${slug}/model.${ext}`;

  const buf = new Uint8Array(await file.arrayBuffer());
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, buf, {
      contentType: ext === "gltf" ? "model/gltf+json" : "model/gltf-binary",
      upsert: false,
    });
  if (upErr) return { error: `Upload échoué : ${upErr.message}` };

  let sourceVideoPath: string | null = null;
  if (sourceVideo && sourceVideo.size > 0) {
    const vext = sourceVideo.name.split(".").pop() || "webm";
    sourceVideoPath = `${user.id}/${slug}/source.${vext}`;
    const vbuf = new Uint8Array(await sourceVideo.arrayBuffer());
    await supabase.storage.from(BUCKET).upload(sourceVideoPath, vbuf, {
      contentType: sourceVideo.type || "video/webm",
      upsert: false,
    });
  }

  const { data: row, error: insErr } = await supabase
    .from("models")
    .insert({
      user_id: user.id,
      slug,
      name,
      description,
      category,
      visibility,
      status: "ready",
      file_path: filePath,
      file_size: file.size,
      source_video_path: sourceVideoPath,
    })
    .select()
    .single();
  if (insErr) {
    await supabase.storage.from(BUCKET).remove([filePath]);
    return { error: `Erreur DB : ${insErr.message}` };
  }

  revalidatePath("/dashboard/models");
  redirect(`/dashboard/models/${row.id}`);
}

export async function deleteModel(modelId: string) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non connecté" };

  const { data: model } = await supabase
    .from("models")
    .select("file_path, splat_path, source_video_path, thumbnail_path, user_id")
    .eq("id", modelId)
    .single();
  if (!model || model.user_id !== user.id) return { error: "Introuvable." };

  const paths = [model.file_path, model.splat_path, model.source_video_path, model.thumbnail_path].filter(
    Boolean
  ) as string[];
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths);

  await supabase.from("models").delete().eq("id", modelId);
  revalidatePath("/dashboard/models");
  redirect("/dashboard/models");
}

export async function updateModel(modelId: string, formData: FormData) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non connecté" };

  const updates: Record<string, unknown> = {};
  for (const k of ["name", "description", "category", "visibility", "status"]) {
    const v = formData.get(k);
    if (v != null) updates[k] = String(v);
  }
  await supabase
    .from("models")
    .update(updates)
    .eq("id", modelId)
    .eq("user_id", user.id);
  revalidatePath(`/dashboard/models/${modelId}`);
}

export async function updateProfile(formData: FormData) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non connecté" };

  const updates: Record<string, unknown> = {};
  for (const k of ["display_name", "brand_name", "brand_color"]) {
    const v = formData.get(k);
    if (v != null) updates[k] = String(v);
  }
  await supabase.from("profiles").update(updates).eq("id", user.id);
  revalidatePath("/dashboard/settings");
}
