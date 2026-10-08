# Database (Supabase)

The live project is in **Cherif's Supabase account**. Developers (and Claude) have
**no write access**: every change is run by a founder in the SQL Editor.

| Folder | What goes there |
|---|---|
| `migrations/` | Changes **already applied** to the live database, in order (`YYYYMMDDHHMMSS_name.sql`), exactly as they were run. Never edit an applied file — write a new one. |
| `pending/` | Changes **written but not yet applied**. Each file starts with a plain-English note of what it changes. |
| `tools/` | **Read-only** helper queries (they change nothing): `check-applied.sql` (which changes are live) and `schema-snapshot.sql` (structure snapshot used to verify migrations). |

## How a database change goes live

1. The SQL is written in `supabase/pending/` with a plain-English note at the top, in the same pull request as the code that needs it.
2. A founder opens Supabase → SQL Editor → New query, pastes the **whole file**, clicks **Run**. (If Supabase warns about destructive operations, read the note at the top of the file first.)
3. The developer checks it against the live database (`tools/check-applied.sql`, read-only) and moves the file from `pending/` to `migrations/`.

Code that depends on a pending change must keep working before it is applied (the site falls back gracefully), so the order "merge code → run SQL" is always safe.

## Status (2026-10-08)

| File | Status |
|---|---|
| `migrations/20261004120000_security_hardening.sql` | Applied 2026-10-04 (founder confirmed "query ran", sign-ups disabled). To re-verify with `tools/check-applied.sql`. |
| `pending/20261004180000_reviews_moderation.sql` | Delivered 2026-10-04; not yet confirmed as run. Run `tools/check-applied.sql` to know. |
| `pending/20261007090000_places_import.sql` | Delivered 2026-10-07; needed before the places import works. Not yet confirmed as run. |
| `migrations/00000000000000_baseline.sql` | **Missing**: the original tables (places, events, news, comments, banners, subscribers, partner_inquiries) were created in the dashboard before migrations were tracked. Will be written from `tools/schema-snapshot.sql` once a founder runs it. |
