-- =====================================================================
-- ScanAR — Row Level Security (RLS)
-- =====================================================================

alter table public.profiles enable row level security;
alter table public.models   enable row level security;
alter table public.events   enable row level security;

-- ---------- profiles ----------
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- ---------- models ----------
-- Le créateur peut tout faire sur ses modèles
drop policy if exists "models_owner_all" on public.models;
create policy "models_owner_all" on public.models
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Les visiteurs anonymes peuvent lire les modèles publics (par slug)
drop policy if exists "models_public_read" on public.models;
create policy "models_public_read" on public.models
  for select using (visibility = 'public');

-- ---------- events ----------
-- Tout le monde peut insérer un event (tracking visiteur anonyme)
drop policy if exists "events_anyone_insert" on public.events;
create policy "events_anyone_insert" on public.events
  for insert with check (true);

-- Le propriétaire du modèle peut lire les events de son modèle
drop policy if exists "events_owner_read" on public.events;
create policy "events_owner_read" on public.events
  for select using (
    exists (
      select 1 from public.models m
      where m.id = events.model_id and m.user_id = auth.uid()
    )
  );
