-- ============================================================
-- Seed — Données de développement/test
-- ⚠️ NE PAS exécuter en production
-- ============================================================

-- Utilisateur de test (à créer manuellement dans Supabase Auth d'abord)
-- UUID fictif pour les tests locaux
DO $$
DECLARE
  test_user_id UUID := 'aaaaaaaa-0000-0000-0000-000000000001';
  model_id_1   UUID := uuid_generate_v4();
  model_id_2   UUID := uuid_generate_v4();
BEGIN

  INSERT INTO public.profiles (id, email, full_name, plan)
  VALUES (test_user_id, 'dev@scanar.io', 'Dev ScanAR', 'pro')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.models (id, user_id, name, slug, category, status, file_url)
  VALUES
    (model_id_1, test_user_id, 'Plat Tajine', 'tajine-demo', 'Restaurant', 'active',
     'https://pub-e035ef6264ce48cda403991e42b4de57.r2.dev/demo-tajine.glb'),
    (model_id_2, test_user_id, 'Canapé Scandinave', 'canape-scandinave', 'Mobilier', 'active',
     'https://pub-e035ef6264ce48cda403991e42b4de57.r2.dev/demo-canape.glb');

  -- Faux événements de test
  INSERT INTO public.events (model_id, event_type, country, city, duration_ms)
  VALUES
    (model_id_1, 'view',         'FR', 'Paris',    3000),
    (model_id_1, 'ar_activated', 'FR', 'Paris',    12000),
    (model_id_1, 'view',         'BE', 'Bruxelles', 2500),
    (model_id_2, 'view',         'FR', 'Lyon',      4000),
    (model_id_2, 'qr_scan',      'FR', 'Lyon',      NULL);

END $$;
