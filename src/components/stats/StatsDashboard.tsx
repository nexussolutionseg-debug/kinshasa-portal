// Kin Stats dashboard (2026-11-01): the site's audience from Google
// Analytics, plus what only Kinshasa Label knows (communes, rubriques,
// ratings, reviews, newsletter). Used in two places:
//   - Backoffice → « Statistiques » (team session, full view + partner links)
//   - /stats/<token> (partner link, read-only, no login)
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ShareLinks } from './ShareLinks';

type Totals = { users: number; newUsers: number; sessions: number; views: number; engagementRate: number; avgSessionSec: number };
type Row = { label: string; value: number };
type Stats = {
  ok: boolean;
  reason?: string;
  view: 'complet' | 'partenaire';
  partner: string | null;
  expires: string | null;
  generatedAt: string;
  demo: boolean;
  gaError: string | null;
  ga: null | {
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
    hours: number[];
    realtime: number | null;
  };
  communes: Row[];
  rubriques: Row[];
  articles: { title: string; path: string; views: number }[];
  site: {
    places: number | null;
    reviewsInPeriod: number | null;
    reviewsTotal: number | null;
    topRated: { name: string; commune: string; avg: number; count: number }[];
    subscribers: number | null;
    newSubscribers: number | null;
  };
};

const RANGES: { days: number; label: string; long: string }[] = [
  { days: 7, label: '7 jours', long: '7 derniers jours' },
  { days: 28, label: '28 jours', long: '28 derniers jours' },
  { days: 90, label: '3 mois', long: '90 derniers jours' },
  { days: 365, label: '12 mois', long: '12 derniers mois' },
];

const CHANNELS: Record<string, string> = {
  'Organic Social': 'Réseaux sociaux',
  'Paid Social': 'Réseaux sociaux (payant)',
  Direct: 'Accès direct',
  'Organic Search': 'Recherche (Google…)',
  'Paid Search': 'Recherche (payant)',
  Referral: 'Autres sites',
  Email: 'E-mail / newsletter',
  'Organic Video': 'Vidéo',
  Display: 'Bannières pub',
  SMS: 'SMS',
  Unassigned: 'Non attribué',
  'Cross-network': 'Multi-réseaux',
  Affiliates: 'Affiliés',
  'Organic Shopping': 'Shopping',
  'Mobile Push Notifications': 'Notifications',
};
const COUNTRIES: Record<string, string> = {
  'DR Congo': 'RD Congo', 'Congo - Kinshasa': 'RD Congo', Congo: 'Congo-Brazzaville', 'Congo - Brazzaville': 'Congo-Brazzaville',
  Belgium: 'Belgique', 'United States': 'États-Unis', 'United Kingdom': 'Royaume-Uni', Egypt: 'Égypte', Germany: 'Allemagne',
  'South Africa': 'Afrique du Sud', Netherlands: 'Pays-Bas', Switzerland: 'Suisse', Spain: 'Espagne', Italy: 'Italie',
  Ireland: 'Irlande', 'Ivory Coast': 'Côte d’Ivoire', "Côte d'Ivoire": 'Côte d’Ivoire', Cameroon: 'Cameroun', China: 'Chine',
  'United Arab Emirates': 'Émirats arabes unis', Morocco: 'Maroc', Brazil: 'Brésil',
};
const DEVICES: Record<string, string> = { mobile: 'Téléphone', desktop: 'Ordinateur', tablet: 'Tablette', 'smart tv': 'TV' };
const CITIES: Record<string, string> = { Brussels: 'Bruxelles', London: 'Londres' };

const nf = new Intl.NumberFormat('fr-FR');
const fmt = (n: number | null | undefined) => (n == null ? '—' : nf.format(Math.round(n)));
const pct = (x: number) => `${(x * 100).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} %`;
const dur = (s: number) => {
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return m ? `${m} min ${String(r).padStart(2, '0')} s` : `${r} s`;
};
const short = (d: string, grain: 'day' | 'month') => {
  const [y, m, day] = d.split('-').map(Number);
  const date = new Date(y, m - 1, day || 1);
  return grain === 'day'
    ? date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    : date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
};

// ---------------------------------------------------------------------------

