-- =====================================================================
-- ScanAR — Buckets Supabase Storage
-- À exécuter APRÈS 01_schema.sql et 02_policies.sql
-- =====================================================================

-- Création du bucket public "models" (modèles 3D + miniatures + vidéos brutes)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'models',
  'models',
  true,                                   -- public en lecture (les .glb doivent être servis aux visiteurs)
  104857600,                              -- 100 MB max par fichier
  array[
    'model/gltf-binary',
    'model/gltf+json',
    'application/octet-stream',
    'image/png',
    'image/jpeg',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Policies sur storage.objects pour le bucket "models"
-- Lecture publique
drop policy if exists "models_public_read" on storage.objects;
create policy "models_public_read" on storage.objects
  for select using (bucket_id = 'models');

-- Upload : utilisateur connecté uniquement, dans son propre dossier (préfixe = uid)
drop policy if exists "models_owner_insert" on storage.objects;
create policy "models_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'models'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Update / delete : uniquement le propriétaire du dossier
drop policy if exists "models_owner_update" on storage.objects;
create policy "models_owner_update" on storage.objects
  for update using (
    bucket_id = 'models'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "models_owner_delete" on storage.objects;
create policy "models_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'models'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
