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

## Status (verified 2026-10-08)

A founder ran `tools/check-applied.sql` and `tools/schema-snapshot.sql` on the live project (the result is in `tools/snapshot-2026-10-08.json`). Replaying every file in `migrations/`, in order, on an empty Postgres rebuilds exactly the live tables and columns.

| File | Status |
|---|---|
| `migrations/00000000000000_baseline.sql` | Structure before 2026-10-04 (tables created in the dashboard). Documentation and rebuild only — **never run on live**. |
| `migrations/20261004120000_security_hardening.sql` | Applied ✔ |
| `migrations/20261004180000_reviews_moderation.sql` | Applied ✔ |
| `migrations/20261007090000_places_import.sql` | Applied ✔ |
| `pending/20261008180000_lock_legacy_dispatches.sql` | **Optional, not applied.** The old `dispatches` table (earlier journalism portal, unused by this site) accepts inserts from anyone without login. Run only once that old portal is retired. |

Legacy tables not used by kinshasalabel.com: `dispatches`, `security_alerts` (earlier Kinshasa Portal journalism app), and the public storage bucket `commune-videos`.

Previews: Vercel previews have no Supabase key, so they can't reach this database. That's the agreed setup until a Supabase Pro / staging project exists.
