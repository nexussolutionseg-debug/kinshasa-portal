-- =============================================================================
-- « À la une »: automatic removal date. (2026-11-10)
-- Safe to run more than once.
--
-- WHAT THIS CHANGES (plain English)
--   Adds an optional column `expires_on` (a date) to the `news` table.
--   In the backoffice it is « Retirer du site après le ». From the day after
--   that date, the article no longer shows on the homepage, Kin Actualité,
--   commune pages, search or the scrolling ticker at the top. Nothing is
--   deleted: the article stays in the backoffice (marked « Expiré »).
--   Articles without a date are removed 21 days after publication; that
--   rule works in the site code even before this SQL is run.
-- =============================================================================
begin;

alter table public.news add column if not exists expires_on date;

commit;

select 'news.expires_on ajouté ✔' as statut;
