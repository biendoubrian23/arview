-- ============================================================
-- Vues utiles pour les analytics du dashboard
-- ============================================================

-- Vue : stats par modèle (vues, AR, taux)
CREATE OR REPLACE VIEW public.model_stats AS
SELECT
  m.id,
  m.user_id,
  m.name,
  m.slug,
  m.status,
  m.created_at,
  COUNT(*)                                                        AS total_events,
  COUNT(*) FILTER (WHERE e.event_type = 'view')                   AS total_views,
  COUNT(*) FILTER (WHERE e.event_type = 'ar_activated')           AS total_ar,
  COUNT(*) FILTER (WHERE e.event_type = 'qr_scan')                AS total_qr_scans,
  ROUND(
    COUNT(*) FILTER (WHERE e.event_type = 'ar_activated')::NUMERIC
    / NULLIF(COUNT(*) FILTER (WHERE e.event_type = 'view'), 0) * 100, 1
  )                                                               AS ar_rate_pct,
  AVG(e.duration_ms) FILTER (WHERE e.event_type = 'ar_activated') AS avg_ar_duration_ms
FROM public.models m
LEFT JOIN public.events e ON e.model_id = m.id
GROUP BY m.id;

-- Vue : activité quotidienne (pour les graphiques)
CREATE OR REPLACE VIEW public.daily_activity AS
SELECT
  model_id,
  DATE(created_at)                                              AS day,
  COUNT(*) FILTER (WHERE event_type = 'view')                   AS views,
  COUNT(*) FILTER (WHERE event_type = 'ar_activated')           AS ar_activations
FROM public.events
GROUP BY model_id, DATE(created_at)
ORDER BY day DESC;