export function StatsDashboard({ share }: { share?: string }) {
  const [days, setDays] = useState(28);
  const [demo, setDemo] = useState(share === 'demo');
  const [data, setData] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFatal(null);
    try {
      const qs = new URLSearchParams({ days: String(days) });
      if (share) qs.set('share', share);
      if (demo) qs.set('demo', '1');
      const headers: Record<string, string> = {};
      if (!share) {
        const { data: s } = await supabase.auth.getSession();
        if (s.session?.access_token) headers.Authorization = `Bearer ${s.session.access_token}`;
      }
      const res = await fetch(`/api/stats?${qs}`, { headers, cache: 'no-store' });
      const json = (await res.json()) as Stats;
      if (!json.ok) {
        setFatal(json.reason === 'link-invalid'
          ? 'Ce lien de statistiques a expiré ou n’est plus valide. Demande un nouveau lien à l’équipe Kinshasa Label.'
          : 'Seuls les comptes de l’équipe Kinshasa Label peuvent voir ces statistiques.');
        setData(null);
      } else setData(json);
    } catch {
      setFatal('Impossible de charger les statistiques. Vérifie ta connexion et réessaie.');
    } finally {
      setLoading(false);
    }
  }, [days, share, demo]);

  useEffect(() => { load(); }, [load]);

  const range = RANGES.find((r) => r.days === days)!;
  const ga = data?.ga;
  const isTeam = !share;

  if (fatal) {
    return <div className="rounded-2xl border border-brand-line bg-white p-6 text-sm font-semibold text-brand-ink">{fatal}</div>;
  }

  return (
    <div className="kin-stats space-y-5">
      {/* Toolbar: one row of filters above everything */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div role="radiogroup" aria-label="Période" className="inline-flex rounded-full bg-white border border-brand-line p-1 print:hidden">
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              role="radio"
              aria-checked={days === r.days}
              onClick={() => setDays(r.days)}
              className={`h-9 px-3.5 rounded-full text-sm font-bold cursor-pointer border-0 transition-colors ${days === r.days ? 'bg-brand-ink text-white' : 'bg-transparent text-brand-ink hover:bg-brand-blue-soft'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <p className="hidden print:block m-0 font-bold">{range.long}</p>
        <div className="flex items-center gap-2">
          {ga?.realtime != null && (
            <span className="inline-flex items-center gap-2 h-9 px-3.5 rounded-full bg-brand-red-soft text-brand-ink text-sm font-bold">
              <span className="w-2 h-2 rounded-full bg-brand-red animate-live-dot" aria-hidden />
              {fmt(ga.realtime)} en ce moment
            </span>
          )}
          <button type="button" onClick={() => window.print()} className="h-9 px-3.5 rounded-full bg-white border border-brand-line text-sm font-bold text-brand-ink cursor-pointer hover:border-brand-blue print:hidden">
            Exporter en PDF
          </button>
        </div>
      </div>

      {data?.demo && (
        <Notice tone="yellow">
          <b>Données d’exemple.</b> Google Analytics n’est pas encore connecté : ces chiffres sont inventés pour montrer le tableau de bord.
          {isTeam && <> <button type="button" className="underline font-bold bg-transparent border-0 p-0 cursor-pointer text-brand-ink" onClick={() => setDemo(false)}>Revenir aux vraies données</button></>}
        </Notice>
      )}

      {data && !ga && data.gaError === 'not-configured' && (
        <Notice tone="blue">
          <b>Google Analytics n’est pas encore connecté.</b>{' '}
          {isTeam
            ? <>Il reste une étape de 10 minutes : donner à Kinshasa Label un accès « Lecteur » à la propriété Google Analytics (voir <code>docs/kin-stats.md</code>). Les chiffres du site ci-dessous fonctionnent déjà. </>
            : <>Les chiffres d’audience apparaîtront bientôt. </>}
          {isTeam && <button type="button" className="underline font-bold bg-transparent border-0 p-0 cursor-pointer text-brand-ink" onClick={() => setDemo(true)}>Voir avec des données d’exemple</button>}
        </Notice>
      )}
      {data && data.gaError && data.gaError !== 'not-configured' && (
        <Notice tone="yellow">
          Google Analytics n’a pas répondu{ga ? ' : chiffres de la dernière lecture réussie' : ''}.
          {isTeam && <span className="block text-xs text-brand-muted mt-1 font-normal">{data.gaError}</span>}
        </Notice>
      )}

      {loading && !data && <Skeleton />}

      {ga && (
        <div className={`space-y-5 transition-opacity ${loading ? 'opacity-50' : ''}`}>
          <Kpis cur={ga.current} prev={ga.previous} range={range.long} />
          <Card title="Visiteurs" sub={`${range.long} · par ${ga.seriesGrain === 'day' ? 'jour' : 'mois'}`}>
            <LineChart points={ga.series} grain={ga.seriesGrain} />
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Communes les plus consultées" sub="Pages vues des guides de commune">
              <BarList rows={data!.communes.slice(0, 10)} unit="vues" empty="Aucune page de commune vue sur la période." />
            </Card>
            <Card title="Rubriques" sub="Pages vues par rubrique">
              <BarList rows={data!.rubriques} unit="vues" empty="Aucune rubrique vue sur la période." />
            </Card>
          </div>

          <Card title="Pages les plus vues" sub="Top 10">
            <PagesTable pages={ga.pages.slice(0, 10)} />
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="D’où viennent les visiteurs" sub="Sessions par canal">
              <BarList rows={ga.channels.map((c) => ({ label: CHANNELS[c.label] || c.label, value: c.value }))} unit="sessions" />
            </Card>
            <Card title="Sources précises" sub={data!.view === 'complet' ? 'Source · support · campagne (liens de suivi)' : 'Source · support'}>
              <SourcesTable rows={ga.sources.slice(0, 10)} withCampaign={data!.view === 'complet'} />
            </Card>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <Card title="Pays"><BarList rows={ga.countries.map((r) => ({ label: COUNTRIES[r.label] || r.label, value: r.value }))} unit="visiteurs" percent /></Card>
            <Card title="Villes"><BarList rows={ga.cities.map((r) => ({ label: CITIES[r.label] || r.label, value: r.value }))} unit="visiteurs" percent /></Card>
            <Card title="Appareils"><BarList rows={ga.devices.map((r) => ({ label: DEVICES[r.label] || r.label, value: r.value }))} unit="visiteurs" percent /></Card>
          </div>

          <Card title="À quelle heure on visite Kinshasa Label" sub="Visiteurs par heure de la journée">
            <HourChart hours={ga.hours} />
          </Card>

          {data!.articles.length > 0 && (
            <Card title="Articles « À la une » les plus lus">
              <BarList rows={data!.articles.map((a) => ({ label: a.title, value: a.views }))} unit="vues" />
            </Card>
          )}
        </div>
      )}

      {data && <SitePanel site={data.site} view={data.view} range={range.long} />}

      {data && (
        <p className="text-xs text-brand-muted leading-relaxed m-0">
          Audience mesurée par Google Analytics : elle ne compte que les visiteurs qui ont accepté les cookies, donc le trafic réel est plus élevé.
          Chiffres comparés à la période précédente de même durée. Mis à jour toutes les 10 minutes
          {data.generatedAt ? ` · lu le ${new Date(data.generatedAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}
          {data.expires ? ` · lien valable jusqu’au ${new Date(data.expires).toLocaleDateString('fr-FR', { dateStyle: 'long' })}` : ''}.
        </p>
      )}

      {isTeam && data && <div className="print:hidden"><ShareLinks /></div>}
    </div>
  );
}

