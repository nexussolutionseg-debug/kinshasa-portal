-- =============================================================================
-- Kin Stats partner links + several photos per « À la une » article. (2026-11-01)
-- Safe to run more than once. Includes the earlier pending news_image change,
-- so 20261028090000_news_image.sql doesn't need to be run separately.
--
-- WHAT THIS CHANGES (plain English)
--   1. New table `stats_links`: every partner link to the statistics page
--      (/stats/<link>), with who it's for, what it shows, its expiry date,
--      whether it was revoked, how many times it was opened and when.
--      Only team accounts (kl_admins) can see, create, change or delete
--      links. Visitors can't read the table at all: the partner page asks
--      the database "is this link valid?" through one function
--      (stats_link_open) that answers yes/no and counts the visit.
--   2. Table `news` (« À la une »): `image_url` (cover photo) if it isn't
--      there yet, and a new `images` list (up to 12 photos, https links
--      only, the first one is the cover). Existing articles keep their
--      single photo; nothing is lost.
--
-- HOW TO RUN: Supabase → SQL Editor → New query → paste ALL of this → Run.
-- =============================================================================

begin;

-- 1. Partner links -------------------------------------------------------------
create table if not exists public.stats_links (
  id             uuid primary key default gen_random_uuid(),
  token          text not null unique check (token ~ '^[A-Za-z0-9_-]{32,64}$'),
  name           text not null check (length(btrim(name)) between 1 and 60),
  note           text check (note is null or length(note) <= 300),
  view           text not null default 'partenaire' check (view in ('partenaire', 'complet')),
  expires_at     timestamptz not null,
  revoked_at     timestamptz,
  created_at     timestamptz not null default now(),
  created_by     uuid default auth.uid(),
  created_email  text default (auth.jwt() ->> 'email'),
  view_count     integer not null default 0,
  last_viewed_at timestamptz
);

alter table public.stats_links enable row level security;
revoke all on public.stats_links from anon, authenticated;
grant select, insert, update, delete on public.stats_links to authenticated;

drop policy if exists "team read" on public.stats_links;
drop policy if exists "team insert" on public.stats_links;
drop policy if exists "team update" on public.stats_links;
drop policy if exists "team delete" on public.stats_links;
create policy "team read"   on public.stats_links for select to authenticated using (public.is_kl_admin());
create policy "team insert" on public.stats_links for insert to authenticated with check (public.is_kl_admin());
create policy "team update" on public.stats_links for update to authenticated using (public.is_kl_admin()) with check (public.is_kl_admin());
create policy "team delete" on public.stats_links for delete to authenticated using (public.is_kl_admin());

-- The only door for visitors: give a link, get back who it's for and what it
-- shows if (and only if) it exists, isn't revoked and hasn't expired.
create or replace function public.stats_link_open(p_token text, p_count boolean default false)
returns table (link_id uuid, name text, view text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{32,64}$' then
    return;
  end if;
  if p_count then
    update public.stats_links l
       set view_count = l.view_count + 1, last_viewed_at = now()
     where l.token = p_token and l.revoked_at is null and l.expires_at > now();
  end if;
  return query
    select l.id, l.name, l.view, l.expires_at
      from public.stats_links l
     where l.token = p_token and l.revoked_at is null and l.expires_at > now();
end;
$$;
revoke all on function public.stats_link_open(text, boolean) from public;
grant execute on function public.stats_link_open(text, boolean) to anon, authenticated;

-- 2. Several photos per article ------------------------------------------------
alter table public.news add column if not exists image_url text;
alter table public.news drop constraint if exists news_image_url_https;
alter table public.news add constraint news_image_url_https
  check (image_url is null or (image_url ~ '^https://' and length(image_url) <= 1000)) not valid;

create or replace function public.kl_all_https(urls text[])
returns boolean language sql immutable as $$
  select coalesce(bool_and(u ~ '^https://' and length(u) <= 1000), true) from unnest(urls) as u
$$;

alter table public.news add column if not exists images text[] not null default '{}';
alter table public.news drop constraint if exists news_images_ok;
alter table public.news add constraint news_images_ok
  check (cardinality(images) <= 12 and public.kl_all_https(images)) not valid;

-- Articles that already have one photo: it becomes the first photo of the list.
update public.news set images = array[image_url]
 where image_url is not null and cardinality(images) = 0;

commit;

select 'stats_links + news.images ajoutés ✔' as statut;
