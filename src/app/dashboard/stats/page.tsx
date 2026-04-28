import { createSupabaseServer } from "@/lib/supabase/server";
import { formatDuration, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: models } = await supabase
    .from("models")
    .select("id, name")
    .eq("user_id", user.id);
  const ids = (models ?? []).map((m) => m.id);

  let views = 0,
    ar = 0,
    sumDur = 0,
    durCount = 0;
  const byDevice: Record<string, number> = {};
  const byCountry: Record<string, number> = {};
  const byDay: Record<string, { views: number; ar: number }> = {};
  const perModel: Record<string, { views: number; ar: number }> = {};

  if (ids.length) {
    const { data: events } = await supabase
      .from("events")
      .select("model_id, type, device, country, created_at, duration_ms")
      .in("model_id", ids)
      .order("created_at", { ascending: false })
      .limit(5000);

    for (const e of events ?? []) {
      const day = (e.created_at as string).slice(0, 10);
      byDay[day] = byDay[day] || { views: 0, ar: 0 };
      perModel[e.model_id] = perModel[e.model_id] || { views: 0, ar: 0 };
      if (e.type === "view") {
        views++;
        byDay[day].views++;
        perModel[e.model_id].views++;
        if (e.device) byDevice[e.device] = (byDevice[e.device] || 0) + 1;
        if (e.country) byCountry[e.country] = (byCountry[e.country] || 0) + 1;
      } else if (e.type === "ar_activated") {
        ar++;
        byDay[day].ar++;
        perModel[e.model_id].ar++;
      } else if (e.type === "session_end" && e.duration_ms) {
        sumDur += e.duration_ms;
        durCount++;
      }
    }
  }

  const avgMs = durCount > 0 ? Math.round(sumDur / durCount) : 0;
  const rate = views > 0 ? Math.round((ar / views) * 100) : 0;

  const days = Object.keys(byDay).sort().slice(-30);
  const maxDay = Math.max(1, ...days.map((d) => byDay[d].views));

  const topModels = Object.entries(perModel)
    .sort((a, b) => b[1].views - a[1].views)
    .slice(0, 5)
    .map(([mid, v]) => ({
      name: models?.find((m) => m.id === mid)?.name ?? "—",
      views: v.views,
      ar: v.ar,
    }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Statistiques</h1>
        <p className="text-muted mt-1">Vue d&apos;ensemble de ton audience.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
        {[
          ["Vues totales", formatNumber(views)],
          ["AR activées", formatNumber(ar)],
          ["Taux AR", `${rate}%`],
          ["Durée moy.", formatDuration(avgMs)],
        ].map(([k, v]) => (
          <div key={k} className="glass rounded-2xl p-5">
            <p className="text-xs text-muted">{k}</p>
            <p className="mt-2 text-2xl md:text-3xl font-bold gradient-text">{v}</p>
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl p-5">
        <h2 className="font-semibold mb-4">30 derniers jours</h2>
        {days.length === 0 ? (
          <p className="text-muted text-sm">Pas de données.</p>
        ) : (
          <div className="flex items-end gap-1 h-40">
            {days.map((d) => (
              <div
                key={d}
                title={`${d} : ${byDay[d].views} vues / ${byDay[d].ar} AR`}
                className="flex-1 rounded-t bg-linear-to-t from-[#6C63FF] to-[#00D4FF] transition-all hover:opacity-80"
                data-h={Math.max(3, Math.round((byDay[d].views / maxDay) * 100))}
                style={
                  {
                    height: `${Math.max(3, Math.round((byDay[d].views / maxDay) * 100))}%`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div className="glass rounded-2xl p-5">
          <h2 className="font-semibold mb-4">Top 5 modèles</h2>
          {topModels.length === 0 ? (
            <p className="text-muted text-sm">Pas encore de données.</p>
          ) : (
            <ul className="space-y-3">
              {topModels.map((m, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span className="truncate">{m.name}</span>
                  <span className="text-muted">{m.views} vues · {m.ar} AR</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="glass rounded-2xl p-5">
          <h2 className="font-semibold mb-4">Appareils</h2>
          {Object.keys(byDevice).length === 0 ? (
            <p className="text-muted text-sm">Pas encore de données.</p>
          ) : (
            <ul className="space-y-2">
              {Object.entries(byDevice).map(([k, v]) => (
                <li key={k} className="flex items-center justify-between text-sm">
                  <span className="capitalize">{k}</span>
                  <span className="text-muted">{v}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {Object.keys(byCountry).length > 0 && (
        <div className="glass rounded-2xl p-5">
          <h2 className="font-semibold mb-4">Pays</h2>
          <ul className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {Object.entries(byCountry)
              .sort((a, b) => b[1] - a[1])
              .map(([k, v]) => (
                <li key={k} className="flex justify-between text-sm">
                  <span>{k}</span>
                  <span className="text-muted">{v}</span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