// ---------------------------------------------------------------------------

function Notice({ tone, children }: { tone: 'blue' | 'yellow'; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl border p-4 text-sm leading-relaxed ${tone === 'blue' ? 'bg-brand-blue-soft border-brand-blue/40' : 'bg-brand-yellow-soft border-brand-yellow'} text-brand-ink print:hidden`}>
      {children}
    </div>
  );
}

function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-brand-line bg-white p-4 md:p-5 shadow-card break-inside-avoid">
      <h3 className="font-display text-lg font-extrabold text-brand-ink m-0">{title}</h3>
      {sub && <p className="text-xs text-brand-muted m-0 mt-0.5">{sub}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Skeleton() {
  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Chargement">
      {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-white border border-brand-line animate-pulse" />)}
    </div>
  );
}

function Delta({ cur, prev }: { cur: number; prev: number }) {
  if (!prev) return <span className="text-xs text-brand-muted font-semibold">nouvelle période</span>;
  const d = (cur - prev) / prev;
  if (Math.abs(d) < 0.005) return <span className="text-xs text-brand-muted font-semibold">= stable</span>;
  const up = d > 0;
  return (
    <span className={`text-xs font-bold ${up ? 'text-[#0F7A3E]' : 'text-brand-red-dark'}`}>
      {up ? '▲' : '▼'} {up ? '+' : '−'}{Math.abs(d * 100).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} %
      <span className="sr-only"> par rapport à la période précédente</span>
    </span>
  );
}

function Kpis({ cur, prev, range }: { cur: Totals; prev: Totals; range: string }) {
  const tiles = [
    { label: 'Visiteurs', value: fmt(cur.users), c: cur.users, p: prev.users, hint: 'Personnes différentes' },
    { label: 'Nouveaux visiteurs', value: fmt(cur.newUsers), c: cur.newUsers, p: prev.newUsers, hint: 'Première visite' },
    { label: 'Pages vues', value: fmt(cur.views), c: cur.views, p: prev.views, hint: 'Toutes les pages' },
    { label: 'Visites', value: fmt(cur.sessions), c: cur.sessions, p: prev.sessions, hint: 'Sessions' },
    { label: 'Visites engagées', value: pct(cur.engagementRate), c: cur.engagementRate, p: prev.engagementRate, hint: '> 10 s, 2 pages ou une action' },
    { label: 'Durée moyenne', value: dur(cur.avgSessionSec), c: cur.avgSessionSec, p: prev.avgSessionSec, hint: 'Par visite' },
  ];
  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" aria-label={`Chiffres clés, ${range}`}>
      {tiles.map((t) => (
        <div key={t.label} className="rounded-2xl border border-brand-line bg-white p-4 shadow-card break-inside-avoid">
          <p className="text-xs font-bold text-brand-muted m-0">{t.label}</p>
          <p className="font-display text-[28px] leading-tight font-extrabold text-brand-ink m-0 mt-1 tabular-nums">{t.value}</p>
          <div className="flex items-center justify-between gap-2 mt-1">
            <Delta cur={t.c} prev={t.p} />
          </div>
          <p className="text-[11px] text-brand-muted m-0 mt-1">{t.hint}</p>
        </div>
      ))}
    </div>
  );
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(640);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

function LineChart({ points, grain }: { points: { date: string; users: number; views: number }[]; grain: 'day' | 'month' }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [metric, setMetric] = useState<'users' | 'views'>('users');
  const [hover, setHover] = useState<number | null>(null);
  const H = 240;
  const pad = { l: 44, r: 12, t: 12, b: 28 };
  const vals = points.map((p) => p[metric]);
  const max = niceMax(Math.max(1, ...vals));
  const iw = width - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const x = (i: number) => pad.l + (points.length <= 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (v: number) => pad.t + ih - (v / max) * ih;
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[metric]).toFixed(1)}`).join(' ');
  const area = points.length ? `${path} L${x(points.length - 1).toFixed(1)},${pad.t + ih} L${x(0).toFixed(1)},${pad.t + ih} Z` : '';
  const ticks = [0, 0.5, 1].map((f) => f * max);
  const labelEvery = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(iw / 70))));
  const total = vals.reduce((s, v) => s + v, 0);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * width;
    const i = Math.round(((px - pad.l) / iw) * (points.length - 1));
    setHover(Math.min(points.length - 1, Math.max(0, i)));
  };

  if (!points.length) return <p className="text-sm text-brand-muted m-0">Pas encore de données sur la période.</p>;
  const hp = hover != null ? points[hover] : null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 print:hidden">
        {(['users', 'views'] as const).map((m) => (
          <button key={m} type="button" onClick={() => setMetric(m)}
            className={`h-8 px-3 rounded-full text-xs font-bold border cursor-pointer ${metric === m ? 'bg-brand-blue-soft border-brand-blue text-brand-blue-deep' : 'bg-white border-brand-line text-brand-ink'}`}>
            {m === 'users' ? 'Visiteurs' : 'Pages vues'}
          </button>
        ))}
        <span className="ml-auto text-xs text-brand-muted">Total : <b className="text-brand-ink">{fmt(total)}</b></span>
      </div>
      <div ref={ref} className="relative">
        <svg width={width} height={H} role="img" aria-label={`${metric === 'users' ? 'Visiteurs' : 'Pages vues'} par ${grain === 'day' ? 'jour' : 'mois'}`}
          onPointerMove={onMove} onPointerLeave={() => setHover(null)} className="block touch-pan-y">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke="#DCE5F3" strokeWidth={1} />
              <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="#5E6E86">{fmt(t)}</text>
            </g>
          ))}
          {points.map((p, i) => (i % labelEvery === 0 || i === points.length - 1) && (i === points.length - 1 || points.length - 1 - i >= Math.max(2, labelEvery * 0.8)) ? (
            <text key={p.date} x={x(i)} y={H - 8} textAnchor="middle" fontSize={11} fill="#5E6E86">{short(p.date, grain)}</text>
          ) : null)}
          <path d={area} fill="#1A82F5" opacity={0.1} />
          <path d={path} fill="none" stroke="#1A82F5" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {hp && hover != null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke="#0B2545" strokeOpacity={0.25} strokeWidth={1} />
              <circle cx={x(hover)} cy={y(hp[metric])} r={5} fill="#1A82F5" stroke="#fff" strokeWidth={2} />
            </g>
          )}
        </svg>
        {hp && hover != null && (
          <div className="pointer-events-none absolute top-1 rounded-xl bg-brand-ink text-white text-xs px-3 py-2 shadow-lift whitespace-nowrap"
            style={{ left: Math.min(Math.max(x(hover) - 70, 0), width - 150) }}>
            <b className="block">{grain === 'day' ? new Date(hp.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : short(hp.date, grain)}</b>
            {fmt(hp.users)} visiteurs · {fmt(hp.views)} pages vues
          </div>
        )}
      </div>
    </div>
  );
}

