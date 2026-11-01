// Kin Stats: everything the dashboard shows, in one payload (2026-11-01).
// Google Analytics (audience, pages, sources, clicks, searches) + what only
// this site knows (communes and rubriques viewed, ratings, reviews,
// newsletter).
import { createClient } from '@supabase/supabase-js';
import { fetchGaReport, gaConfigured, makeRange, type GaReport, type Range, type Row, type Point } from './ga4';
import { COMMUNE_NAMES, communeSlug } from './communes';
import { CATEGORY_PATH, categoryOf, type CategoryId } from './categories';
import type { StatsView } from './statsLinks';

export type KinStats = {
  view: StatsView;
  partner: string | null;
  generatedAt: string;
  demo: boolean;
  range: Range;
  ga: GaReport | null;
  gaError: string | null;
  communes: Row[];
  rubriques: Row[];
  articles: { title: string; path: string; views: number }[];
  site: {
    places: number | null;
    reviewsInPeriod: number | null;
    reviewsTotal: number | null;
    topRated: { name: string; commune: string; avg: number; count: number }[];
    subscribers: number | null; // team view only
    newSubscribers: number | null; // team view only
  };
};

const SLUG_TO_COMMUNE = new Map(COMMUNE_NAMES.map((c) => [communeSlug(c), c]));
const PATH_TO_CATEGORY = new Map(Object.entries(CATEGORY_PATH).map(([id, p]) => [p, id as CategoryId]));
const cleanTitle = (t: string) => t.replace(/\s*[·|]\s*Kinshasa Label.*$/i, '').replace(/\s+—\s+Kin Actualité\s*$/i, '');

