import { notFound } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import PublicViewer from "./PublicViewer";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("models")
    .select("name, description")
    .eq("slug", slug)
    .maybeSingle();
  return {
    title: data?.name ? `${data.name} — ScanAR` : "ScanAR",
    description:
      data?.description ||
      "Visualise cet objet en 3D et en réalité augmentée — sans app.",
  };
}

export default async function PublicModelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const admin = createSupabaseAdmin();

  const { data: model } = await admin
    .from("models")
    .select(
      "id, slug, name, description, file_path, visibility, status, user_id"
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!model || model.visibility !== "public") notFound();

  const { data: profile } = await admin
    .from("profiles")
    .select("brand_name, brand_color")
    .eq("id", model.user_id)
    .maybeSingle();

  const fileUrl = admin.storage.from("models").getPublicUrl(model.file_path)
    .data.publicUrl;

  return (
    <PublicViewer
      modelId={model.id}
      name={model.name}
      description={model.description}
      src={fileUrl}
      brandName={profile?.brand_name ?? "ScanAR"}
      brandColor={profile?.brand_color ?? "#6C63FF"}
    />
  );
}