function BarList({ rows, unit, percent, empty }: { rows: Row[]; unit: string; percent?: boolean; empty?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const sum = rows.reduce((s, r) => s + r.value, 0) || 1;
  if (!rows.length) return <p className="text-sm text-brand-muted m-0">{empty || 'Pas encore de données sur la période.'}</p>;
  return (
    <ul className="list-none m-0 p-0 space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} title={`${r.label} : ${fmt(r.value)} ${unit}`}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-brand-ink font-semibold truncate">{r.label}</span>
            <span className="tabular-nums text-brand-ink font-bold shrink-0">
              {fmt(r.value)}{percent && <span className="text-brand-muted font-semibold"> · {Math.round((r.value / sum) * 100)} %</span>}
            </span>
          </div>
          <div className="h-2 mt-1 rounded-full bg-brand-blue-soft overflow-hidden">
            <div className="h-full rounded-full bg-brand-blue" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function PagesTable({ pages }: { pages: { path: string; title: string; views: number; users: number }[] }) {
  if (!pages.length) return <p className="text-sm text-brand-muted m-0">Pas encore de données sur la période.</p>;
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left text-xs text-brand-muted">
            <th className="font-bold py-2 px-1">Page</th>
            <th className="font-bold py-2 px-1 text-right">Pages vues</th>
            <th className="font-bold py-2 px-1 text-right">Visiteurs</th>
          </tr>
        </thead>
        <tbody>
          {pages.map((p) => (
            <tr key={p.path} className="border-t border-brand-line">
              <td className="py-2 px-1 min-w-0">
                <span className="block font-semibold text-brand-ink truncate max-w-[60vw] md:max-w-[520px]">{p.title.replace(/\s*[·|–-]\s*Kinshasa Label.*$/i, '') || p.path}</span>
                <span className="block text-xs text-brand-muted truncate max-w-[60vw] md:max-w-[520px]">{p.path}</span>
              </td>
              <td className="py-2 px-1 text-right tabular-nums font-bold">{fmt(p.views)}</td>
              <td className="py-2 px-1 text-right tabular-nums">{fmt(p.users)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SourcesTable({ rows, withCampaign }: { rows: { source: string; medium: string; campaign: string; sessions: number }[]; withCampaign: boolean }) {
  if (!rows.length) return <p className="text-sm text-brand-muted m-0">Pas encore de données sur la période.</p>;
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left text-xs text-brand-muted">
            <th className="font-bold py-2 px-1">Source</th>
            <th className="font-bold py-2 px-1">Support</th>
            {withCampaign && <th className="font-bold py-2 px-1">Campagne</th>}
            <th className="font-bold py-2 px-1 text-right">Visites</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.source}|${r.medium}|${r.campaign}|${i}`} className="border-t border-brand-line">
              <td className="py-2 px-1 font-semibold">{r.source}</td>
              <td className="py-2 px-1 text-brand-muted">{r.medium}</td>
              {withCampaign && <td className="py-2 px-1 text-brand-muted">{r.campaign || '—'}</td>}
              <td className="py-2 px-1 text-right tabular-nums font-bold">{fmt(r.sessions)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HourChart({ hours }: { hours: number[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const H = 150;
  const pad = { l: 8, r: 8, t: 8, b: 22 };
  const max = Math.max(1, ...hours);
  const slot = (width - pad.l - pad.r) / 24;
  const bw = Math.max(3, slot - 2); // 2px gap between bars
  const ih = H - pad.t - pad.b;
  const peak = hours.indexOf(Math.max(...hours));
  return (
    <div ref={ref} className="relative">
      <svg width={width} height={H} role="img" aria-label={`Visiteurs par heure, pic à ${peak} h`} className="block">
        {hours.map((v, h) => {
          const bh = Math.max(v ? 2 : 0, (v / max) * ih);
          return (
            <g key={h} onPointerEnter={() => setHover(h)} onPointerLeave={() => setHover(null)}>
              <rect x={pad.l + h * slot} y={pad.t} width={slot} height={ih} fill="transparent" />
              <rect x={pad.l + h * slot + 1} y={pad.t + ih - bh} width={bw} height={bh} rx={Math.min(4, bw / 2)} fill={h === hover ? '#0E5FC9' : '#1A82F5'} />
              {h % 3 === 0 && <text x={pad.l + h * slot + slot / 2} y={H - 6} textAnchor="middle" fontSize={11} fill="#5E6E86">{h} h</text>}
            </g>
          );
        })}
      </svg>
      {hover != null && (
        <div className="pointer-events-none absolute top-0 rounded-xl bg-brand-ink text-white text-xs px-3 py-2 shadow-lift whitespace-nowrap"
          style={{ left: Math.min(Math.max(pad.l + hover * slot - 50, 0), width - 130) }}>
          <b>{hover} h – {hover + 1} h</b> · {fmt(hours[hover])} visiteurs
        </div>
      )}
      <p className="text-xs text-brand-muted m-0 mt-2">Heure de pointe : <b className="text-brand-ink">{peak} h – {peak + 1} h</b> (fuseau horaire de la propriété Google Analytics).</p>
    </div>
  );
}

function SitePanel({ site, view, range }: { site: Stats['site']; view: 'complet' | 'partenaire'; range: string }) {
  const tiles = [
    { label: 'Lieux publiés', value: fmt(site.places), hint: 'Sur le site aujourd’hui' },
    { label: 'Avis reçus', value: fmt(site.reviewsInPeriod), hint: `${range} · ${fmt(site.reviewsTotal)} au total` },
    ...(view === 'complet'
      ? [{ label: 'Abonnés newsletter', value: fmt(site.subscribers), hint: site.newSubscribers != null ? `+${fmt(site.newSubscribers)} sur la période` : 'Total' }]
      : []),
  ];
  const stars = (n: number) => `${n.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ★`;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="Le site en chiffres" sub="Données Kinshasa Label">
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
          {tiles.map((t) => (
            <div key={t.label}>
              <p className="text-xs font-bold text-brand-muted m-0">{t.label}</p>
              <p className="font-display text-2xl font-extrabold text-brand-ink m-0 mt-0.5 tabular-nums">{t.value}</p>
              <p className="text-[11px] text-brand-muted m-0">{t.hint}</p>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Lieux les mieux notés" sub="Note des visiteurs (au moins 2 avis)">
        {site.topRated.length ? (
          <ol className="m-0 p-0 list-none space-y-2">
            {site.topRated.map((p, i) => (
              <li key={`${p.name}-${i}`} className="flex items-baseline gap-3 text-sm">
                <span className="w-5 text-brand-muted font-bold tabular-nums">{i + 1}</span>
                <span className="flex-1 min-w-0">
                  <span className="font-semibold text-brand-ink truncate block">{p.name}</span>
                  <span className="text-xs text-brand-muted">{p.commune}</span>
                </span>
                <span className="font-bold tabular-nums">{stars(p.avg)}</span>
                <span className="text-xs text-brand-muted tabular-nums w-14 text-right">{p.count} avis</span>
              </li>
            ))}
          </ol>
        ) : <p className="text-sm text-brand-muted m-0">Pas encore assez d’avis.</p>}
      </Card>
    </div>
  );
}
