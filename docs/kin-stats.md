# Kin Stats — the traffic dashboard

Backoffice → **Statistiques** shows the site's audience from Google Analytics (property for `G-RV9MFJSSNX`), together with data only Kinshasa Label has:
- which communes and rubriques people read,
- the best-rated places,
- reviews received,
- newsletter sign-ups.

Partners get a read-only link (`/stats/<link>`). They don't need a login.

Cost: $0. The Google Analytics Data API is free and needs no billing account.

## One-time setup (about 10 minutes)

You need an account that is **Administrator** on the Google Analytics property.

### 1. Create a Google Cloud service account (a "robot" account that only reads GA)

1. Open https://console.cloud.google.com/ with any Google account and create a project, e.g. `kinshasa-label-stats`. You don't need billing.
2. **APIs & Services → Library**: search **Google Analytics Data API** and click **Enable**.
3. **IAM & Admin → Service Accounts → Create service account**:
   - name it `kin-stats`;
   - skip the optional role and access steps;
   - click **Done**.
4. Open the new account → **Keys → Add key → Create new key → JSON**. A `.json` file downloads. Keep it private: anyone with this file can read the analytics.

### 2. Give that account read access in Google Analytics

1. Go to https://analytics.google.com → **Admin** (gear icon) → **Property access management**.
2. Click **+ → Add users**. Paste the service account email from the JSON file (`client_email`, ends in `.iam.gserviceaccount.com`).
3. Choose the **Viewer** role and untick "Notify new users".
4. Still in Admin, open **Property details** and copy the **Property ID**. It is a number like `412345678`, not the `G-…` code.

### 3. Add two values in Vercel

Vercel → project **kinshasa-portal** → Settings → Environment Variables. Tick **Production** only for each one:

| Name | Value |
|---|---|
| `GA4_PROPERTY_ID` | the Property ID number |
| `GA4_SERVICE_ACCOUNT_JSON` | the **whole content** of the downloaded JSON file (open it in Notepad, select all, paste) |

Then go to Deployments → the latest production deployment → **⋯ → Redeploy**.

Open the backoffice → **Statistiques**. If it still says Google Analytics isn't connected, the variables weren't saved for Production or the redeploy didn't run.

## Partner links

Partner links are managed in Backoffice → Statistiques → **Liens partenaires**. Each link is a row in the `stats_links` table, which only team accounts can read or change.

**Create a link.** Fill in:
- the partner's name;
- an optional internal note;
- what the link shows;
- how long it stays valid: 1, 3, 6, 12 or 24 months.

Then copy the link, send it on WhatsApp or open it.

**What a link shows:**
- **Vue partenaire**: audience, pages, communes, rubriques, sources, clicks and searches. Campaign names and subscriber numbers are hidden.
- **Tout (associés)**: everything the team sees.

**Manage each link** from the list:
- rename it, change what it shows, edit its note;
- set a new end date, or add 1/3/6/12 months (the URL stays the same);
- **deactivate** it, which cuts access immediately, then **reactivate** it if needed;
- **delete** it for good.

The list shows each link's status (active, expiring soon, expired, deactivated), how many times it was opened and when it was last opened. You can search it and filter by status.

**Partner pages** are not indexed by search engines and have no cookie banner or Google Analytics.

**One-time database step:** run `supabase/pending/20261101120000_stats_links_news_gallery.sql` before creating links.

## Good to know

- **The numbers are lower than real traffic.** Google Analytics only counts visitors who click "Accepter" on the cookie banner. The dashboard says so in its footnote. Vercel Analytics (cookieless) shows the full count in the Vercel dashboard.
- Data refreshes every 10 minutes. "En ce moment" is visitors in the last 30 minutes.
- **Periods:**
  - 7 days, 28 days, 3 months, 12 months, or any dates you choose (up to 2 years at a time);
  - always compared with the period of the same length just before;
  - the visitors chart shows that earlier period as a dotted line.
- **Search and export:** every long table (pages, entry pages, sources, outbound clicks, site searches) can be searched, sorted by column and exported as CSV. Communes, countries, cities and articles have a search box too.
- **Outbound clicks** and **site searches** come from Google Analytics "Enhanced measurement". It is on by default; check it under Admin → Data streams → the web stream.
- "Exporter en PDF" uses the browser's print dialog. Choose "Save as PDF".
- **Demo mode:** while Google Analytics isn't connected, the team can click "Voir avec des données d'exemple" to preview the layout. Those figures are invented and labelled as such.

## Files

| File | Role |
|---|---|
| `src/lib/ga4.ts` | Google sign-in (service account) and the GA4 reports |
| `src/lib/kinStats.ts` | Combines GA with site data; communes/rubriques mapping; demo data |
| `src/lib/statsLinks.ts` | Checks a partner link through `stats_link_open()` |
| `src/components/stats/CommuneMap.tsx` | Commune map shaded by page views |
| `src/lib/statsAuth.ts` | Team check (`is_kl_admin`) for the API |
| `src/app/api/stats/route.ts` | Data API (team session or partner link) |
| `src/components/stats/StatsDashboard.tsx` | The dashboard UI |
| `src/components/stats/ShareLinks.tsx` | Partner-link manager |
| `src/app/stats/[token]/page.tsx` | Partner page |
