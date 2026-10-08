-- =============================================================================
-- OPTIONAL — close an open door on the old "dispatches" table. (2026-10-08)
--
-- WHAT THIS CHANGES (plain English)
--   The table `dispatches` belongs to the earlier Kinshasa Portal (journalism)
--   app; kinshasalabel.com never reads or writes it. Its insert rule is named
--   "Allow authenticated insert" but actually lets ANYONE on the internet, with
--   no login, add rows (spam, junk, abuse of the database quota).
--   After running this, only Kinshasa Label team accounts (kl_admins) can add
--   rows. Reading stays public, existing rows are untouched, nothing is deleted.
--
-- RUN ONLY IF the old journalism portal is no longer used (or if it only posts
-- through logged-in team accounts). Otherwise it would stop accepting posts.
--
-- HOW TO RUN: Supabase → SQL Editor → New query → paste ALL of this → Run.
-- =============================================================================

begin;
drop policy if exists "Allow authenticated insert dispatches" on public.dispatches;
create policy "team insert" on public.dispatches for insert to authenticated
  with check (public.is_kl_admin());
-- duplicate read rule (two identical "read for everyone" policies)
drop policy if exists "Enable read access for all users" on public.dispatches;
commit;

select 'dispatches : ajout réservé à l''équipe ✔' as statut;
