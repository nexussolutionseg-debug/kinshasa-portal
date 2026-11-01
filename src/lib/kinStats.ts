// Kin Stats: everything the dashboard shows, in one payload (2026-11-01).
// Google Analytics (audience, pages, sources) + what only this site knows
// (communes and rubriques viewed, ratings, reviews, newsletter).
import { createClient } from '@supabase/supabase-js';
import { fetchGaReport, gaConfigured, type GaReport, type RangeDays, type Row } from './ga4';
import { COMMUNE_NAMES, communeSlug } from './communes';
import { CATEGORY_PATH, categoryOf, type CategoryId } from './categories';
import type { StatsView } from './statsShare';

export type KinStats = {
  view: StatsView;
  partner: string | null;
  generatedAt: string;
  demo: boolean;
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

function aggregatePages(ga: GaReport) {
  const communes = new Map<string, number>();
  const rubriques = new Map<string, number>();
  const articles: { title: string; path: string; views: number }[] = [];
  for (const p of ga.pages) {
    const m = p.path.match(/^\/commune\/([^/]+)/);
    if (m) {
      const name = SLUG_TO_COMMUNE.get(decodeURIComponent(m[1]).toLowerCase());
      if (name) communes.set(name, (communes.get(name) || 0) + p.views);
      continue;
    }
    const cat = PATH_TO_CATEGORY.get(p.path.replace(/\/$/, ''));
    if (cat) { rubriques.set(categoryOf(cat).label, (rubriques.get(categoryOf(cat).label) || 0) + p.views); continue; }
    if (p.path.startsWith('/actualite/article/')) {
      articles.push({ title: p.title.replace(/\s*[·|–-]\s*Kinshasa Label.*$/i, ''), path: p.path, views: p.views });
    }
  }
  const sorted = (m: Map<string, number>) => Array.from(m, ([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  return { communes: sorted(communes), rubriques: sorted(rubriques), articles: articles.slice(0, 8) };
}

async function siteData(days: number, view: StatsView, userToken: string | null): Promise<KinStats['site']> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const empty = { places: null, reviewsInPeriod: null, reviewsTotal: null, topRated: [], subscribers: null, newSubscribers: null };
  if (!url || !key) return empty;
  const anon = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const safe = async <T,>(p: PromiseLike<T>, fb: T): Promise<T> => { try { return await p; } catch { return fb; } };

  const [places, reviewsP, reviewsT, rated] = await Promise.all([
    safe(anon.from('places').select('id', { count: 'exact', head: true }).neq('published', false).then((r) => r.count ?? null), null),
    safe(anon.from('comments').select('id', { count: 'exact', head: true }).gte('created_at', since).then((r) => r.count ?? null), null),
    safe(anon.from('comments').select('id', { count: 'exact', head: true }).then((r) => r.count ?? null), null),
    safe(anon.from('places').select('name, commune, rating_sum, rating_count, published').gt('rating_count', 0).limit(500).then((r) => r.data || []), [] as any[]),
  ]);

  const topRated = (rated as any[])
    .filter((p) => p.published !== false && p.rating_count >= 2)
    .map((p) => ({ name: p.name, commune: p.commune, avg: p.rating_sum / p.rating_count, count: p.rating_count }))
    .sort((a, b) => b.avg - a.avg || b.count - a.count)
    .slice(0, 6);

  let subscribers: number | null = null;
  let newSubscribers: number | null = null;
  if (view === 'complet' && userToken) {
    const team = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${userToken}` } } });
    [subscribers, newSubscribers] = await Promise.all([
      safe(team.from('subscribers').select('id', { count: 'exact', head: true }).then((r) => r.count ?? null), null),
      safe(team.from('subscribers').select('id', { count: 'exact', head: true }).gte('created_at', since).then((r) => r.count ?? null), null),
    ]);
  }
  return { places, reviewsInPeriod: reviewsP, reviewsTotal: reviewsT, topRated, subscribers, newSubscribers };
}

// Google's free quota is generous, but partners refreshing a link shouldn't
// hit it: each range is kept for 10 minutes per server instance.
const cache = new Map<number, { at: number; data: GaReport }>();
const TTL = 10 * 60 * 1000;

export async function buildKinStats(opts: { days: RangeDays; view: StatsView; partner: string | null; userToken: string | null; demo: boolean }): Promise<KinStats> {
  const { days, view, partner, userToken } = opts;
  let ga: GaReport | null = null;
  let gaError: string | null = null;
  const demo = opts.demo && !gaConfigured();

  if (demo) {
    ga = demoReport(days);
  } else if (!gaConfigured()) {
    gaError = 'not-configured';
  } else {
    const hit = cache.get(days);
    if (hit && Date.now() - hit.at < TTL) ga = hit.data;
    else {
      try {
        ga = await fetchGaReport(days);
        cache.set(days, { at: Date.now(), data: ga });
      } catch (e) {
        console.error('kin-stats:', String(e));
        gaError = String(e instanceof Error ? e.message : e).slice(0, 300);
        if (hit) ga = hit.data; // stale beats nothing
      }
    }
  }

  const agg = ga ? aggregatePages(ga) : { communes: [], rubriques: [], articles: [] };
  const site = await siteData(days, view, userToken);

  // Partner view: audience and content performance only — no campaign
  // names, no subscriber numbers.
  if (ga && view === 'partenaire') ga = { ...ga, sources: ga.sources.map((s) => ({ ...s, campaign: '' })) };

  return { view, partner, generatedAt: new Date().toISOString(), demo, ga, gaError, ...agg, site };
}

// ---------------------------------------------------------------------------
// Sample data, used ONLY when Google Analytics isn't connected and the page
// asks for it (?demo=1) — so the design can be reviewed on Vercel previews.
// The dashboard labels it loudly as « Données d'exemple ».
// ---------------------------------------------------------------------------
function demoReport(days: RangeDays): GaReport {
  let seed = 7 + days;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const grain: 'day' | 'month' = days > 90 ? 'month' : 'day';
  const points = grain === 'day' ? days : 12;
  const series = Array.from({ length: points }, (_, i) => {
    const d = new Date();
    if (grain === 'day') d.setDate(d.getDate() - (points - 1 - i)); else d.setMonth(d.getMonth() - (points - 1 - i));
    const weekend = grain === 'day' && [0, 5, 6].includes(d.getDay());
    const base = (grain === 'day' ? 60 : 1500) * (1 + i / points) * (weekend ? 1.35 : 1);
    const users = Math.round(base * (0.8 + rnd() * 0.4));
    return { date: grain === 'day' ? d.toISOString().slice(0, 10) : d.toISOString().slice(0, 7), users, views: Math.round(users * (2.4 + rnd())) };
  });
  const users = series.reduce((s, p) => s + p.users, 0);
  const views = series.reduce((s, p) => s + p.views, 0);
  const t = (k: number) => ({ users: Math.round(users * k), newUsers: Math.round(users * k * 0.72), sessions: Math.round(users * k * 1.3), views: Math.round(views * k), engagementRate: 0.58 * (k === 1 ? 1 : 0.94), avgSessionSec: 142 * k });
  const pg = (path: string, title: string, v: number) => ({ path, title, views: Math.round(views * v), users: Math.round(users * v * 0.7) });
  return {
    days,
    current: t(1),
    previous: t(0.81),
    series,
    seriesGrain: grain,
    pages: [
      pg('/', 'Kinshasa Label', 0.31), pg('/food', 'Kin Food', 0.12), pg('/actualite', 'Kin Actualité', 0.1),
      pg('/commune/gombe', 'Gombe', 0.07), pg('/places', 'Kin Places', 0.06), pg('/commune/ngaliema', 'Ngaliema', 0.045),
      pg('/weekend', 'Kin Weekend', 0.04), pg('/commune/limete', 'Limete', 0.035), pg('/culture', 'Kin Culture', 0.03),
      pg('/commune/kintambo', 'Kintambo', 0.025), pg('/commune/bandalungwa', 'Bandalungwa', 0.02), pg('/style', 'Kin Style', 0.02),
      pg('/commune/lingwala', 'Lingwala', 0.015), pg('/traffic', 'Kin Traffic', 0.015), pg('/commune/kalamu', 'Kalamu', 0.012),
      pg('/actualite/article/12', 'Exemple d’article À la une', 0.01), pg('/securite', 'Kin Sécurité', 0.008),
    ],
    channels: [
      { label: 'Organic Social', value: Math.round(users * 0.38) }, { label: 'Direct', value: Math.round(users * 0.27) },
      { label: 'Organic Search', value: Math.round(users * 0.19) }, { label: 'Referral', value: Math.round(users * 0.09) },
      { label: 'Email', value: Math.round(users * 0.07) },
    ],
    sources: [
      { source: 'instagram', medium: 'social', campaign: 'bio', sessions: Math.round(users * 0.26) },
      { source: 'direct', medium: '—', campaign: '', sessions: Math.round(users * 0.27) },
      { source: 'google', medium: 'organic', campaign: '', sessions: Math.round(users * 0.18) },
      { source: 'whatsapp', medium: 'messaging', campaign: 'kin-weekend', sessions: Math.round(users * 0.08) },
      { source: 'newsletter', medium: 'email', campaign: 'le-meilleur-de-kin', sessions: Math.round(users * 0.07) },
      { source: 'facebook', medium: 'social', campaign: '', sessions: Math.round(users * 0.05) },
    ],
    countries: [
      { label: 'DR Congo', value: Math.round(users * 0.71) }, { label: 'France', value: Math.round(users * 0.09) },
      { label: 'Belgium', value: Math.round(users * 0.07) }, { label: 'Congo', value: Math.round(users * 0.04) },
      { label: 'United States', value: Math.round(users * 0.03) }, { label: 'Egypt', value: Math.round(users * 0.02) },
    ],
    cities: [
      { label: 'Kinshasa', value: Math.round(users * 0.66) }, { label: 'Paris', value: Math.round(users * 0.06) },
      { label: 'Brussels', value: Math.round(users * 0.05) }, { label: 'Brazzaville', value: Math.round(users * 0.03) },
      { label: 'Lubumbashi', value: Math.round(users * 0.02) },
    ],
    devices: [
      { label: 'mobile', value: Math.round(users * 0.82) }, { label: 'desktop', value: Math.round(users * 0.16) }, { label: 'tablet', value: Math.round(users * 0.02) },
    ],
    hours: Array.from({ length: 24 }, (_, h) => Math.round((users / 24) * (h < 6 ? 0.15 : h < 11 ? 0.8 : h < 17 ? 1.1 : h < 23 ? 1.7 : 0.6))),
    realtime: 7,
  };
}
