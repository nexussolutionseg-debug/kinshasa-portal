// Google Analytics 4 → Kin Stats (2026-11-01).
// Server-only. Reads the GA4 property through Google's Analytics Data API
// (free, read-only, no billing account) with a Google Cloud service account
// that has "Viewer" access on the property. No npm dependency: the service
// account's JWT is signed with Node's crypto and swapped for an access token.
//
// Settings (Vercel → Environment Variables, Production only):
//   GA4_PROPERTY_ID          numeric property ID (GA → Admin → Property details), not "G-…"
//   GA4_SERVICE_ACCOUNT_JSON the whole service-account key file (raw JSON or base64)
//   …or instead: GA4_CLIENT_EMAIL + GA4_PRIVATE_KEY (with \n escapes)
// See docs/kin-stats.md for the 10-minute setup.
import { createSign } from 'crypto';

const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API = 'https://analyticsdata.googleapis.com/v1beta';

type Creds = { email: string; key: string; property: string };

function readCreds(): Creds | null {
  const property = String(process.env.GA4_PROPERTY_ID || '').replace(/\D/g, '');
  let email = process.env.GA4_CLIENT_EMAIL || '';
  let key = process.env.GA4_PRIVATE_KEY || '';
  const json = process.env.GA4_SERVICE_ACCOUNT_JSON;
  if (json) {
    try {
      const raw = json.trim().startsWith('{') ? json : Buffer.from(json, 'base64').toString('utf8');
      const parsed = JSON.parse(raw);
      email = parsed.client_email || email;
      key = parsed.private_key || key;
    } catch {
      /* fall back to the separate variables */
    }
  }
  key = key.replace(/\\n/g, '\n');
  if (!property || !email || !key.includes('PRIVATE KEY')) return null;
  return { email, key, property };
}

export function gaConfigured(): boolean {
  return readCreds() !== null;
}

const b64url = (s: string | Buffer) => Buffer.from(s).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

let cachedToken: { value: string; exp: number } | null = null;

let pendingToken: Promise<string> | null = null;

// Reports are fetched in parallel: they share one token request.
function accessToken(c: Creds): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return Promise.resolve(cachedToken.value);
  if (!pendingToken) pendingToken = newToken(c, now).finally(() => { pendingToken = null; });
  return pendingToken;
}

async function newToken(c: Creds, now: number): Promise<string> {
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({ iss: c.email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }));
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const assertion = `${header}.${claims}.${b64url(signer.sign(c.key))}`;
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    signal: AbortSignal.timeout(10000),
    cache: 'no-store',
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) throw new Error(`Google token: HTTP ${res.status} ${body.error_description || body.error || ''}`.trim());
  cachedToken = { value: body.access_token, exp: now + (body.expires_in || 3600) };
  return cachedToken.value;
}

