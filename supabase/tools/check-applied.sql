-- =============================================================================
-- READ-ONLY: which Kinshasa Label database changes are applied?
-- Changes nothing. Paste in Supabase → SQL Editor → Run, then send the result.
-- One row per change: applied = true / false.
-- =============================================================================
select 'security_hardening (2026-10-04)' as change,
       (to_regclass('public.kl_admins') is not null
        and to_regclass('public.site_settings') is not null
        and exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                    where n.nspname = 'public' and p.proname = 'is_kl_admin')) as applied
union all
select 'reviews_moderation (2026-10-04)',
       (exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'comments' and column_name = 'hidden')
        and exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                    where n.nspname = 'public' and p.proname = 'submit_review'))
union all
select 'places_import (2026-10-07)',
       (exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'places' and column_name = 'published')
        and exists (select 1 from information_schema.columns
                    where table_schema = 'public' and table_name = 'places' and column_name = 'google_rating'));
