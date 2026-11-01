// Kin Stats dashboard (2026-11-01): the site's audience from Google
// Analytics, plus what only Kinshasa Label knows (communes, rubriques,
// ratings, reviews, newsletter). Used in two places:
//   - Backoffice → « Statistiques » (team session, full view + partner links)
//   - /stats/<link> (partner link, read-only, no login)
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ShareLinks } from './ShareLinks';
import { CommuneMap } from './CommuneMap';

type Totals = { users: number; newUsers: number; sessions: number; views: number; engagementRate: number; avgSessionSec: number };
type Row = { label: string; value: number };
type Point = { date: string; users: number; views: number };
type Range = { start: string; end: string; days: number; prevStart: string; prevEnd: string };
type Ga = {
  current: Totals;
  previous: Totals;
  series: Point[];
  previousSeries: Point[];
  seriesGrain: 'day' | 'month';
  pages: { path: string; title: string; views: number; users: number }[];
  landings: { path: string; sessions: number; engaged: number }[];
  channels: Row[];
  sources: { source: string; medium: string; campaign: string; sessions: number }[];
  countries: Row[];
  cities: Row[];
  devices: Row[];
  newVsReturning: Row[];
  weekdays: number[];
  hours: number[];
  events: Row[];
  outbound: Row[];
  searches: Row[];
  realtime: number | null;
};
type Stats = {
  ok: boolean;
  reason?: string;
  view: 'complet' | 'partenaire';
  partner: string | null;
  expires: string | null;
  generatedAt: string;
  demo: boolean;
  range: Range;
  gaError: string | null;
  ga: Ga | null;
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

const PRESETS: { days: number; label: string }[] = [
  { days: 7, label: '7 jours' },
  { days: 28, label: '28 jours' },
  { days: 90, label: '3 mois' },
  { days: 365, label: '12 mois' },
];

const CHANNELS: Record<string, string> = {
  'Organic Social': 'Réseaux sociaux', 'Paid Social': 'Réseaux sociaux (payant)', Direct: 'Accès direct',
  'Organic Search': 'Recherche (Google…)', 'Paid Search': 'Recherche (payant)', Referral: 'Autres sites',
  Email: 'E-mail / newsletter', 'Organic Video': 'Vidéo', Display: 'Bannières pub', SMS: 'SMS',
  Unassigned: 'Non attribué', 'Cross-network': 'Multi-réseaux', Affiliates: 'Affiliés',
  'Organic Shopping': 'Shopping', 'Mobile Push Notifications': 'Notifications',
};
const COUNTRIES: Record<string, string> = {
  'DR Congo': 'RD Congo', 'Congo - Kinshasa': 'RD Congo', Congo: 'Congo-Brazzaville', 'Congo - Brazzaville': 'Congo-Brazzaville',
  Belgium: 'Belgique', 'United States': 'États-Unis', 'United Kingdom': 'Royaume-Uni', Egypt: 'Égypte', Germany: 'Allemagne',
  'South Africa': 'Afrique du Sud', Netherlands: 'Pays-Bas', Switzerland: 'Suisse', Spain: 'Espagne', Italy: 'Italie',
  Ireland: 'Irlande', 'Ivory Coast': 'Côte d’Ivoire', "Côte d'Ivoire": 'Côte d’Ivoire', Cameroon: 'Cameroun', China: 'Chine',
  'United Arab Emirates': 'Émirats arabes unis', Morocco: 'Maroc', Brazil: 'Brésil', Angola: 'Angola', Rwanda: 'Rwanda',
  Uganda: 'Ouganda', Zambia: 'Zambie', Tanzania: 'Tanzanie', Kenya: 'Kenya', Nigeria: 'Nigeria', Senegal: 'Sénégal',
  'Saudi Arabia': 'Arabie saoudite', Turkey: 'Turquie', Türkiye: 'Turquie', India: 'Inde', Portugal: 'Portugal', Canada: 'Canada',
};
const CITIES: Record<string, string> = { Brussels: 'Bruxelles', London: 'Londres', Cairo: 'Le Caire', Geneva: 'Genève' };
const DEVICES: Record<string, string> = { mobile: 'Téléphone', desktop: 'Ordinateur', tablet: 'Tablette', 'smart tv': 'TV' };
const NVR: Record<string, string> = { new: 'Nouveaux visiteurs', returning: 'Visiteurs qui reviennent' };
const EVENTS: Record<string, string> = {
  page_view: 'Pages vues', session_start: 'Visites commencées', user_engagement: 'Lecture active', scroll: 'Lu jusqu’en bas (90 %)',
  first_visit: 'Premières visites', click: 'Clics vers d’autres sites', view_search_results: 'Recherches sur le site',
  file_download: 'Téléchargements', form_start: 'Formulaires commencés', form_submit: 'Formulaires envoyés',
  video_start: 'Vidéos lancées', video_progress: 'Vidéos en cours', video_complete: 'Vidéos terminées',
};
const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const WEEKDAYS_LONG = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

const nf = new Intl.NumberFormat('fr-FR');
const fmt = (n: number | null | undefined) => (n == null ? '—' : nf.format(Math.round(n)));
const pct = (x: number) => `${(x * 100).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} %`;
const dur = (s: number) => {
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return m ? `${m} min ${String(r).padStart(2, '0')} s` : `${r} s`;
};
const dLong = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const dShort = (d: string, grain: 'day' | 'month') => {
  const [y, m, day] = d.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, day || 1, 12));
  return grain === 'day'
    ? date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' })
    : date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit', timeZone: 'UTC' });
};
const todayKin = () => new Date(Date.now() + 3600000).toISOString().slice(0, 10);
const shortUrl = (u: string) => u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