function aggregatePages(ga: GaReport) {
  const communes = new Map<string, number>();
  const rubriques = new Map<string, number>();
  const articles: { title: string; path: string; views: number }[] = [];
  for (const p of ga.pages) {
    const m = p.path.match(/^\/commune\/([^/]+)/);
    if (m) {
      let slug = m[1];
      try { slug = decodeURIComponent(slug); } catch { /* keep */ }
      const name = SLUG_TO_COMMUNE.get(communeSlug(slug));
      if (name) communes.set(name, (communes.get(name) || 0) + p.views);
      continue;
    }
    const cat = PATH_TO_CATEGORY.get(p.path.replace(/\/$/, ''));
    if (cat) { rubriques.set(categoryOf(cat).label, (rubriques.get(categoryOf(cat).label) || 0) + p.views); continue; }
    if (p.path.startsWith('/actualite/article/')) articles.push({ title: cleanTitle(p.title), path: p.path, views: p.views });
  }
  const sorted = (m: Map<string, number>) => Array.from(m, ([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  return { communes: sorted(communes), rubriques: sorted(rubriques), articles: articles.slice(0, 50) };
}

async function siteData(range: Range, view: StatsView, userToken: string | null): Promise<KinStats['site']> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const empty = { places: null, reviewsInPeriod: null, reviewsTotal: null, topRated: [], subscribers: null, newSubscribers: null };
  if (!url || !key) return empty;
  const anon = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const since = `${range.start}T00:00:00+01:00`;
  const until = `${range.end}T23:59:59.999+01:00`;
  const safe = async <T,>(p: PromiseLike<T>, fb: T): Promise<T> => { try { return await p; } catch { return fb; } };

  const [places, reviewsP, reviewsT, rated] = await Promise.all([
    safe(anon.from('places').select('id', { count: 'exact', head: true }).neq('published', false).then((r) => r.count ?? null), null),
    safe(anon.from('comments').select('id', { count: 'exact', head: true }).gte('created_at', since).lte('created_at', until).then((r) => r.count ?? null), null),
    safe(anon.from('comments').select('id', { count: 'exact', head: true }).then((r) => r.count ?? null), null),
    safe(anon.from('places').select('name, commune, rating_sum, rating_count, published').gt('rating_count', 0).limit(1000).then((r) => r.data || []), [] as any[]),
  ]);

  const topRated = (rated as any[])
    .filter((p) => p.published !== false && p.rating_count >= 2)
    .map((p) => ({ name: p.name, commune: p.commune, avg: p.rating_sum / p.rating_count, count: p.rating_count }))
    .sort((a, b) => b.avg - a.avg || b.count - a.count)
    .slice(0, 10);

  let subscribers: number | null = null;
  let newSubscribers: number | null = null;
  if (view === 'complet' && userToken) {
    const team = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${userToken}` } } });
    [subscribers, newSubscribers] = await Promise.all([
      safe(team.from('subscribers').select('id', { count: 'exact', head: true }).then((r) => r.count ?? null), null),
      safe(team.from('subscribers').select('id', { count: 'exact', head: true }).gte('created_at', since).lte('created_at', until).then((r) => r.count ?? null), null),
    ]);
  }
  return { places, reviewsInPeriod: reviewsP, reviewsTotal: reviewsT, topRated, subscribers, newSubscribers };
}

// Google's free quota is generous, but partners refreshing a link shouldn't
// hit it: each date range is kept for 10 minutes per server instance.
const cache = new Map<string, { at: number; data: GaReport }>();
const TTL = 10 * 60 * 1000;

export async function buildKinStats(opts: {
  range: Range;
  view: StatsView;
  partner: string | null;
  userToken: string | null;
  demo: boolean;
}): Promise<KinStats> {
  const { range, view, partner, userToken } = opts;
  let ga: GaReport | null = null;
  let gaError: string | null = null;
  const demo = opts.demo && !gaConfigured();
  const key = `${range.start}|${range.end}`;

  if (demo) {
    ga = demoReport(range);
  } else if (!gaConfigured()) {
    gaError = 'not-configured';
  } else {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL) ga = hit.data;
    else {
      try {
        ga = await fetchGaReport(range);
        cache.set(key, { at: Date.now(), data: ga });
        if (cache.size > 60) cache.delete(cache.keys().next().value as string);
      } catch (e) {
        console.error('kin-stats:', String(e));
        gaError = String(e instanceof Error ? e.message : e).slice(0, 300);
        if (hit) ga = hit.data; // stale beats nothing
      }
    }
  }

  const agg = ga ? aggregatePages(ga) : { communes: [], rubriques: [], articles: [] };
  const site = await siteData(range, view, userToken);

  // Partner view: audience and content performance only — no campaign
  // names, no subscriber numbers.
  if (ga && view === 'partenaire') ga = { ...ga, sources: ga.sources.map((s) => ({ ...s, campaign: '' })) };

  return { view, partner, generatedAt: new Date().toISOString(), demo, range, ga, gaError, ...agg, site };
}

export { makeRange };

// ---------------------------------------------------------------------------
// Sample data, used ONLY when Google Analytics isn't connected and the page
// asks for it — so the design can be reviewed on Vercel previews. The
// dashboard labels it loudly as « Données d'exemple ».
// ---------------------------------------------------------------------------
function demoReport(range: Range): GaReport {
  let seed = 7 + range.days;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const grain: 'day' | 'month' = range.days > 92 ? 'month' : 'day';
  const mk = (start: string, k: number): Point[] => {
    const n = grain === 'day' ? range.days : Math.max(1, Math.round(range.days / 30.44));
    return Array.from({ length: n }, (_, i) => {
      const d = new Date(`${start}T12:00:00Z`);
      if (grain === 'day') d.setUTCDate(d.getUTCDate() + i); else d.setUTCMonth(d.getUTCMonth() + i);
      const weekend = grain === 'day' && [0, 5, 6].includes(d.getUTCDay());
      const base = (grain === 'day' ? 60 : 1500) * (1 + i / n) * (weekend ? 1.35 : 1) * k;
      const users = Math.round(base * (0.8 + rnd() * 0.4));
      return { date: grain === 'day' ? d.toISOString().slice(0, 10) : d.toISOString().slice(0, 7), users, views: Math.round(users * (2.4 + rnd())) };
    });
  };
  const series = mk(range.start, 1);
  const previousSeries = mk(range.prevStart, 0.8);
  const users = series.reduce((s, p) => s + p.users, 0);
  const views = series.reduce((s, p) => s + p.views, 0);
  const t = (k: number) => ({ users: Math.round(users * k), newUsers: Math.round(users * k * 0.72), sessions: Math.round(users * k * 1.3), views: Math.round(views * k), engagementRate: 0.58 * (k === 1 ? 1 : 0.94), avgSessionSec: 142 * k });
  const pg = (path: string, title: string, v: number) => ({ path, title, views: Math.round(views * v), users: Math.round(users * v * 0.7) });
  const communePages = COMMUNE_NAMES.map((c, i) => pg(`/commune/${communeSlug(c)}`, c, 0.07 / (1 + i * 0.45) * (0.7 + rnd() * 0.6)));
  const r = (label: string, v: number) => ({ label, value: Math.round(users * v) });
  return {
    range,
    current: t(1),
    previous: t(0.81),
    series,
    previousSeries,
    seriesGrain: grain,
    pages: [
      pg('/', 'Kinshasa Label', 0.31), pg('/food', 'Kin Food', 0.12), pg('/actualite', 'Kin Actualité', 0.1),
      pg('/places', 'Kin Places', 0.06), pg('/weekend', 'Kin Weekend', 0.04), pg('/culture', 'Kin Culture', 0.03),
      pg('/style', 'Kin Style', 0.02), pg('/traffic', 'Kin Traffic', 0.015), pg('/securite', 'Kin Sécurité', 0.008),
      pg('/communes', 'Les 24 communes', 0.02), pg('/recherche', 'Recherche', 0.01), pg('/devenir-partenaire', 'Deviens partenaire', 0.006),
      pg('/actualite/article/12', 'Exemple d’article À la une — Kin Actualité', 0.01),
      pg('/actualite/article/9', 'Deuxième exemple d’article — Kin Actualité', 0.006),
      ...communePages,
    ].sort((a, b) => b.views - a.views),
    landings: [
      { path: '/', sessions: Math.round(users * 0.5), engaged: Math.round(users * 0.29) },
      { path: '/food', sessions: Math.round(users * 0.14), engaged: Math.round(users * 0.09) },
      { path: '/actualite', sessions: Math.round(users * 0.12), engaged: Math.round(users * 0.06) },
      { path: '/commune/gombe', sessions: Math.round(users * 0.06), engaged: Math.round(users * 0.04) },
      { path: '/weekend', sessions: Math.round(users * 0.04), engaged: Math.round(users * 0.03) },
    ],
    channels: [r('Organic Social', 0.38), r('Direct', 0.27), r('Organic Search', 0.19), r('Referral', 0.09), r('Email', 0.07)],
    sources: [
      { source: 'instagram', medium: 'social', campaign: 'bio', sessions: Math.round(users * 0.26) },
      { source: 'direct', medium: '—', campaign: '', sessions: Math.round(users * 0.27) },
      { source: 'google', medium: 'organic', campaign: '', sessions: Math.round(users * 0.18) },
      { source: 'whatsapp', medium: 'messaging', campaign: 'kin-weekend', sessions: Math.round(users * 0.08) },
      { source: 'newsletter', medium: 'email', campaign: 'le-meilleur-de-kin', sessions: Math.round(users * 0.07) },
      { source: 'facebook', medium: 'social', campaign: '', sessions: Math.round(users * 0.05) },
      { source: 'tiktok', medium: 'social', campaign: 'reel-food', sessions: Math.round(users * 0.03) },
    ],
    countries: [r('DR Congo', 0.71), r('France', 0.09), r('Belgium', 0.07), r('Congo', 0.04), r('United States', 0.03), r('Egypt', 0.02), r('Canada', 0.015), r('South Africa', 0.01)],
    cities: [r('Kinshasa', 0.66), r('Paris', 0.06), r('Brussels', 0.05), r('Brazzaville', 0.03), r('Lubumbashi', 0.02), r('Goma', 0.01), r('Cairo', 0.01)],
    devices: [r('mobile', 0.82), r('desktop', 0.16), r('tablet', 0.02)],
    newVsReturning: [r('new', 0.72), r('returning', 0.28)],
    weekdays: [0.12, 0.12, 0.13, 0.13, 0.16, 0.19, 0.15].map((k) => Math.round(users * k)),
    hours: Array.from({ length: 24 }, (_, h) => Math.round((users / 24) * (h < 6 ? 0.15 + h * 0.03 : h < 11 ? 0.4 + (h - 6) * 0.15 : h < 17 ? 1.1 + (h - 11) * 0.03 : h < 23 ? 1.5 + Math.sin(h) * 0.2 : 0.6))),
    events: [r('page_view', 3.1), r('session_start', 1.3), r('user_engagement', 0.9), r('scroll', 0.6), r('first_visit', 0.72), r('click', 0.21), r('view_search_results', 0.05)],
    outbound: [
      { label: 'https://www.radiookapi.net/2026/10/30/actualite/kinshasa', value: Math.round(users * 0.04) },
      { label: 'https://actualite.cd/2026/10/29/kinshasa-coupure', value: Math.round(users * 0.03) },
      { label: 'https://wa.me/243810000000', value: Math.round(users * 0.025) },
      { label: 'https://www.instagram.com/kinshasalabel', value: Math.round(users * 0.02) },
    ],
    searches: [r('pizza', 0.012), r('gombe', 0.01), r('hotel', 0.008), r('ambiance', 0.006), r('piscine', 0.004)],
    realtime: 7,
  };
}
