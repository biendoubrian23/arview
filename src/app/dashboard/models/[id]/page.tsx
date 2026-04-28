import { notFound, redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getModelStats } from "@/lib/analytics";
import { formatDuration, formatNumber } from "@/lib/utils";
import ModelDetailClient from "./ModelDetailClient";

export const dynamic = "force-dynamic";

export default async function ModelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: model } = await supabase
    .from("models")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!model) notFound();

  const stats = await getModelStats(model.id);

  const fileUrl = supabase.storage.from("models").getPublicUrl(model.file_path)
    .data.publicUrl;

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const publicUrl = `${baseUrl}/m/${model.slug}`;

  return (
    <ModelDetailClient
      model={model}
      modelUrl={fileUrl}
      publicUrl={publicUrl}
      stats={{
        views: formatNumber(stats.views),
        ar: formatNumber(stats.ar),
        avg: formatDuration(stats.avgMs),
        rate:
          stats.views > 0
            ? `${Math.round((stats.ar / stats.views) * 100)}%`
            : "—",
      }}
    />
  );
}