function downloadCsv(name: string, header: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = '﻿' + [header, ...rows].map((r) => r.map(esc).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `kin-stats-${name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------

export function StatsDashboard({ share }: { share?: string }) {
  const [period, setPeriod] = useState<{ days: number } | { start: string; end: string }>({ days: 28 });
  const [custom, setCustom] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [demo, setDemo] = useState(share === 'demo');
  const [data, setData] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFatal(null);
    try {
      const qs = new URLSearchParams('days' in period ? { days: String(period.days) } : { start: period.start, end: period.end });
      if (share) qs.set('share', share);
      if (demo && !share) qs.set('demo', '1');
      const headers: Record<string, string> = {};
      if (!share) {
        const { data: s } = await supabase.auth.getSession();
        if (s.session?.access_token) headers.Authorization = `Bearer ${s.session.access_token}`;
      }
      const res = await fetch(`/api/stats?${qs}`, { headers, cache: 'no-store' });
      const json = (await res.json()) as Stats;
      if (!json.ok) {
        setFatal(json.reason === 'link-invalid'
          ? 'Ce lien de statistiques a expiré ou a été désactivé. Demande un nouveau lien à l’équipe Kinshasa Label.'
          : 'Seuls les comptes de l’équipe Kinshasa Label peuvent voir ces statistiques.');
        setData(null);
      } else setData(json);
    } catch {
      setFatal('Impossible de charger les statistiques. Vérifie ta connexion et réessaie.');
    } finally {
      setLoading(false);
    }
  }, [period, share, demo]);

  useEffect(() => { load(); }, [load]);

  const ga = data?.ga;
  const isTeam = !share;
  const r = data?.range;
  const preset = 'days' in period ? period.days : null;

  if (fatal) return <div className="rounded-2xl border border-brand-line bg-white p-6 text-sm font-semibold text-brand-ink">{fatal}</div>;

  const applyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (from && to) setPeriod({ start: from <= to ? from : to, end: from <= to ? to : from });
  };

  return (
    <div className="kin-stats space-y-5">
      {/* Filters: one row above everything */}
      <div className="rounded-2xl border border-brand-line bg-white p-3 md:p-4 space-y-3 print:border-0 print:p-0">
        <div className="flex flex-wrap items-center gap-2">
          <div role="radiogroup" aria-label="Période" className="inline-flex flex-wrap rounded-full bg-brand-bg border border-brand-line p-1 print:hidden">
            {PRESETS.map((p) => (
              <button key={p.days} type="button" role="radio" aria-checked={!custom && preset === p.days}
                onClick={() => { setCustom(false); setPeriod({ days: p.days }); }}
                className={`h-9 px-3.5 rounded-full text-sm font-bold cursor-pointer border-0 transition-colors ${!custom && preset === p.days ? 'bg-brand-ink text-white' : 'bg-transparent text-brand-ink hover:bg-brand-blue-soft'}`}>
                {p.label}
              </button>
            ))}
            <button type="button" role="radio" aria-checked={custom}
              onClick={() => { setCustom(true); if (r) { setFrom(r.start); setTo(r.end); } }}
              className={`h-9 px-3.5 rounded-full text-sm font-bold cursor-pointer border-0 transition-colors ${custom ? 'bg-brand-ink text-white' : 'bg-transparent text-brand-ink hover:bg-brand-blue-soft'}`}>
              Dates…
            </button>
          </div>
          <div className="flex items-center gap-2 ml-auto">
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

        {custom && (
          <form onSubmit={applyCustom} className="flex flex-wrap items-end gap-2 print:hidden">
            <label className="text-xs font-bold text-brand-ink/70">Du
              <input type="date" value={from} max={todayKin()} min="2015-08-14" onChange={(e) => setFrom(e.target.value)} required
                className="block mt-1 h-10 px-3 rounded-xl border border-brand-line bg-brand-bg text-[16px] md:text-sm text-brand-ink" />
            </label>
            <label className="text-xs font-bold text-brand-ink/70">Au
              <input type="date" value={to} max={todayKin()} min="2015-08-14" onChange={(e) => setTo(e.target.value)} required
                className="block mt-1 h-10 px-3 rounded-xl border border-brand-line bg-brand-bg text-[16px] md:text-sm text-brand-ink" />
            </label>
            <button type="submit" className="h-10 px-4 rounded-xl bg-brand-blue text-white text-sm font-bold border-0 cursor-pointer">Appliquer</button>
            <span className="text-xs text-brand-muted">Jusqu’à 2 ans par vue.</span>
          </form>
        )}

        {r && (
          <p className="m-0 text-sm text-brand-ink">
            <b>{dLong(r.start)} → {dLong(r.end)}</b> <span className="text-brand-muted">({r.days} jour{r.days > 1 ? 's' : ''}) · comparé au {dLong(r.prevStart)} → {dLong(r.prevEnd)}</span>
          </p>
        )}
      </div>

      {/* Jump to a section */}
      {ga && (
        <nav aria-label="Sections" className="rail flex gap-2 overflow-x-auto -mx-1 px-1 print:hidden">
          {[['apercu', 'Vue d’ensemble'], ['contenu', 'Contenu'], ['communes', 'Communes'], ['acquisition', 'D’où ils viennent'], ['clics', 'Clics & recherches'], ['audience', 'Audience'], ['moments', 'Moments'], ['site', 'Le site'], ...(isTeam ? [['liens', 'Liens partenaires']] : [])].map(([id, l]) => (
            <a key={id} href={`#ks-${id}`} className="shrink-0 h-9 px-3.5 inline-flex items-center rounded-full bg-white border border-brand-line text-xs font-bold text-brand-ink no-underline hover:border-brand-blue">{l}</a>
          ))}
        </nav>
      )}

      {data?.demo && (
        <Notice tone="yellow">
          <b>Données d’exemple.</b> Google Analytics n’est pas encore connecté : ces chiffres sont inventés pour montrer le tableau de bord.
          {isTeam && <> <button type="button" className="underline font-bold bg-transparent border-0 p-0 cursor-pointer text-brand-ink" onClick={() => setDemo(false)}>Revenir aux vraies données</button></>}
        </Notice>
      )}
      {data && !ga && data.gaError === 'not-configured' && (
        <Notice tone="blue">
          <b>Google Analytics n’est pas encore connecté.</b>{' '}
          {isTeam ? <>Voir <code>docs/kin-stats.md</code>. Les chiffres du site ci-dessous fonctionnent déjà. </> : <>Les chiffres d’audience apparaîtront bientôt. </>}
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

      {ga && data && (
        <div className={`space-y-5 transition-opacity ${loading ? 'opacity-50' : ''}`}>
          <Anchor id="apercu" />
          <Kpis cur={ga.current} prev={ga.previous} />
          <Card title="Visiteurs" sub={`Par ${ga.seriesGrain === 'day' ? 'jour' : 'mois'} · trait pointillé = période précédente`}>
            <LineChart points={ga.series} prev={ga.previousSeries} grain={ga.seriesGrain} />
          </Card>

          <Anchor id="contenu" />
          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Rubriques" sub="Pages vues par rubrique">
              <BarList rows={data.rubriques} unit="vues" empty="Aucune rubrique vue sur la période." />
            </Card>
            <Card title="Articles « À la une » les plus lus" sub="Pages vues">
              <BarList rows={data.articles.map((a) => ({ label: a.title, value: a.views }))} unit="vues" limit={8} searchable="Rechercher un article…" empty="Aucun article lu sur la période." />
            </Card>
          </div>
          <Card title="Toutes les pages" sub="Cherche une page, trie par colonne, exporte en CSV">
            <DataTable
              name="pages"
              search="Rechercher une page (titre ou adresse)…"
              columns={[
                { key: 'page', label: 'Page' },
                { key: 'views', label: 'Pages vues', num: true },
                { key: 'users', label: 'Visiteurs', num: true },
              ]}
              rows={ga.pages.map((p) => ({
                page: p.title.replace(/\s*[·|]\s*Kinshasa Label.*$/i, '').replace(/\s+—\s+Kin Actualité\s*$/i, '') || p.path,
                sub: p.path,
                views: p.views,
                users: p.users,
              }))}
            />
          </Card>
          <Card title="Pages d’entrée" sub="La première page vue à chaque visite · « engagées » = visite de plus de 10 s, 2 pages ou une action">
            <DataTable
              name="pages-entree"
              search="Rechercher une page d’entrée…"
              columns={[
                { key: 'page', label: 'Page d’entrée' },
                { key: 'sessions', label: 'Visites', num: true },
                { key: 'rate', label: 'Engagées', num: true, format: (v) => pct(Number(v)) },
              ]}
              rows={ga.landings.map((l) => ({ page: l.path, sessions: l.sessions, rate: l.sessions ? l.engaged / l.sessions : 0 }))}
            />
          </Card>

          <Anchor id="communes" />
          <Card title="Communes les plus consultées" sub="Pages vues des guides de commune">
            <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr] items-start">
              <CommuneMap rows={data.communes} />
              <BarList rows={data.communes} unit="vues" limit={10} searchable="Rechercher une commune…" empty="Aucune page de commune vue sur la période." />
            </div>
          </Card>

          <Anchor id="acquisition" />
          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="D’où viennent les visiteurs" sub="Visites par canal">
              <BarList rows={ga.channels.map((c) => ({ label: CHANNELS[c.label] || c.label, value: c.value }))} unit="visites" percent />
            </Card>
            <Card title="Sources précises" sub={data.view === 'complet' ? 'Source · support · campagne (liens de suivi)' : 'Source · support'}>
              <DataTable
                name="sources"
                search="Rechercher une source (instagram, google…)…"
                pageSize={8}
                columns={[
                  { key: 'source', label: 'Source' },
                  { key: 'medium', label: 'Support' },
                  ...(data.view === 'complet' ? [{ key: 'campaign', label: 'Campagne' }] : []),
                  { key: 'sessions', label: 'Visites', num: true },
                ]}
                rows={ga.sources.map((s) => ({ source: s.source, medium: s.medium, campaign: s.campaign || '—', sessions: s.sessions }))}
              />
            </Card>
          </div>

          <Anchor id="clics" />
          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Clics vers d’autres sites" sub="Articles de presse, WhatsApp, Instagram, sites des partenaires…">
              <DataTable
                name="clics-sortants"
                search="Rechercher un lien…"
                pageSize={8}
                empty="Aucun clic sortant mesuré sur la période."
                columns={[{ key: 'link', label: 'Lien' }, { key: 'clicks', label: 'Clics', num: true }]}
                rows={ga.outbound.map((o) => ({ link: shortUrl(o.label), href: o.label, clicks: o.value }))}
              />
            </Card>
            <Card title="Ce que les visiteurs cherchent" sub="Recherches sur le site (/recherche)">
              <DataTable
                name="recherches"
                search="Filtrer les recherches…"
                pageSize={8}
                empty="Aucune recherche mesurée sur la période."
                columns={[{ key: 'term', label: 'Recherche' }, { key: 'count', label: 'Fois', num: true }]}
                rows={ga.searches.map((s) => ({ term: s.label, count: s.value }))}
              />
            </Card>
          </div>
          <Card title="Actions des visiteurs" sub="Événements mesurés par Google Analytics">
            <BarList rows={ga.events.map((e) => ({ label: EVENTS[e.label] || e.label, value: e.value }))} unit="fois" limit={10} />
          </Card>

          <Anchor id="audience" />
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <Card title="Pays"><BarList rows={ga.countries.map((x) => ({ label: COUNTRIES[x.label] || x.label, value: x.value }))} unit="visiteurs" percent limit={6} searchable="Rechercher un pays…" /></Card>
            <Card title="Villes"><BarList rows={ga.cities.map((x) => ({ label: CITIES[x.label] || x.label, value: x.value }))} unit="visiteurs" percent limit={6} searchable="Rechercher une ville…" /></Card>
            <Card title="Appareils"><BarList rows={ga.devices.map((x) => ({ label: DEVICES[x.label] || x.label, value: x.value }))} unit="visiteurs" percent /></Card>
            <Card title="Fidélité"><BarList rows={ga.newVsReturning.map((x) => ({ label: NVR[x.label] || x.label, value: x.value }))} unit="visiteurs" percent /></Card>
          </div>

          <Anchor id="moments" />
          <div className="grid gap-5 lg:grid-cols-[1fr_2fr]">
            <Card title="Jours de la semaine" sub="Visiteurs par jour">
              <Columns values={ga.weekdays} labels={WEEKDAYS} tip={(i, v) => `${WEEKDAYS_LONG[i]} · ${fmt(v)} visiteurs`} every={1}
                note={(peak) => <>Jour le plus fort : <b className="text-brand-ink">{WEEKDAYS_LONG[peak]}</b></>} />
            </Card>
            <Card title="Heures de la journée" sub="Visiteurs par heure (fuseau de la propriété Google Analytics)">
              <Columns values={ga.hours} labels={ga.hours.map((_, h) => `${h} h`)} tip={(h, v) => `${h} h – ${h + 1} h · ${fmt(v)} visiteurs`} every={3}
                note={(peak) => <>Heure de pointe : <b className="text-brand-ink">{peak} h – {peak + 1} h</b></>} />
            </Card>
          </div>
        </div>
      )}

      {data && <><Anchor id="site" /><SitePanel site={data.site} view={data.view} /></>}

      {data && (
        <p className="text-xs text-brand-muted leading-relaxed m-0">
          Audience mesurée par Google Analytics : elle ne compte que les visiteurs qui ont accepté les cookies, donc le trafic réel est plus élevé.
          Mis à jour toutes les 10 minutes
          {data.generatedAt ? ` · lu le ${new Date(data.generatedAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}
          {data.expires ? ` · lien valable jusqu’au ${new Date(data.expires).toLocaleDateString('fr-FR', { dateStyle: 'long' })}` : ''}.
        </p>
      )}

      {isTeam && data && <div className="print:hidden"><Anchor id="liens" /><ShareLinks /></div>}
    </div>
  );
}

// ---------------------------------------------------------------------------

const Anchor = ({ id }: { id: string }) => <span id={`ks-${id}`} className="block scroll-mt-28" aria-hidden />;

function Notice({ tone, children }: { tone: 'blue' | 'yellow'; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl border p-4 text-sm leading-relaxed ${tone === 'blue' ? 'bg-brand-blue-soft border-brand-blue/40' : 'bg-brand-yellow-soft border-brand-yellow'} text-brand-ink print:hidden`}>
      {children}
    </div>
  );
}

function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-brand-line bg-white p-4 md:p-5 shadow-card break-inside-avoid min-w-0">
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
  if (!prev) return <span className="text-xs text-brand-muted font-semibold">pas de comparaison</span>;
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

function Kpis({ cur, prev }: { cur: Totals; prev: Totals }) {
  const tiles = [
    { label: 'Visiteurs', value: fmt(cur.users), c: cur.users, p: prev.users, before: fmt(prev.users), hint: 'Personnes différentes' },
    { label: 'Nouveaux visiteurs', value: fmt(cur.newUsers), c: cur.newUsers, p: prev.newUsers, before: fmt(prev.newUsers), hint: 'Première visite' },
    { label: 'Pages vues', value: fmt(cur.views), c: cur.views, p: prev.views, before: fmt(prev.views), hint: `${(cur.sessions ? cur.views / cur.sessions : 0).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} par visite` },
    { label: 'Visites', value: fmt(cur.sessions), c: cur.sessions, p: prev.sessions, before: fmt(prev.sessions), hint: 'Sessions' },
    { label: 'Visites engagées', value: pct(cur.engagementRate), c: cur.engagementRate, p: prev.engagementRate, before: pct(prev.engagementRate), hint: '> 10 s, 2 pages ou une action' },
    { label: 'Durée moyenne', value: dur(cur.avgSessionSec), c: cur.avgSessionSec, p: prev.avgSessionSec, before: dur(prev.avgSessionSec), hint: 'Par visite' },
  ];
  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-2xl border border-brand-line bg-white p-4 shadow-card break-inside-avoid">
          <p className="text-xs font-bold text-brand-muted m-0">{t.label}</p>
          <p className="font-display text-[28px] leading-tight font-extrabold text-brand-ink m-0 mt-1 tabular-nums">{t.value}</p>
          <Delta cur={t.c} prev={t.p} />
          <p className="text-[11px] text-brand-muted m-0 mt-1">{t.hint} · avant : {t.before}</p>
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
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))));
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

