import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import LinksClient from "./LinksClient";

export const dynamic = "force-dynamic";

export default async function LinksPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: models } = await supabase
    .from("models")
    .select("id, slug, name, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Récup stats
  const ids = (models ?? []).map((m) => m.id);
  const viewCounts: Record<string, number> = {};
  const arCounts: Record<string, number> = {};
  if (ids.length) {
    const { data: ev } = await supabase
      .from("events")
      .select("model_id, type")
      .in("model_id", ids);
    for (const e of ev ?? []) {
      if (e.type === "view")
        viewCounts[e.model_id] = (viewCounts[e.model_id] || 0) + 1;
      if (e.type === "ar_activated")
        arCounts[e.model_id] = (arCounts[e.model_id] || 0) + 1;
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3050";

  const rows =
    models?.map((m) => ({
      id: m.id,
      name: m.name,
      slug: m.slug,
      url: `${baseUrl}/m/${m.slug}`,
      created_at: m.created_at,
      views: viewCounts[m.id] || 0,
      ar: arCounts[m.id] || 0,
    })) ?? [];

  if (rows.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold">Mes Liens</h1>
        <div className="glass rounded-3xl p-12 text-center">
          <p className="text-muted">Aucun lien créé pour l&apos;instant.</p>
          <Link href="/dashboard/scan" className="btn-primary mt-4 inline-flex">
            Créer mon premier lien
          </Link>
        </div>
      </div>
    );
  }

  return <LinksClient rows={rows} />;
}
