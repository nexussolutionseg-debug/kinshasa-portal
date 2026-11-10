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
                    where table_schema = 'public' and table_name = 'places' and column_name = 'google_rating'))
union all
select 'stats_links_news_gallery (2026-11-01)',
       (to_regclass('public.stats_links') is not null
        and exists (select 1 from information_schema.columns
                    where table_schema = 'public' and table_name = 'news' and column_name = 'images'))
union all
select 'news_expires_on (2026-11-10)',
       exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'news' and column_name = 'expires_on')
union all
select 'place_pages_leads (2026-11-10)',
       (to_regclass('public.kl_leads') is not null
        and exists (select 1 from information_schema.columns
                    where table_schema = 'public' and table_name = 'places' and column_name = 'hours')
        and exists (select 1 from information_schema.columns
                    where table_schema = 'public' and table_name = 'events' and column_name = 'place_id'));
