import { createSupabaseServer } from "@/lib/supabase/server";

export async function getOverviewStats(userId: string) {
  const supabase = await createSupabaseServer();

  const { count: modelsCount } = await supabase
    .from("models")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  // Récupère IDs des modèles du user
  const { data: ids } = await supabase
    .from("models")
    .select("id")
    .eq("user_id", userId);
  const modelIds = (ids ?? []).map((m) => m.id);

  if (modelIds.length === 0) {
    return { modelsCount: 0, views: 0, ar: 0, arRate: 0 };
  }

  const { count: views } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .in("model_id", modelIds)
    .eq("type", "view");

  const { count: ar } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .in("model_id", modelIds)
    .eq("type", "ar_activated");

  const arRate = views && views > 0 ? Math.round(((ar ?? 0) / views) * 100) : 0;
  return {
    modelsCount: modelsCount ?? 0,
    views: views ?? 0,
    ar: ar ?? 0,
    arRate,
  };
}

export async function getRecentEvents(userId: string, limit = 10) {
  const supabase = await createSupabaseServer();
  const { data: ids } = await supabase
    .from("models")
    .select("id, name")
    .eq("user_id", userId);
  const map = new Map((ids ?? []).map((m) => [m.id, m.name]));
  if (map.size === 0) return [];
  const { data } = await supabase
    .from("events")
    .select("*")
    .in("model_id", Array.from(map.keys()))
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((e) => ({ ...e, model_name: map.get(e.model_id) }));
}

export async function getModelStats(modelId: string) {
  const supabase = await createSupabaseServer();
  const { count: views } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .eq("model_id", modelId)
    .eq("type", "view");
  const { count: ar } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .eq("model_id", modelId)
    .eq("type", "ar_activated");
  const { data: durations } = await supabase
    .from("events")
    .select("duration_ms")
    .eq("model_id", modelId)
    .eq("type", "session_end")
    .not("duration_ms", "is", null);
  const total = (durations ?? []).reduce((s, d) => s + (d.duration_ms || 0), 0);
  const avg = durations && durations.length ? Math.round(total / durations.length) : 0;
  return { views: views ?? 0, ar: ar ?? 0, avgMs: avg };
}
