-- =============================================================================
-- READ-ONLY: who can do what (changes nothing). Paste in Supabase → SQL
-- Editor → Run and send the result. One row per check: ok = true / false.
-- =============================================================================
with checks as (
  select 'Team accounts in kl_admins' as check_name,
         (select count(*) from public.kl_admins) > 0 as ok,
         (select string_agg(email, ', ' order by email) from public.kl_admins) as detail
  union all
  select 'Every team account exists as a login (auth.users)',
         not exists (select 1 from public.kl_admins a where not exists (select 1 from auth.users u where lower(u.email) = a.email)),
         (select string_agg(a.email, ', ') from public.kl_admins a where not exists (select 1 from auth.users u where lower(u.email) = a.email))
  union all
  select 'Logins that are NOT team (can sign in but cannot edit)',
         true,
         (select coalesce(string_agg(u.email, ', '), 'none') from auth.users u where not exists (select 1 from public.kl_admins a where a.email = lower(u.email)))
  union all
  select 'RLS enabled on every public table',
         not exists (select 1 from pg_tables t join pg_class c on c.relname = t.tablename and c.relnamespace = 'public'::regnamespace where t.schemaname = 'public' and not c.relrowsecurity),
         (select string_agg(t.tablename, ', ') from pg_tables t join pg_class c on c.relname = t.tablename and c.relnamespace = 'public'::regnamespace where t.schemaname = 'public' and not c.relrowsecurity)
  union all
  select 'Visitors cannot call the old rate_place (bypasses anti-spam)',
         not has_function_privilege('anon', 'public.rate_place(bigint, integer)', 'execute'), null
  union all
  select 'Visitors can post reviews (submit_review)',
         has_function_privilege('anon', 'public.submit_review(bigint, integer, text, text)', 'execute'), null
  union all
  select 'Visitors cannot read the IP-hash column of reviews',
         not has_column_privilege('anon', 'public.comments', 'ip_hash', 'select'), null
  union all
  select 'Visitors cannot write places/events/news/banners/settings directly',
         not (has_table_privilege('anon', 'public.places', 'insert') or has_table_privilege('anon', 'public.events', 'insert')
              or has_table_privilege('anon', 'public.news', 'insert') or has_table_privilege('anon', 'public.banners', 'insert')
              or has_table_privilege('anon', 'public.site_settings', 'update')), null
  union all
  select 'Internal tables closed (kl_admins, kl_secrets)',
         not (has_table_privilege('anon', 'public.kl_admins', 'select') or has_table_privilege('anon', 'public.kl_secrets', 'select')), null
  union all
  select 'Banner uploads limited to images',
         coalesce((select allowed_mime_types is not null from storage.buckets where id = 'banners'), false), null
  union all
  select 'Old dispatches table: only the team can add rows',
         not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'dispatches'
                     and cmd in ('INSERT', 'ALL') and (with_check is null or with_check not ilike '%is_kl_admin%')),
         (select string_agg(policyname || ' (' || array_to_string(roles, ',') || ')', ', ') from pg_policies
           where schemaname = 'public' and tablename = 'dispatches' and cmd in ('INSERT', 'ALL'))
)
select * from checks;
