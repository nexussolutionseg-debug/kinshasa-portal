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

export type Row = { label: string; value: number };
export type Point = { date: string; users: number; views: number };

export type GaReport = {
  range: Range;
  current: Totals;
  previous: Totals;
  series: Point[];
  previousSeries: Point[]; // same length as series, aligned day by day
  seriesGrain: 'day' | 'month';
  pages: { path: string; title: string; views: number; users: number }[];
  landings: { path: string; sessions: number; engaged: number }[];
  channels: Row[];
  sources: { source: string; medium: string; campaign: string; sessions: number }[];
  countries: Row[];
  cities: Row[];
  devices: Row[];
  newVsReturning: Row[];
  weekdays: number[]; // 7 buckets, Monday first
  hours: number[]; // 24 buckets, property time zone
  events: Row[];
  outbound: Row[]; // outbound link clicks by URL
  searches: Row[]; // site-search terms (/recherche?q=…)
  realtime: number | null;
};

type GaRow = { dimensionValues?: { value: string }[]; metricValues?: { value: string }[] };
type GaResp = { rows?: GaRow[] };

const num = (v?: { value: string }) => Number(v?.value || 0) || 0;
const dim = (r: GaRow, i: number) => r.dimensionValues?.[i]?.value ?? '';
const met = (r: GaRow, i: number) => num(r.metricValues?.[i]);

const TOTAL_METRICS = ['activeUsers', 'newUsers', 'sessions', 'screenPageViews', 'engagementRate', 'averageSessionDuration'].map((name) => ({ name }));

function totalsOf(resp: GaResp): Totals {
  const r = resp?.rows?.[0];
  if (!r) return { users: 0, newUsers: 0, sessions: 0, views: 0, engagementRate: 0, avgSessionSec: 0 };
  return { users: met(r, 0), newUsers: met(r, 1), sessions: met(r, 2), views: met(r, 3), engagementRate: met(r, 4), avgSessionSec: met(r, 5) };
}

const NOT_SET = new Set(['(not set)', '(none)', '(direct)', '']);
const clean = (s: string, fallback: string) => (NOT_SET.has(s) ? fallback : s);
const rows = (resp: GaResp | undefined, fallback = 'Autre'): Row[] =>
  (resp?.rows || []).map((r) => ({ label: clean(dim(r, 0), fallback), value: met(r, 0) }));

// ---------------------------------------------------------------------------
// Date ranges. Presets (7/28/90/365 days ending today) or any custom
// start → end; always compared with the period of the same length just before.
// Dates are Kinshasa dates (UTC+1).
// ---------------------------------------------------------------------------
export type Range = { start: string; end: string; days: number; prevStart: string; prevEnd: string };

const DAY = 86400000;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const parse = (d: string) => Date.parse(`${d}T00:00:00Z`);
export const kinshasaToday = () => iso(Date.now() + 3600000);
export const GA_EARLIEST = '2015-08-14';

export function makeRange(input: { days?: number; start?: string | null; end?: string | null }): Range {
  const today = kinshasaToday();
  let start: string;
  let end: string;
  const ok = (d?: string | null) => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(parse(d));
  if (ok(input.start) && ok(input.end)) {
    start = input.start!;
    end = input.end!;
    if (end > today) end = today;
    if (start > end) [start, end] = [end, start];
    if (start < GA_EARLIEST) start = GA_EARLIEST;
    // At most 2 years per view (keeps the report fast and within quota).
    if (parse(end) - parse(start) > 730 * DAY) start = iso(parse(end) - 730 * DAY);
  } else {
    const n = [7, 28, 90, 365].includes(Number(input.days)) ? Number(input.days) : 28;
    end = today;
    start = iso(parse(today) - (n - 1) * DAY);
  }
  const days = Math.round((parse(end) - parse(start)) / DAY) + 1;
  const prevEnd = iso(parse(start) - DAY);
  const prevStart = iso(parse(prevEnd) - (days - 1) * DAY);
  return { start, end, days, prevStart, prevEnd };
}

const filterEvent = (name: string) => ({ filter: { fieldName: 'eventName', stringFilter: { value: name } } });

