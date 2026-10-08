-- =============================================================================
-- Kinshasa Label — database security hardening (2026-10-04)
--
-- WHY: /backoffice requires a login, but that check only runs in the browser.
-- The database itself still let ANY visitor (using the public "anon" key that
-- every web page necessarily ships) insert, edit and delete places, events,
-- "À la une" news and banners, and upload files to the banners bucket —
-- straight through Supabase's API, without ever opening /backoffice.
--
-- WHAT THIS DOES:
--   * Public visitors can still: read all public content, rate a place (only
--     through rate_place(), one vote of 1-5), post a comment, subscribe to
--     the newsletter, send a partner inquiry.
--   * Only signed-in TEAM accounts listed in kl_admins can create / edit /
--     delete content, upload banners, read subscribers & partner inquiries.
--   * kl_admins is seeded with every account that exists in Supabase Auth
--     right now (the team's existing logins). A random person who signs up
--     later is NOT an admin.
--
-- ALSO (2026-10-04, merchandising): adds the columns/table the backoffice
-- "Vitrine" tab uses — banner mobile image, order and schedule; featured
-- places ("Coups de cœur"); homepage section settings. Section 0 below.
--
-- HOW TO RUN: Supabase dashboard → project → SQL Editor → New query → paste
-- this whole file → Run. Safe to run more than once.
-- AFTER RUNNING: Authentication → Sign In / Providers → turn OFF
-- "Allow new users to sign up" (team accounts are added by invitation).
-- =============================================================================

begin;

-- 0. Merchandising fields (safe to re-run) -----------------------------------
alter table public.banners add column if not exists mobile_image_url text;
alter table public.banners add column if not exists position int not null default 0;
alter table public.banners add column if not exists starts_at timestamptz;
alter table public.banners add column if not exists ends_at timestamptz;
alter table public.places add column if not exists featured boolean not null default false;
alter table public.places add column if not exists featured_rank int not null default 0;

create table if not exists public.site_settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.site_settings (id, data) values (1, '{}'::jsonb) on conflict do nothing;

-- 1. Team allow-list -----------------------------------------------------------
create table if not exists public.kl_admins (
  email text primary key,
  added_at timestamptz not null default now()
);
alter table public.kl_admins enable row level security;
-- nobody reads/writes this table through the API; manage it in the dashboard
insert into public.kl_admins (email)
  select lower(email) from auth.users where email is not null
  on conflict do nothing;

create or replace function public.is_kl_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.kl_admins
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.is_kl_admin() from public;
grant execute on function public.is_kl_admin() to anon, authenticated;

-- 2. Drop every existing policy on the app's tables (they were permissive) ----
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public'
      and tablename in ('places','events','news','banners','site_settings','comments','subscribers','partner_inquiries')
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- 3. Public content: everyone reads, only the team writes -------------------
do $$
declare t text;
begin
  foreach t in array array['places','events','news','banners','site_settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "public read" on public.%I for select to anon, authenticated using (true)', t);
    execute format('create policy "team insert" on public.%I for insert to authenticated with check (public.is_kl_admin())', t);
    execute format('create policy "team update" on public.%I for update to authenticated using (public.is_kl_admin()) with check (public.is_kl_admin())', t);
    execute format('create policy "team delete" on public.%I for delete to authenticated using (public.is_kl_admin())', t);
  end loop;
end $$;

-- 4. Ratings: visitors may only add one 1-5 vote through this function -------
create or replace function public.rate_place(p_place_id bigint, p_value int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_value is null or p_value < 1 or p_value > 5 then
    raise exception 'rating must be between 1 and 5';
  end if;
  update public.places
     set rating_sum = coalesce(rating_sum, 0) + p_value,
         rating_count = coalesce(rating_count, 0) + 1
   where id = p_place_id;
end;
$$;
revoke all on function public.rate_place(bigint, int) from public;
grant execute on function public.rate_place(bigint, int) to anon, authenticated;

-- 5. Comments: anyone reads and posts (with sane limits), team moderates -----
alter table public.comments enable row level security;
create policy "public read" on public.comments for select to anon, authenticated using (true);
create policy "public post" on public.comments for insert to anon, authenticated
  with check (
    place_id is not null
    and char_length(coalesce(comment_text, '')) between 1 and 1000
    and char_length(coalesce(author_name, '')) <= 60
  );
create policy "team update" on public.comments for update to authenticated using (public.is_kl_admin()) with check (public.is_kl_admin());
create policy "team delete" on public.comments for delete to authenticated using (public.is_kl_admin());

-- 6. Private submissions: write-only for visitors, readable by the team ------
alter table public.subscribers enable row level security;
create policy "public subscribe" on public.subscribers for insert to anon, authenticated
  with check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');
create policy "team read" on public.subscribers for select to authenticated using (public.is_kl_admin());
create policy "team delete" on public.subscribers for delete to authenticated using (public.is_kl_admin());

alter table public.partner_inquiries enable row level security;
create policy "public submit" on public.partner_inquiries for insert to anon, authenticated with check (true);
create policy "team read" on public.partner_inquiries for select to authenticated using (public.is_kl_admin());
create policy "team delete" on public.partner_inquiries for delete to authenticated using (public.is_kl_admin());

-- 7. Banner image storage: public can view, only the team can upload/change --
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual, '') ilike '%banners%' or coalesce(with_check, '') ilike '%banners%')
  loop
    execute format('drop policy if exists %I on storage.objects', r.policyname);
  end loop;
end $$;
create policy "banners public read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'banners');
create policy "banners team upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'banners' and public.is_kl_admin());
create policy "banners team update" on storage.objects for update to authenticated
  using (bucket_id = 'banners' and public.is_kl_admin()) with check (bucket_id = 'banners' and public.is_kl_admin());
create policy "banners team delete" on storage.objects for delete to authenticated
  using (bucket_id = 'banners' and public.is_kl_admin());

commit;

-- Check: who is on the team list?
select email, added_at from public.kl_admins order by added_at;
