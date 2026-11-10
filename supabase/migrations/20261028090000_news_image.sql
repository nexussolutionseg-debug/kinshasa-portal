-- =============================================================================
-- Photo for "À la une" articles. (2026-10-28)
--
-- WHAT THIS CHANGES (plain English)
--   Adds an optional photo to each team article (table `news`). The photo
--   file itself goes in the existing `banners` storage bucket (folder news/),
--   which only team accounts can write to. Nothing else changes; existing
--   articles keep working without a photo. Safe to run twice.
--
-- HOW TO RUN: Supabase → SQL Editor → New query → paste ALL of this → Run.
-- =============================================================================

alter table public.news add column if not exists image_url text;

-- Only https links, at most 1,000 characters.
alter table public.news drop constraint if exists news_image_url_https;
alter table public.news add constraint news_image_url_https
  check (image_url is null or (image_url ~ '^https://' and length(image_url) <= 1000)) not valid;

select 'news.image_url ajouté ✔' as statut;
