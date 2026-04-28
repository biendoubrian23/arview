-- =====================================================================
-- ScanAR — Gaussian Splat artifacts
-- À exécuter si la base existe déjà avant le support des splats.
-- =====================================================================

alter table if exists public.models
  add column if not exists splat_path text;
