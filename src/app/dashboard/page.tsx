import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getOverviewStats, getRecentEvents } from "@/lib/analytics";
import { formatNumber } from "@/lib/utils";
import { Box, Eye, Sparkles, Percent, ArrowUpRight, Camera } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const stats = await getOverviewStats(user.id);
  const events = await getRecentEvents(user.id, 8);

  const { data: top } = await supabase
    .from("models")
    .select("id, slug, name, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const cards = [
    { label: "Modèles créés", value: formatNumber(stats.modelsCount), icon: Box },
    { label: "Vues totales", value: formatNumber(stats.views), icon: Eye },
    { label: "Activations AR", value: formatNumber(stats.ar), icon: Sparkles },
    { label: "Taux AR", value: `${stats.arRate}%`, icon: Percent },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Vue d&apos;ensemble</h1>
          <p className="text-muted mt-1">Bienvenue ! Voici l&apos;activité de tes modèles.</p>
        </div>
        <Link href="/dashboard/scan" className="btn-primary">
          <Camera className="h-4 w-4" /> Nouveau scan
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between text-muted">
                <span className="text-xs">{c.label}</span>
                <Icon className="h-4 w-4" />
              </div>
              <p className="mt-2 text-2xl md:text-3xl font-bold gradient-text">
                {c.value}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 glass rounded-2xl p-5">
          <h2 className="font-semibold">Modèles récents</h2>
          <div className="mt-4 divide-y divide-white/5">
            {(top ?? []).length === 0 && (
              <div className="py-12 text-center">
                <p className="text-muted">Aucun modèle pour le moment.</p>
                <Link href="/dashboard/scan" className="btn-primary mt-4">
                  <Camera className="h-4 w-4" /> Scanner mon premier objet
                </Link>
              </div>
            )}
            {(top ?? []).map((m) => (
              <Link
                key={m.id}
                href={`/dashboard/models/${m.id}`}
                className="flex items-center justify-between py-3 hover:bg-[rgba(15,16,36,0.04)] px-2 -mx-2 rounded-lg transition"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{m.name}</p>
                  <p className="text-xs text-muted">/m/{m.slug}</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted" />
              </Link>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <h2 className="font-semibold">Activité récente</h2>
          <div className="mt-4 space-y-3">
            {events.length === 0 && (
              <p className="text-sm text-muted">Aucune activité.</p>
            )}
            {events.map((e) => (
              <div key={e.id} className="text-sm">
                <p>
                  <span className="text-muted">
                    {e.type === "view" && "👁️ Vue de "}
                    {e.type === "ar_activated" && "✨ AR sur "}
                    {e.type === "session_end" && "⏱️ Fin sur "}
                  </span>
                  <span className="font-medium">{e.model_name}</span>
                </p>
                <p className="text-xs text-muted">
                  {new Date(e.created_at).toLocaleString("fr-FR")}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