/** One full report: 4 batched calls (≤5 reports each) + realtime. */
export async function fetchGaReport(range: Range): Promise<GaReport> {
  const c = readCreds();
  if (!c) throw new Error('not-configured');

  const current = { startDate: range.start, endDate: range.end };
  const previous = { startDate: range.prevStart, endDate: range.prevEnd };
  const grain: 'day' | 'month' = range.days > 92 ? 'month' : 'day';
  const timeDim = grain === 'day' ? 'date' : 'yearMonth';
  const top = (dimension: string, metric: string, limit: number, extra: Record<string, unknown> = {}) => ({
    dateRanges: [current],
    dimensions: [{ name: dimension }],
    metrics: [{ name: metric }],
    orderBys: [{ metric: { metricName: metric }, desc: true }],
    limit,
    ...extra,
  });
  const seriesReq = (dr: { startDate: string; endDate: string }) => ({
    dateRanges: [dr],
    dimensions: [{ name: timeDim }],
    metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
    orderBys: [{ dimension: { dimensionName: timeDim } }],
    limit: 800,
  });

  const batches = [
    [
      { dateRanges: [current], metrics: TOTAL_METRICS },
      { dateRanges: [previous], metrics: TOTAL_METRICS },
      seriesReq(current),
      seriesReq(previous),
      {
        dateRanges: [current],
        dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 500,
      },
    ],
    [
      top('sessionDefaultChannelGroup', 'sessions', 20),
      {
        dateRanges: [current],
        dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }, { name: 'sessionCampaignName' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 200,
      },
      top('country', 'activeUsers', 60),
      top('city', 'activeUsers', 100),
      top('deviceCategory', 'activeUsers', 10),
    ],
    [
      { dateRanges: [current], dimensions: [{ name: 'hour' }], metrics: [{ name: 'activeUsers' }], limit: 24 },
      { dateRanges: [current], dimensions: [{ name: 'dayOfWeek' }], metrics: [{ name: 'activeUsers' }], limit: 7 },
      top('newVsReturning', 'activeUsers', 5),
      top('eventName', 'eventCount', 40),
      {
        dateRanges: [current],
        dimensions: [{ name: 'landingPage' }],
        metrics: [{ name: 'sessions' }, { name: 'engagedSessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 300,
      },
    ],
    [
      top('linkUrl', 'eventCount', 200, { dimensionFilter: filterEvent('click') }),
      top('searchTerm', 'eventCount', 200, { dimensionFilter: filterEvent('view_search_results') }),
    ],
  ];

  const [r1, r2, r3, r4, rt] = await Promise.all([
    ...batches.map((requests) => call<{ reports: GaResp[] }>(c, ':batchRunReports', { requests })),
    call<GaResp>(c, ':runRealtimeReport', { metrics: [{ name: 'activeUsers' }] }).catch(() => null),
  ]) as [{ reports: GaResp[] }, { reports: GaResp[] }, { reports: GaResp[] }, { reports: GaResp[] }, GaResp | null];

  const [tCur, tPrev, tSeries, tPrevSeries, tPages] = r1.reports;
  const [tChannels, tSources, tCountries, tCities, tDevices] = r2.reports;
  const [tHours, tWeek, tNvr, tEvents, tLandings] = r3.reports;
  const [tOutbound, tSearch] = r4.reports;

  const hours = Array.from({ length: 24 }, () => 0);
  for (const r of tHours?.rows || []) {
    const h = Number(dim(r, 0));
    if (h >= 0 && h < 24) hours[h] += met(r, 0);
  }
  const weekdays = Array.from({ length: 7 }, () => 0); // GA: 0 = Sunday → we put Monday first
  for (const r of tWeek?.rows || []) {
    const d = Number(dim(r, 0));
    if (d >= 0 && d < 7) weekdays[(d + 6) % 7] += met(r, 0);
  }

  const toSeries = (resp: GaResp | undefined, start: string, len: number): Point[] => {
    const byKey = new Map<string, Point>();
    for (const r of resp?.rows || []) {
      const d = dim(r, 0);
      const key = grain === 'day' ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : `${d.slice(0, 4)}-${d.slice(4, 6)}`;
      byKey.set(key, { date: key, users: met(r, 0), views: met(r, 1) });
    }
    // Fill the gaps so every day/month of the period has a point.
    const out: Point[] = [];
    if (grain === 'day') {
      for (let i = 0; i < len; i++) {
        const key = iso(parse(start) + i * DAY);
        out.push(byKey.get(key) || { date: key, users: 0, views: 0 });
      }
    } else {
      const [y, m] = start.split('-').map(Number);
      const months = Math.max(1, Math.round(len / 30.44));
      for (let i = 0; i < months + 1; i++) {
        const dt = new Date(Date.UTC(y, m - 1 + i, 1));
        const key = dt.toISOString().slice(0, 7);
        if (i === months && !byKey.has(key)) break;
        out.push(byKey.get(key) || { date: key, users: 0, views: 0 });
      }
    }
    return out;
  };

  const series = toSeries(tSeries, range.start, range.days);
  const previousSeries = toSeries(tPrevSeries, range.prevStart, range.days).slice(0, series.length);

  // Same path with several titles (title changed during the period) → merge.
  const pageMap = new Map<string, { path: string; title: string; views: number; users: number }>();
  for (const r of tPages?.rows || []) {
    const path = dim(r, 0).split('?')[0] || '/';
    const cur = pageMap.get(path);
    if (cur) { cur.views += met(r, 0); cur.users += met(r, 1); }
    else pageMap.set(path, { path, title: clean(dim(r, 1), path), views: met(r, 0), users: met(r, 1) });
  }
  const landMap = new Map<string, { path: string; sessions: number; engaged: number }>();
  for (const r of tLandings?.rows || []) {
    const path = clean(dim(r, 0).split('?')[0], '(inconnue)');
    const cur = landMap.get(path);
    if (cur) { cur.sessions += met(r, 0); cur.engaged += met(r, 1); }
    else landMap.set(path, { path, sessions: met(r, 0), engaged: met(r, 1) });
  }

  return {
    range,
    current: totalsOf(tCur),
    previous: totalsOf(tPrev),
    series,
    previousSeries,
    seriesGrain: grain,
    pages: Array.from(pageMap.values()).sort((x, y) => y.views - x.views),
    landings: Array.from(landMap.values()).sort((x, y) => y.sessions - x.sessions),
    channels: rows(tChannels),
    sources: (tSources?.rows || []).map((r) => ({
      source: clean(dim(r, 0), 'direct'),
      medium: clean(dim(r, 1), '—'),
      campaign: clean(dim(r, 2), ''),
      sessions: met(r, 0),
    })),
    countries: rows(tCountries, 'Inconnu'),
    cities: rows(tCities, 'Inconnue'),
    devices: rows(tDevices),
    newVsReturning: rows(tNvr),
    weekdays,
    hours,
    events: rows(tEvents),
    outbound: rows(tOutbound).filter((r) => /^https?:\/\//.test(r.label) && !/kinshasalabel\.com/.test(r.label)),
    searches: rows(tSearch).filter((r) => r.label !== 'Autre'),
    realtime: rt ? met(rt.rows?.[0] || {}, 0) : null,
  };
}
