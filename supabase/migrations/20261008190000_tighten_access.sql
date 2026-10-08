-- =============================================================================
-- Tighten database permissions (second safety layer). (2026-10-08)
-- Safe to run more than once. Changes nothing visitors or the team can do
-- on kinshasalabel.com today — it removes permissions nobody uses.
--
-- WHAT THIS CHANGES (plain English)
--   Supabase gives the public "anon" role (anyone visiting the site) and the
--   logged-in "authenticated" role broad table permissions by default; until
--   now only the row-level security rules stopped misuse. After this:
--   1. Visitors can no longer even ATTEMPT to edit/delete content tables
--      (places, events, news, banners, site settings, reviews). They keep:
--      reading public content, posting a review (through the anti-spam
--      function), subscribing to the newsletter, sending the partner form.
--   2. The internal tables kl_admins (team list) and kl_secrets (anti-spam
--      salt) are closed to everyone except the database itself.
--   3. "TRUNCATE" (empty a whole table) is removed from both web roles on
--      every table — row-level security does not apply to it.
--   4. Partner form: length limits (company 200, name 120, e-mail 254 with a
--      valid format, phone 40, message 5000 characters) so the form can't be
--      used to stuff huge texts. Existing rows are not checked.
--   5. Banner/photo uploads: images only (JPEG, PNG, WebP, GIF), max 10 MB.
--      (The backoffice already shrinks photos before upload.)
--   The legacy tables dispatches / security_alerts (old journalism portal)
--   only lose TRUNCATE; see 20261008180000_lock_legacy_dispatches.sql.
--
-- HOW TO RUN: Supabase → SQL Editor → New query → paste ALL of this → Run.
-- Then run supabase/tools/check-access.sql (read-only) and send the result.
-- =============================================================================

begin;

-- 3. No TRUNCATE / TRIGGER / REFERENCES for the web roles, anywhere in public
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('revoke truncate, trigger, references on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- 1. Visitors never write content tables directly
revoke insert, update, delete on public.places, public.events, public.news, public.banners,
  public.site_settings, public.comments from anon;
-- visitors may only ADD to these two (reading stays team-only through RLS)
revoke update, delete on public.subscribers, public.partner_inquiries from anon;

-- Reviews: visitors read every column except the anti-spam IP hash (re-asserted)
revoke select on public.comments from anon;
grant select (id, place_id, author_name, comment_text, rating, hidden, created_at) on public.comments to anon;

-- 2. Internal tables: no web access at all (functions run as the owner)
revoke all on public.kl_admins, public.kl_secrets from anon, authenticated;

-- 4. Partner form length limits (not validated against existing rows)
alter table public.partner_inquiries drop constraint if exists partner_inquiries_lengths;
alter table public.partner_inquiries add constraint partner_inquiries_lengths check (
  char_length(company_name) between 1 and 200
  and char_length(coalesce(contact_name, '')) <= 120
  and char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  and char_length(coalesce(phone, '')) <= 40
  and char_length(coalesce(message, '')) <= 5000
) not valid;

-- 5. Uploads: images only, 10 MB max
update storage.buckets
   set file_size_limit = 10485760,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
 where id = 'banners';

commit;

select 'Accès resserrés ✔' as statut;
