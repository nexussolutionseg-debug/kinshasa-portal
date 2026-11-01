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

### 3. Add three values in Vercel

Vercel → project **kinshasa-portal** → Settings → Environment Variables. Tick **Production** only for each one:

| Name | Value |
|---|---|
| `GA4_PROPERTY_ID` | the Property ID number |
| `GA4_SERVICE_ACCOUNT_JSON` | the **whole content** of the downloaded JSON file (open it in Notepad, select all, paste) |
| `STATS_SHARE_SECRET` | any long random text (e.g. from https://www.random.org/strings/), used to sign partner links |

Then go to Deployments → the latest production deployment → **⋯ → Redeploy**.

Open the backoffice → **Statistiques**. If it still says Google Analytics isn't connected, the variables weren't saved for Production or the redeploy didn't run.

## Partner links

Backoffice → Statistiques → **Partager avec un partenaire**: enter a name, the view and the validity period (1–12 months), then copy the link or send it on WhatsApp.

- **Vue partenaire** shows audience, pages, communes, rubriques, sources and countries. It hides campaign names and subscriber numbers.
- **Tout (associés)** shows everything the team sees.
- Links can't be revoked one by one. They expire on their own. To cut off **every** link at once, change `STATS_SHARE_SECRET` in Vercel and redeploy.
- Partner pages are not indexed by search engines and have no cookie banner or Google Analytics on them.

## Good to know

- **The numbers are lower than real traffic.** Google Analytics only counts visitors who click "Accepter" on the cookie banner. The dashboard says so in its footnote. Vercel Analytics (cookieless) shows the full count in the Vercel dashboard.
- Data refreshes every 10 minutes. "En ce moment" is visitors in the last 30 minutes.
- "Exporter en PDF" uses the browser's print dialog. Choose "Save as PDF".
- **Demo mode:** while Google Analytics isn't connected, the team can click "Voir avec des données d'exemple" to preview the layout. Those figures are invented and labelled as such.

## Files

| File | Role |
|---|---|
| `src/lib/ga4.ts` | Google sign-in (service account) and the GA4 reports |
| `src/lib/kinStats.ts` | Combines GA with site data; communes/rubriques mapping; demo data |
| `src/lib/statsShare.ts` | Signs and checks partner links |
| `src/lib/statsAuth.ts` | Team check (`is_kl_admin`) for the API |
| `src/app/api/stats/route.ts`, `api/stats/share/route.ts` | Data API and partner-link creation |
| `src/components/stats/StatsDashboard.tsx`, `ShareLinks.tsx` | The dashboard UI |
| `src/app/stats/[token]/page.tsx` | Partner page |