function LineChart({ points, prev, grain }: { points: Point[]; prev: Point[]; grain: 'day' | 'month' }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [metric, setMetric] = useState<'users' | 'views'>('users');
  const [showPrev, setShowPrev] = useState(true);
  const [hover, setHover] = useState<number | null>(null);
  const H = 260;
  const pad = { l: 46, r: 12, t: 12, b: 28 };
  const vals = points.map((p) => p[metric]);
  const pvals = prev.map((p) => p[metric]);
  const max = niceMax(Math.max(1, ...vals, ...(showPrev ? pvals : [])));
  const iw = width - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const x = (i: number) => pad.l + (points.length <= 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (v: number) => pad.t + ih - (v / max) * ih;
  const line = (vs: number[]) => vs.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const path = line(vals);
  const area = points.length ? `${path} L${x(points.length - 1).toFixed(1)},${pad.t + ih} L${x(0).toFixed(1)},${pad.t + ih} Z` : '';
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const labelEvery = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(iw / 72))));
  const total = vals.reduce((s, v) => s + v, 0);
  const ptotal = pvals.reduce((s, v) => s + v, 0);

  if (!points.length) return <p className="text-sm text-brand-muted m-0">Pas encore de données sur la période.</p>;
  const hp = hover != null ? points[hover] : null;
  const hprev = hover != null ? prev[hover] : null;
  const name = metric === 'users' ? 'visiteurs' : 'pages vues';

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        {(['users', 'views'] as const).map((m) => (
          <button key={m} type="button" onClick={() => setMetric(m)}
            className={`h-8 px-3 rounded-full text-xs font-bold border cursor-pointer print:hidden ${metric === m ? 'bg-brand-blue-soft border-brand-blue text-brand-blue-deep' : 'bg-white border-brand-line text-brand-ink'}`}>
            {m === 'users' ? 'Visiteurs' : 'Pages vues'}
          </button>
        ))}
        <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-ink cursor-pointer print:hidden">
          <input type="checkbox" checked={showPrev} onChange={(e) => setShowPrev(e.target.checked)} /> Période précédente
        </label>
        <span className="ml-auto text-xs text-brand-muted">
          Total : <b className="text-brand-ink">{fmt(total)}</b>{showPrev && ptotal > 0 && <> · avant : {fmt(ptotal)}</>}
        </span>
      </div>
      <div ref={ref} className="relative">
        <svg width={width} height={H} role="img" aria-label={`${name} par ${grain === 'day' ? 'jour' : 'mois'}`}
          onPointerMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const px = ((e.clientX - rect.left) / rect.width) * width;
            setHover(Math.min(points.length - 1, Math.max(0, Math.round(((px - pad.l) / iw) * (points.length - 1)))));
          }}
          onPointerLeave={() => setHover(null)} className="block touch-pan-y">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke="#DCE5F3" strokeWidth={1} />
              <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="#5E6E86">{fmt(t)}</text>
            </g>
          ))}
          {points.map((p, i) => (i % labelEvery === 0 || i === points.length - 1) && (i === points.length - 1 || points.length - 1 - i >= Math.max(2, labelEvery * 0.8)) ? (
            <text key={p.date} x={x(i)} y={H - 8} textAnchor="middle" fontSize={11} fill="#5E6E86">{dShort(p.date, grain)}</text>
          ) : null)}
          {showPrev && pvals.length > 1 && <path d={line(pvals)} fill="none" stroke="#5E6E86" strokeOpacity={0.6} strokeWidth={1.5} strokeDasharray="4 4" />}
          <path d={area} fill="#1A82F5" opacity={0.1} />
          <path d={path} fill="none" stroke="#1A82F5" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {points.length <= 40 && points.map((p, i) => <circle key={p.date} cx={x(i)} cy={y(p[metric])} r={2.5} fill="#1A82F5" />)}
          {hp && hover != null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke="#0B2545" strokeOpacity={0.25} strokeWidth={1} />
              <circle cx={x(hover)} cy={y(hp[metric])} r={5} fill="#1A82F5" stroke="#fff" strokeWidth={2} />
            </g>
          )}
        </svg>
        {hp && hover != null && (
          <div className="pointer-events-none absolute top-1 rounded-xl bg-brand-ink text-white text-xs px-3 py-2 shadow-lift whitespace-nowrap"
            style={{ left: Math.min(Math.max(x(hover) - 80, 0), width - 190) }}>
            <b className="block">{grain === 'day' ? new Date(`${hp.date}T12:00:00Z`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }) : dShort(hp.date, grain)}</b>
            {fmt(hp.users)} visiteurs · {fmt(hp.views)} pages vues
            {showPrev && hprev && <span className="block text-white/70">Avant ({dShort(hprev.date, grain)}) : {fmt(hprev[metric])} {name}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder}
      className="w-full h-10 px-3 mb-3 rounded-xl border border-brand-line bg-brand-bg text-[16px] md:text-sm text-brand-ink placeholder:text-brand-muted focus:outline-none focus:border-brand-blue print:hidden" />
  );
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function BarList({ rows, unit, percent, empty, limit, searchable }: { rows: Row[]; unit: string; percent?: boolean; empty?: string; limit?: number; searchable?: string }) {
  const [q, setQ] = useState('');
  const [all, setAll] = useState(false);
  const max = Math.max(1, ...rows.map((r) => r.value));
  const sum = rows.reduce((s, r) => s + r.value, 0) || 1;
  const filtered = q ? rows.filter((r) => norm(r.label).includes(norm(q))) : rows;
  const shown = limit && !all && !q ? filtered.slice(0, limit) : filtered;
  if (!rows.length) return <p className="text-sm text-brand-muted m-0">{empty || 'Pas encore de données sur la période.'}</p>;
  return (
    <div>
      {searchable && rows.length > (limit || 8) && <SearchInput value={q} onChange={setQ} placeholder={searchable} />}
      <ul className="list-none m-0 p-0 space-y-2.5">
        {shown.map((r) => (
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
        {!shown.length && <li className="text-sm text-brand-muted">Aucun résultat pour « {q} ».</li>}
      </ul>
      {limit && !q && filtered.length > limit && (
        <button type="button" onClick={() => setAll(!all)} className="mt-3 text-sm font-bold text-brand-blue-deep bg-transparent border-0 p-0 cursor-pointer print:hidden">
          {all ? 'Voir moins' : `Voir les ${filtered.length}`}
        </button>
      )}
    </div>
  );
}

type Col = { key: string; label: string; num?: boolean; format?: (v: unknown) => string };

function DataTable({ name, columns, rows, search, pageSize = 10, empty }: {
  name: string;
  columns: Col[];
  rows: Record<string, any>[];
  search: string;
  pageSize?: number;
  empty?: string;
}) {
  const [q, setQ] = useState('');
  const firstNum = columns.find((c) => c.num)?.key || columns[0].key;
  const [sort, setSort] = useState<{ key: string; desc: boolean }>({ key: firstNum, desc: true });
  const [n, setN] = useState(pageSize);
  const filtered = useMemo(() => {
    const s = norm(q.trim());
    const f = s ? rows.filter((r) => columns.some((c) => !c.num && norm(String(r[c.key] ?? '')).includes(s)) || norm(String(r.sub ?? '')).includes(s)) : rows;
    return [...f].sort((a, b) => {
      const va = a[sort.key];
      const vb = b[sort.key];
      const c = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'fr');
      return sort.desc ? -c : c;
    });
  }, [rows, q, sort, columns]);
  const shown = filtered.slice(0, n);

  if (!rows.length) return <p className="text-sm text-brand-muted m-0">{empty || 'Pas encore de données sur la période.'}</p>;
  return (
    <div>
      <div className="flex gap-2 items-start">
        <div className="flex-1"><SearchInput value={q} onChange={(v) => { setQ(v); setN(pageSize); }} placeholder={search} /></div>
        <button type="button" className="h-10 px-3 rounded-xl border border-brand-line bg-white text-xs font-bold text-brand-ink cursor-pointer shrink-0 print:hidden"
          onClick={() => downloadCsv(name, columns.map((c) => c.label), filtered.map((r) => columns.map((c) => (c.format ? c.format(r[c.key]) : r[c.key]))))}>
          CSV
        </button>
      </div>
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-xs text-brand-muted">
              {columns.map((c) => (
                <th key={c.key} className={`font-bold py-2 px-1 ${c.num ? 'text-right' : ''}`} aria-sort={sort.key === c.key ? (sort.desc ? 'descending' : 'ascending') : undefined}>
                  <button type="button" onClick={() => setSort({ key: c.key, desc: sort.key === c.key ? !sort.desc : !!c.num })}
                    className="bg-transparent border-0 p-0 font-bold text-brand-muted cursor-pointer hover:text-brand-ink">
                    {c.label}{sort.key === c.key ? (sort.desc ? ' ↓' : ' ↑') : ''}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={`${i}-${r[columns[0].key]}`} className="border-t border-brand-line">
                {columns.map((c, ci) => (
                  <td key={c.key} className={`py-2 px-1 ${c.num ? 'text-right tabular-nums' : ''} ${ci === 0 ? 'min-w-0' : ''} ${c.num && c.key === sort.key ? 'font-bold' : ''}`}>
                    {ci === 0 ? (
                      <>
                        {r.href ? (
                          <a href={r.href} target="_blank" rel="noopener noreferrer nofollow" className="block font-semibold text-brand-blue-deep truncate max-w-[56vw] md:max-w-[460px] no-underline hover:underline">{r[c.key]}</a>
                        ) : (
                          <span className="block font-semibold text-brand-ink truncate max-w-[56vw] md:max-w-[460px]">{r[c.key]}</span>
                        )}
                        {r.sub && r.sub !== r[c.key] && <span className="block text-xs text-brand-muted truncate max-w-[56vw] md:max-w-[460px]">{r.sub}</span>}
                      </>
                    ) : c.format ? c.format(r[c.key]) : c.num ? fmt(r[c.key]) : <span className="text-brand-muted">{r[c.key]}</span>}
                  </td>
                ))}
              </tr>
            ))}
            {!shown.length && <tr><td colSpan={columns.length} className="py-3 text-sm text-brand-muted">Aucun résultat pour « {q} ».</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between mt-3 text-xs text-brand-muted">
        <span>{fmt(Math.min(n, filtered.length))} sur {fmt(filtered.length)}</span>
        {filtered.length > n && (
          <button type="button" onClick={() => setN(n + pageSize * 2)} className="text-sm font-bold text-brand-blue-deep bg-transparent border-0 p-0 cursor-pointer print:hidden">Voir plus</button>
        )}
      </div>
    </div>
  );
}

function Columns({ values, labels, tip, every, note }: { values: number[]; labels: string[]; tip: (i: number, v: number) => string; every: number; note: (peak: number) => React.ReactNode }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const H = 160;
  const pad = { l: 4, r: 4, t: 8, b: 22 };
  const max = Math.max(1, ...values);
  const slot = (width - pad.l - pad.r) / values.length;
  const bw = Math.max(3, slot - 2); // 2px gap between bars
  const ih = H - pad.t - pad.b;
  const peak = values.indexOf(Math.max(...values));
  return (
    <div ref={ref} className="relative">
      <svg width={width} height={H} role="img" aria-label={tip(peak, values[peak])} className="block">
        {values.map((v, i) => {
          const bh = Math.max(v ? 2 : 0, (v / max) * ih);
          return (
            <g key={i} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
              <rect x={pad.l + i * slot} y={pad.t} width={slot} height={ih} fill="transparent" />
              <rect x={pad.l + i * slot + 1} y={pad.t + ih - bh} width={bw} height={bh} rx={Math.min(4, bw / 2)} fill={i === hover ? '#0E5FC9' : '#1A82F5'} />
              {i % every === 0 && <text x={pad.l + i * slot + slot / 2} y={H - 6} textAnchor="middle" fontSize={11} fill="#5E6E86">{labels[i]}</text>}
            </g>
          );
        })}
      </svg>
      {hover != null && (
        <div className="pointer-events-none absolute top-0 rounded-xl bg-brand-ink text-white text-xs px-3 py-2 shadow-lift whitespace-nowrap"
          style={{ left: Math.min(Math.max(pad.l + hover * slot - 60, 0), width - 170) }}>
          {tip(hover, values[hover])}
        </div>
      )}
      <p className="text-xs text-brand-muted m-0 mt-2">{note(peak)}</p>
    </div>
  );
}

function SitePanel({ site, view }: { site: Stats['site']; view: 'complet' | 'partenaire' }) {
  const tiles = [
    { label: 'Lieux publiés', value: fmt(site.places), hint: 'Sur le site aujourd’hui' },
    { label: 'Avis reçus', value: fmt(site.reviewsInPeriod), hint: `sur la période · ${fmt(site.reviewsTotal)} au total` },
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