async function call<T>(c: Creds, path: string, body: unknown): Promise<T> {
  const token = await accessToken(c);
  const res = await fetch(`${API}/properties/${c.property}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
    cache: 'no-store',
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text.slice(0, 300);
    try { msg = JSON.parse(text)?.error?.message || msg; } catch { /* keep raw */ }
    throw new Error(`Google Analytics: HTTP ${res.status} ${msg}`);
  }
  return JSON.parse(text) as T;
}

// ---------------------------------------------------------------------------
// Report shape returned to the dashboard (no raw Google payloads leave here).
// ---------------------------------------------------------------------------

export type Totals = {
  users: number;
  newUsers: number;
  sessions: number;
  views: number;
  engagementRate: number; // 0..1
  avgSessionSec: number;
};

export type Row = { label: string; value: number; extra?: number };

export type GaReport = {
  days: number;
  current: Totals;
  previous: Totals;
  series: { date: string; users: number; views: number }[];
  seriesGrain: 'day' | 'month';
  pages: { path: string; title: string; views: number; users: number }[];
  channels: Row[];
  sources: { source: string; medium: string; campaign: string; sessions: number }[];
  countries: Row[];
  cities: Row[];
  devices: Row[];
  hours: number[]; // 24 buckets of users, Kinshasa time as configured in GA
  realtime: number | null;
};

type GaRow = { dimensionValues?: { value: string }[]; metricValues?: { value: string }[] };
type GaResp = { rows?: GaRow[] };

const num = (v?: { value: string }) => Number(v?.value || 0) || 0;
const dim = (r: GaRow, i: number) => r.dimensionValues?.[i]?.value ?? '';
const met = (r: GaRow, i: number) => num(r.metricValues?.[i]);

const TOTAL_METRICS = ['activeUsers', 'newUsers', 'sessions', 'screenPageViews', 'engagementRate', 'averageSessionDuration'].map((name) => ({ name }));

function totalsOf(resp: GaResp): Totals {
  const r = resp.rows?.[0];
  if (!r) return { users: 0, newUsers: 0, sessions: 0, views: 0, engagementRate: 0, avgSessionSec: 0 };
  return { users: met(r, 0), newUsers: met(r, 1), sessions: met(r, 2), views: met(r, 3), engagementRate: met(r, 4), avgSessionSec: met(r, 5) };
}

const NOT_SET = new Set(['(not set)', '(none)', '(direct)', '']);
const clean = (s: string, fallback: string) => (NOT_SET.has(s) ? fallback : s);

export const RANGES = [7, 28, 90, 365] as const;
export type RangeDays = (typeof RANGES)[number];

/** One full report: 2 batched calls (≤5 reports each) + realtime. */
export async function fetchGaReport(days: RangeDays): Promise<GaReport> {
  const c = readCreds();
  if (!c) throw new Error('not-configured');

  const current = { startDate: `${days - 1}daysAgo`, endDate: 'today' };
  const previous = { startDate: `${days * 2 - 1}daysAgo`, endDate: `${days}daysAgo` };
  const grain: 'day' | 'month' = days > 90 ? 'month' : 'day';
  const timeDim = grain === 'day' ? 'date' : 'yearMonth';

  const batchA = {
    requests: [
      { dateRanges: [current], metrics: TOTAL_METRICS },
      { dateRanges: [previous], metrics: TOTAL_METRICS },
      {
        dateRanges: [current],
        dimensions: [{ name: timeDim }],
        metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
        orderBys: [{ dimension: { dimensionName: timeDim } }],
        keepEmptyRows: true,
        limit: 400,
      },
      {
        dateRanges: [current],
        dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 250,
      },
      {
        dateRanges: [current],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 12,
      },
    ],
  };
  const batchB = {
    requests: [
      {
        dateRanges: [current],
        dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }, { name: 'sessionCampaignName' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 25,
      },
      {
        dateRanges: [current],
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 10,
      },
      {
        dateRanges: [current],
        dimensions: [{ name: 'city' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 10,
      },
      {
        dateRanges: [current],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      },
      {
        dateRanges: [current],
        dimensions: [{ name: 'hour' }],
        metrics: [{ name: 'activeUsers' }],
        limit: 24,
      },
    ],
  };

  const [a, b, rt] = await Promise.all([
    call<{ reports: GaResp[] }>(c, ':batchRunReports', batchA),
    call<{ reports: GaResp[] }>(c, ':batchRunReports', batchB),
    call<GaResp>(c, ':runRealtimeReport', { metrics: [{ name: 'activeUsers' }] }).catch(() => null),
  ]);
  const [tCur, tPrev, tSeries, tPages, tChannels] = a.reports;
  const [tSources, tCountries, tCities, tDevices, tHours] = b.reports;

  const hours = Array.from({ length: 24 }, () => 0);
  for (const r of tHours.rows || []) {
    const h = Number(dim(r, 0));
    if (h >= 0 && h < 24) hours[h] += met(r, 0);
  }

  const series = (tSeries.rows || []).map((r) => {
    const d = dim(r, 0);
    const date = grain === 'day' ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : `${d.slice(0, 4)}-${d.slice(4, 6)}`;
    return { date, users: met(r, 0), views: met(r, 1) };
  }).sort((x, y) => x.date.localeCompare(y.date));

  // Same path with several titles (title changed during the period) → merge.
  const pageMap = new Map<string, { path: string; title: string; views: number; users: number }>();
  for (const r of tPages.rows || []) {
    const path = dim(r, 0).split('?')[0] || '/';
    const cur = pageMap.get(path);
    if (cur) { cur.views += met(r, 0); cur.users += met(r, 1); }
    else pageMap.set(path, { path, title: clean(dim(r, 1), path), views: met(r, 0), users: met(r, 1) });
  }

  return {
    days,
    current: totalsOf(tCur),
    previous: totalsOf(tPrev),
    series,
    seriesGrain: grain,
    pages: Array.from(pageMap.values()).sort((x, y) => y.views - x.views),
    channels: (tChannels.rows || []).map((r) => ({ label: clean(dim(r, 0), 'Autre'), value: met(r, 0) })),
    sources: (tSources.rows || []).map((r) => ({
      source: clean(dim(r, 0), 'direct'),
      medium: clean(dim(r, 1), '—'),
      campaign: clean(dim(r, 2), ''),
      sessions: met(r, 0),
    })),
    countries: (tCountries.rows || []).map((r) => ({ label: clean(dim(r, 0), 'Inconnu'), value: met(r, 0) })),
    cities: (tCities.rows || []).map((r) => ({ label: clean(dim(r, 0), 'Inconnue'), value: met(r, 0) })),
    devices: (tDevices.rows || []).map((r) => ({ label: dim(r, 0), value: met(r, 0) })),
    hours,
    realtime: rt ? met(rt.rows?.[0] || {}, 0) : null,
  };
}
