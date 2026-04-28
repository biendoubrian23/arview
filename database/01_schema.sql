-- =====================================================================
-- ScanAR — Schéma initial (à exécuter dans le SQL editor de Supabase)
-- =====================================================================

-- Extensions utiles
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Table: profiles  (1 ligne par utilisateur, lié à auth.users)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  brand_name text,
  brand_logo_url text,
  brand_color text default '#6C63FF',
  plan text not null default 'free' check (plan in ('free','pro','business')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Table: models  (objets 3D)
-- ---------------------------------------------------------------------
create table if not exists public.models (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique,                 -- identifiant court pour l'URL publique
  name text not null,
  description text,
  category text,
  visibility text not null default 'public' check (visibility in ('public','private')),
  status text not null default 'ready' check (status in ('processing','ready','archived','failed')),
  file_path text not null,                   -- chemin dans le bucket Supabase Storage
  file_size bigint,
  thumbnail_path text,
  source_video_path text,                    -- vidéo de scan brute
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_models_user on public.models(user_id);
create index if not exists idx_models_slug on public.models(slug);

-- ---------------------------------------------------------------------
-- Table: events  (analytics : vue, AR activée, durée, etc.)
-- ---------------------------------------------------------------------
create table if not exists public.events (
  id bigserial primary key,
  model_id uuid not null references public.models(id) on delete cascade,
  type text not null check (type in ('view','ar_activated','session_end')),
  duration_ms integer,
  device text,            -- ios | android | desktop | other
  country text,
  city text,
  user_agent text,
  referrer text,
  created_at timestamptz not null default now()
);

create index if not exists idx_events_model on public.events(model_id);
create index if not exists idx_events_created on public.events(created_at desc);
create index if not exists idx_events_type on public.events(type);

-- ---------------------------------------------------------------------
-- Trigger: créer automatiquement un profile à l'inscription
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Trigger: updated_at
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_models_updated on public.models;
create trigger trg_models_updated before update on public.models
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.touch_updated_at();
