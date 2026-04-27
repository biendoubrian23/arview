-- ============================================================
-- ScanAR — Schéma principal PostgreSQL (Supabase)
-- ============================================================

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────
--  USERS (géré par Supabase Auth — extension profil)
-- ─────────────────────────────────────────────
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  avatar_url  TEXT,
  plan        TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'business')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
--  MODELS (objets 3D uploadés)
-- ─────────────────────────────────────────────
CREATE TABLE public.models (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,           -- identifiant URL : scanar.io/m/<slug>
  description   TEXT,
  category      TEXT,
  status        TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'active', 'archived')),
  file_url      TEXT NOT NULL,                  -- URL Cloudflare R2
  file_size     BIGINT,                         -- en octets
  thumbnail_url TEXT,
  luma_job_id   TEXT,                           -- ID du job Luma AI (si scan depuis app)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
--  EVENTS (tracking analytics)
-- ─────────────────────────────────────────────
CREATE TABLE public.events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id     UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  event_type   TEXT NOT NULL CHECK (event_type IN ('view', 'ar_activated', 'share', 'qr_scan')),
  country      TEXT,
  city         TEXT,
  user_agent   TEXT,
  duration_ms  INTEGER,                         -- durée d'interaction en millisecondes
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
--  Row Level Security (RLS)
-- ─────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.models   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events   ENABLE ROW LEVEL SECURITY;

-- Profiles : lecture/écriture sur son propre profil uniquement
CREATE POLICY "profiles_self" ON public.profiles
  USING (auth.uid() = id);

-- Models : lecture publique des modèles actifs, écriture propriétaire
CREATE POLICY "models_public_read"  ON public.models FOR SELECT
  USING (status = 'active');
CREATE POLICY "models_owner_all"    ON public.models
  USING (auth.uid() = user_id);

-- Events : insert public (visiteurs anonymes), lecture propriétaire
CREATE POLICY "events_public_insert" ON public.events FOR INSERT
  WITH CHECK (true);
CREATE POLICY "events_owner_read"    ON public.events FOR SELECT
  USING (
    auth.uid() = (SELECT user_id FROM public.models WHERE id = model_id)
  );
