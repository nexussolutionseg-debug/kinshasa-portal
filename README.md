# Kinshasa Label — kinshasalabel.com

The joyful guide to Kinshasa: places, culture, weekend outings and live city news, commune by commune, on an interactive map. « Vis Kin autrement ».

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 3 · Supabase (Postgres + Auth + Storage) · MapLibre GL · Vercel.

- **Live site:** https://www.kinshasalabel.com, served by the Vercel project **kinshasa-portal** (team *Nexus*), which deploys this repository's `main` branch.
- **Database:** Supabase project in Cherif's account. See [`supabase/README.md`](supabase/README.md).

---

## Repo map

| Path | What it is |
|---|---|
| `src/app/` | Pages (one folder per address). |
| `src/app/page.tsx` + `HomeClient.tsx` | Homepage. The server part loads the data; the client part runs the map, sheet and carousels. |
| `src/app/[category]/` | `/food`, `/places`, `/culture`, `/style`, `/securite`: one page per category. |
| `src/app/traffic/`, `communes/`, `weekend/` | Kin Traffic, the 24 communes, the Kin Weekend programme. |
| `src/app/commune/[name]/` + `CommuneClient.tsx` | Commune guide at `/commune/<slug>` (e.g. `/commune/mont-ngafula`). Other spellings redirect to the slug. |
| `src/app/actualite/` | Kin Actualité (Kinshasa social news from Congolese media). |
| `src/app/backoffice/`, `login/` | Team back office (Supabase login; write access controlled in the database by `kl_admins`). |
| `src/app/api/actualite`, `api/taux` | News feed and USD/CDF rate for the browser (cached 15 min / 1 h). |
| `src/app/sitemap.ts`, `robots.ts`, `opengraph-image.tsx`, `icon.svg` | SEO files, share image, favicon. |
| `src/components/` | Shared UI (header, footer, cards, sheets, carousels…). `components/backoffice/` holds the back-office panels. |
| `src/lib/` | Logic without UI: categories, communes and slugs, news aggregation and filters, server-side Supabase reads, structured data (schema.org), CSV/Excel import, plus-code decoding, UTM links. |
| `src/data/` | Static data: commune outlines (`communes.json`) and commune descriptions (`communeDetails.ts`). |
| `public/` | Static files (`logo.svg`). `public/maplibre/` is generated at build time; don't commit it. |
| `scripts/copy-maplibre-worker.mjs` | Copies the MapLibre worker into `public/` before `dev`/`build`. |
| `supabase/migrations/` | Database changes already applied to the live project, in order. |
| `supabase/pending/` | Database changes written but **not yet applied** (with a plain-English note). |
| `supabase/tools/` | Read-only helper queries (check what is applied, snapshot the schema). |
| `docs/brand/` | Brand kit: logos, colours, fonts, voice (`BRAND.md`, `tokens.json`). |

## Run it locally

Requirements: Node.js 20+ and npm.

```bash
git clone https://github.com/nexussolutionseg-debug/kinshasa-portal.git
cd kinshasa-portal
npm install
cp .env.example .env.local      # then fill in the values (Supabase → Project Settings → API)
npm run dev                      # http://localhost:3000
```

`npm run build && npm start` runs the production version. Never commit `.env.local` or any other `.env*` file: they're ignored by git, and only `.env.example` (no values) is tracked.

## How a change goes live (the update method)

Same method as the Nexus Hub. **Nothing goes straight to `main`.**

1. **Branch.** Every round of work gets its own branch (`fix/…`, `feature/…`, `cleanup/…`) and **one pull request**.
2. **Preview.** Vercel builds a preview link for every branch push. The link appears in the pull request.
   > Previews have **no database** (Vercel's *Preview* environment has no Supabase key), so they can never change live data, but their lists are empty. See "Open items" for the proposed preview database.
3. **Review and merge.** A founder reviews the preview, then presses **Merge** in GitHub. Vercel deploys `main` to kinshasalabel.com within ~3 minutes.
4. **Undo a release.** Vercel → project *kinshasa-portal* → **Deployments** → previous production deployment → **⋯ → Promote to Production**. This is instant; the code can be fixed afterwards in a new pull request.
5. **Database changes are always a separate step:**
   - the SQL goes in `supabase/pending/` with a plain-English note of what it changes, in the same pull request;
   - a founder runs it in the Supabase SQL Editor (developers have read-only access);
   - the developer verifies it against the live database (`supabase/tools/check-applied.sql`) and moves the file to `supabase/migrations/`.
   Code is written so it keeps working before the SQL is run, so "merge, then run the SQL" is always safe.
6. **Clean up.** Delete the branch after merging (GitHub offers a button on the merged pull request).

**Ownership:** the GitHub repo, the Vercel project and the Supabase project must each be owned or co-administered by **both founders** (GitHub: both as admins; Vercel: both as team owners of *Nexus*; Supabase: both as organisation owners).

## Conventions

- The site speaks to visitors with **"tu"** everywhere (brand voice, see `docs/brand/BRAND.md`).
- Every visitor-facing page renders its content on the server (so Google and link previews see it) and refreshes it in the browser.
- No empty blocks: a section with no data is hidden. Kin Weekend only appears in menus, tiles and the hero with at least 5 upcoming events (`src/lib/events.ts`).
- Commune links always use `communeHref()` (`src/lib/communes.ts`) so addresses stay clean (`/commune/ndjili`).

## Open items (2026-10-08)

- **Preview database:** previews have no Supabase key, so they're safe but empty. Decision (2026-10-08): keep it this way until the move to Supabase Pro, then add a staging database for previews.
- **Legacy `dispatches` table:** open to anonymous inserts. The optional fix is in `supabase/pending/` (run only once the old journalism portal is retired).
- **Commune boundaries:** `src/data/communes.json` contains simplified commune outlines. Replace them with official boundary polygons when available.
- **`src/app/api/` review:** check caching, rate limits and error handling of `api/actualite` and `api/taux`.
- **Google API keys:** two old keys from an unused Google Maps setup are visible in the git history. The Places API isn't activated, so the risk is low; deleting both keys in Google Cloud (Credentials) closes it completely. If Google Maps is activated later, create a new key restricted to kinshasalabel.com.
