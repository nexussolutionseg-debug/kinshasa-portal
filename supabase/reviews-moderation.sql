-- =============================================================================
-- Kinshasa Label — reviews: one form (stars + optional comment), anti-spam,
-- and moderation from the backoffice. (2026-10-04)  Safe to run more than once.
-- Requires security-hardening.sql to have been run first (it creates
-- is_kl_admin()).
--
-- WHAT CHANGES
--   * A review = 1-5 stars + optional name + optional comment, sent through
--     submit_review(). Visitors can no longer write to `comments` or rate
--     places any other way.
--   * Anti-spam, enforced by the database (can't be bypassed from a browser):
--       - max 2 reviews per place per connection per 24 h
--       - max 10 reviews per connection per hour
--       - comment max 1000 characters, name max 60
--     "Connection" = the visitor's IP address, stored only as a salted hash
--     (never the IP itself). Limits are generous on purpose: in Kinshasa many
--     phones share one IP through their mobile operator.
--   * Moderation: the team can hide / show / delete reviews (Backoffice →
--     Avis). Hidden reviews disappear from the site; deleting a review also
--     removes its stars from the place's average.
--
-- HOW TO RUN: Supabase → SQL Editor → New query → paste ALL of this → Run.
-- =============================================================================

begin;

-- 1. New columns on comments --------------------------------------------------
alter table public.comments add column if not exists rating int check (rating between 1 and 5);
alter table public.comments add column if not exists hidden boolean not null default false;
alter table public.comments add column if not exists ip_hash text;
alter table public.comments alter column comment_text drop not null;
create index if not exists comments_ip_recent on public.comments (ip_hash, created_at desc);
create index if not exists comments_place on public.comments (place_id, created_at desc);

-- 2. Private salt for hashing IPs (no API access to this table) -------------
create table if not exists public.kl_secrets (name text primary key, value text not null);
alter table public.kl_secrets enable row level security;
insert into public.kl_secrets (name, value) values ('ip_salt', gen_random_uuid()::text)
  on conflict (name) do nothing;

-- 3. The only way visitors can post a review ---------------------------------
create or replace function public.submit_review(
  p_place_id bigint,
  p_rating int,
  p_author text default null,
  p_text text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  hdrs json := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json;
  ip text := coalesce(hdrs->>'cf-connecting-ip', split_part(coalesce(hdrs->>'x-forwarded-for', ''), ',', 1), 'unknown');
  salt text := (select value from public.kl_secrets where name = 'ip_salt');
  h text := md5(trim(ip) || coalesce(salt, ''));
  txt text := nullif(trim(coalesce(p_text, '')), '');
  who text := nullif(trim(coalesce(p_author, '')), '');
begin
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'La note doit être entre 1 et 5.';
  end if;
  if char_length(coalesce(txt, '')) > 1000 then raise exception 'Avis trop long (1000 caractères max).'; end if;
  if char_length(coalesce(who, '')) > 60 then raise exception 'Nom trop long.'; end if;
  if not exists (select 1 from public.places where id = p_place_id) then raise exception 'Lieu introuvable.'; end if;

  if (select count(*) from public.comments where ip_hash = h and place_id = p_place_id and created_at > now() - interval '24 hours') >= 2 then
    raise exception 'Vous avez déjà donné votre avis sur ce lieu aujourd''hui. Merci !';
  end if;
  if (select count(*) from public.comments where ip_hash = h and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Trop d''avis envoyés en peu de temps. Réessayez plus tard.';
  end if;

  insert into public.comments (place_id, author_name, comment_text, rating, ip_hash)
  values (p_place_id, coalesce(who, 'Kinois'), txt, p_rating, h);

  update public.places
     set rating_sum = coalesce(rating_sum, 0) + p_rating,
         rating_count = coalesce(rating_count, 0) + 1
   where id = p_place_id;
end;
$$;
revoke all on function public.submit_review(bigint, int, text, text) from public;
grant execute on function public.submit_review(bigint, int, text, text) to anon, authenticated;

-- Old star-only endpoint: no longer used by the site, closed so it can't be
-- used to bypass the limits above.
do $$ begin
  if exists (select 1 from pg_proc where proname = 'rate_place') then
    execute 'revoke execute on function public.rate_place(bigint, int) from anon, authenticated';
  end if;
end $$;

-- 4. Deleting a review removes its stars from the place's totals ------------
create or replace function public.comments_after_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.rating is not null then
    update public.places
       set rating_sum = greatest(coalesce(rating_sum, 0) - old.rating, 0),
           rating_count = greatest(coalesce(rating_count, 0) - 1, 0)
     where id = old.place_id;
  end if;
  return old;
end;
$$;
drop trigger if exists comments_after_delete on public.comments;
create trigger comments_after_delete after delete on public.comments
  for each row execute function public.comments_after_delete();

-- 5. Who can see / do what on comments ---------------------------------------
do $$
declare r record;
begin
  for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'comments' loop
    execute format('drop policy if exists %I on public.comments', r.policyname);
  end loop;
end $$;
alter table public.comments enable row level security;
create policy "public read visible" on public.comments for select to anon, authenticated
  using (hidden = false or public.is_kl_admin());
create policy "team update" on public.comments for update to authenticated
  using (public.is_kl_admin()) with check (public.is_kl_admin());
create policy "team delete" on public.comments for delete to authenticated
  using (public.is_kl_admin());
-- (no insert policy: visitors post only through submit_review)

-- Visitors can read reviews but never the IP hash column.
revoke select on public.comments from anon;
grant select (id, place_id, author_name, comment_text, rating, hidden, created_at) on public.comments to anon;

commit;

select 'Avis : modération et anti-spam activés ✔' as statut;
