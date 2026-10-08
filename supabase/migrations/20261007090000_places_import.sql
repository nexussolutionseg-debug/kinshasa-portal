-- =============================================================================
-- Kinshasa Label — places: CSV import fields + "visible / hidden" switch
-- (2026-10-07). Safe to run more than once. Requires security-hardening.sql.
--
-- WHAT CHANGES
--   * New place fields: phone, type (Hôtel, Flat-hôtel…), Google rating and
--     number of Google reviews, verification note (team only, for follow-up).
--   * published = false hides a place from the website. The team still sees
--     every place in the backoffice and can show / hide it in one click.
--   * Latitude / longitude become optional: a place without a position is
--     listed on its commune page but gets no pin on the map until placed.
--
-- HOW TO RUN: Supabase → SQL Editor → New query → paste ALL of this → Run.
-- =============================================================================

begin;

alter table public.places add column if not exists phone text;
alter table public.places add column if not exists place_type text;
alter table public.places add column if not exists published boolean not null default true;
alter table public.places add column if not exists google_rating numeric(2,1);
alter table public.places add column if not exists google_reviews int;
alter table public.places add column if not exists verification text;
alter table public.places alter column lat drop not null;
alter table public.places alter column lng drop not null;
create index if not exists places_published on public.places (published);

-- Visitors only see published places; the team sees everything.
drop policy if exists "public read" on public.places;
create policy "public read" on public.places for select to anon, authenticated
  using (published or public.is_kl_admin());

commit;

select 'Lieux : import CSV et masquage activés ✔' as statut;
