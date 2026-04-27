-- ============================================================
-- Migration 001 — Création des tables initiales
-- Date : 2026-04-27
-- ============================================================

-- Appliquer le schéma principal
\i ../schema.sql

-- Index de performance
CREATE INDEX idx_models_user_id   ON public.models(user_id);
CREATE INDEX idx_models_slug      ON public.models(slug);
CREATE INDEX idx_events_model_id  ON public.events(model_id);
CREATE INDEX idx_events_type      ON public.events(event_type);
CREATE INDEX idx_events_created   ON public.events(created_at DESC);

-- Trigger : mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_models_updated_at
  BEFORE UPDATE ON public.models
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger : création automatique du profil à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
