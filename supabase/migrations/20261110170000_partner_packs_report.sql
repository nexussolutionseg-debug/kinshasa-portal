-- =============================================================================
-- Partner packs + monthly partner report. (2026-11-10)
-- Safe to run more than once. Nothing is deleted.
--
-- WHAT THIS CHANGES (plain English)
--   1. `places` gets the partner's pack (page / site / site_reseaux) and its
--      start and end dates. Set in Backoffice → Lieux → Modifier. The site uses
--      them: paid partners first in their lists, Site packs in Coups de cœur.
--   2. New table `place_stats`: an anonymous daily counter per place
--      (page views, WhatsApp / call / directions / website / Instagram /
--      Facebook / share clicks). No cookie, no IP, no visitor id: just
--      "place 42, 10 Nov, whatsapp: 7". Visitors can only ADD 1 through the
--      function track_place(); nobody but the team can read the table.
--   3. New table `place_report_links`: one private link per partner for
--      their report (/rapport/<link>). Team-only.
--   4. Function place_report(link, from, to): what the report page shows —
--      the place, its pack, the counters for the period, reviews received
--      and events published. Answers only for an existing link.
-- =============================================================================
begin;

-- 1. Packs --------------------------------------------------------------------
alter table public.places add column if not exists partner_pack  text;
alter table public.places add column if not exists partner_since date;
alter table public.places add column if not exists partner_until date;
do $$ begin
  alter table public.places add constraint places_partner_pack_check check (partner_pack in ('page', 'site', 'site_reseaux'));
exception when duplicate_object then null; end $$;

-- 2. Anonymous counters -------------------------------------------------------
create table if not exists public.place_stats (
  place_id bigint not null references public.places(id) on delete cascade,
  day      date   not null,
  kind     text   not null check (kind in ('view', 'whatsapp', 'call', 'directions', 'website', 'instagram', 'facebook', 'share')),
  n        integer not null default 0,
  primary key (place_id, day, kind)
);
alter table public.place_stats enable row level security;
revoke all on public.place_stats from anon, authenticated;
grant select on public.place_stats to authenticated;
drop policy if exists "team read" on public.place_stats;
create policy "team read" on public.place_stats for select to authenticated using (public.is_kl_admin());

create or replace function public.track_place(p_place_id bigint, p_kind text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := (now() at time zone 'Africa/Kinshasa')::date;
begin
  if p_kind not in ('view', 'whatsapp', 'call', 'directions', 'website', 'instagram', 'facebook', 'share') then return; end if;
  if not exists (select 1 from places where id = p_place_id and coalesce(published, true)) then return; end if;
  insert into place_stats (place_id, day, kind, n) values (p_place_id, v_day, p_kind, 1)
  on conflict (place_id, day, kind) do update set n = place_stats.n + 1
  -- simple ceiling against scripted inflation: at most 5,000 per place, day and kind
  where place_stats.n < 5000;
end $$;
revoke all on function public.track_place(bigint, text) from public;
grant execute on function public.track_place(bigint, text) to anon, authenticated;

-- 3. Report links ---------------------------------------------------------------
create table if not exists public.place_report_links (
  place_id   bigint primary key references public.places(id) on delete cascade,
  token      text not null unique check (token ~ '^[A-Za-z0-9_-]{32,64}$'),
  created_at timestamptz not null default now(),
  view_count integer not null default 0,
  last_viewed_at timestamptz
);
alter table public.place_report_links enable row level security;
revoke all on public.place_report_links from anon, authenticated;
grant select, insert, update, delete on public.place_report_links to authenticated;
drop policy if exists "team read"   on public.place_report_links;
drop policy if exists "team insert" on public.place_report_links;
drop policy if exists "team update" on public.place_report_links;
drop policy if exists "team delete" on public.place_report_links;
create policy "team read"   on public.place_report_links for select to authenticated using (public.is_kl_admin());
create policy "team insert" on public.place_report_links for insert to authenticated with check (public.is_kl_admin());
create policy "team update" on public.place_report_links for update to authenticated using (public.is_kl_admin()) with check (public.is_kl_admin());
create policy "team delete" on public.place_report_links for delete to authenticated using (public.is_kl_admin());

-- 4. The report -----------------------------------------------------------------
create or replace function public.place_report(p_token text, p_from date, p_to date, p_count boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_place_id bigint;
  v_from date := greatest(coalesce(p_from, current_date - 30), current_date - 800);
  v_to   date := least(coalesce(p_to, current_date), current_date + 1);
  v_out jsonb;
begin
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{32,64}$' then return null; end if;
  select place_id into v_place_id from place_report_links where token = p_token;
  if v_place_id is null then return null; end if;
  if p_count then
    update place_report_links set view_count = view_count + 1, last_viewed_at = now() where token = p_token;
  end if;
  select jsonb_build_object(
    'place', (select jsonb_build_object('id', id, 'name', name, 'commune', commune, 'vertical', vertical, 'place_type', place_type,
                                        'pack', partner_pack, 'since', partner_since, 'until', partner_until,
                                        'rating_sum', rating_sum, 'rating_count', rating_count)
              from places where id = v_place_id),
    'from', v_from,
    'to', v_to,
    'totals', coalesce((select jsonb_object_agg(kind, total) from (
                 select kind, sum(n)::int as total from place_stats
                 where place_id = v_place_id and day between v_from and v_to group by kind) t), '{}'::jsonb),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('day', day, 'kind', kind, 'n', n) order by day)
                 from place_stats where place_id = v_place_id and day between v_from and v_to), '[]'::jsonb),
    'reviews', (select jsonb_build_object('count', count(*), 'written', count(*) filter (where comment_text is not null and comment_text <> ''),
                                          'avg', round(avg(rating)::numeric, 1))
                from comments
                where place_id = v_place_id and coalesce(hidden, false) = false
                  and (created_at at time zone 'Africa/Kinshasa')::date between v_from and v_to),
    'events', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'title', title, 'date', event_date) order by event_date)
                 from events where place_id = v_place_id and event_date between v_from and v_to), '[]'::jsonb)
  ) into v_out;
  return v_out;
end $$;
revoke all on function public.place_report(text, date, date, boolean) from public;
grant execute on function public.place_report(text, date, date, boolean) to anon, authenticated;

commit;

select 'packs partenaires + place_stats + rapports ✔' as statut;
