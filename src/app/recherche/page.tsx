// /recherche?q=… — server-rendered search across the site (see src/lib/search.ts).
import Link from 'next/link';
import { SiteHeader } from '../../components/SiteHeader';
import { SiteFooter } from '../../components/SiteFooter';
import { SearchBox } from './SearchBox';
import { serverPlaces, serverEvents, serverNews } from '../../lib/supabaseServer';
import { getNewsFeedSafe } from '../../lib/newsFeed';
import { searchAll } from '../../lib/search';
import { categoryOf, CATEGORY_PATH } from '../../lib/categories';
import { communeHref } from '../../lib/communes';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Recherche — Kinshasa Label', robots: { index: false } };

const frDate = (d: string) =>
  new Date(`${String(d).slice(0, 10)}T12:00:00Z`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

function Group({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  if (!count) return null;
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-extrabold text-brand-ink m-0 mb-3">
        {title} <span className="text-brand-muted text-base font-semibold">({count})</span>
      </h2>
      <ul className="list-none p-0 m-0 flex flex-col gap-2">{children}</ul>
    </section>
  );
}

const row = 'block bg-white border border-brand-line rounded-2xl px-4 py-3 no-underline hover:border-brand-blue';

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = String((await searchParams).q || '').slice(0, 100);
  const hasQuery = q.trim().length >= 2;
  const r = hasQuery
    ? await Promise.all([serverPlaces(), serverEvents(), serverNews(100), getNewsFeedSafe(6000)]).then(([places, events, articles, feed]) =>
        searchAll(q, { places, events, articles, headlines: feed?.items || [] })
      )
    : null;

  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="max-w-[860px] w-full mx-auto px-4 md:px-6 py-8 md:py-12 flex-1">
        <h1 className="font-display text-3xl md:text-4xl font-extrabold text-brand-ink m-0 mb-4">Rechercher</h1>
        <SearchBox initial={q} />

        {!hasQuery && <p className="text-brand-muted mt-4">Tape au moins 2 lettres : un nom de lieu, un plat, une commune, un sujet d’actualité…</p>}
        {r && r.total === 0 && (
          <p className="text-brand-muted mt-6">
            Aucun résultat pour « {q} ». Essaie un autre mot, ou explore <Link href="/communes" className="text-brand-blue-deep font-semibold">les 24 communes</Link>.
          </p>
        )}
        {r && r.total > 0 && <p className="text-sm text-brand-muted mt-4 mb-0">{r.total} résultat{r.total > 1 ? 's' : ''} pour « {q} »</p>}

        {r && (
          <>
            <Group title="Communes" count={r.communes.length}>
              {r.communes.map((c) => (
                <li key={c}><Link href={communeHref(c)} className={row}><span className="font-bold text-brand-ink">{c}</span> <span className="text-sm text-brand-muted">· guide de la commune</span></Link></li>
              ))}
            </Group>
            <Group title="Adresses" count={r.places.length}>
              {r.places.map((p) => {
                const cat = categoryOf(p.vertical);
                return (
                  <li key={p.id}>
                    <Link href={communeHref(p.commune)} className={row}>
                      <span className="block text-xs font-bold" style={{ color: cat.color }}>{cat.label} · {p.commune}</span>
                      <span className="block font-bold text-brand-ink">{p.name}</span>
                      {p.description && <span className="block text-sm text-brand-muted line-clamp-2">{p.description}</span>}
                    </Link>
                  </li>
                );
              })}
            </Group>
            <Group title="À la une" count={r.articles.length}>
              {r.articles.map((a) => (
                <li key={a.id}>
                  <Link href={`/actualite/article/${a.id}`} className={row}>
                    <span className="block text-xs font-bold text-brand-red">Kinshasa Label · {frDate(a.published_date)}</span>
                    <span className="block font-bold text-brand-ink">{a.title}</span>
                  </Link>
                </li>
              ))}
            </Group>
            <Group title="Sorties à venir" count={r.events.length}>
              {r.events.map((e) => (
                <li key={e.id}>
                  <Link href="/weekend" className={row}>
                    <span className="block text-xs font-bold text-[#7B3FE4]">{frDate(e.event_date)} · {e.commune}</span>
                    <span className="block font-bold text-brand-ink">{e.title}</span>
                  </Link>
                </li>
              ))}
            </Group>
            <Group title="Kin Actualité (médias)" count={r.headlines.length}>
              {r.headlines.map((h) => (
                <li key={h.id}>
                  <a href={h.link} target="_blank" rel="noopener noreferrer" className={row}>
                    <span className="block text-xs font-bold text-brand-blue-deep">{h.sourceName}</span>
                    <span className="block font-bold text-brand-ink">{h.title} ↗</span>
                  </a>
                </li>
              ))}
            </Group>
          </>
        )}
        <p className="mt-10 text-sm text-brand-muted">
          Parcourir aussi : {Object.entries(CATEGORY_PATH).filter(([, v]) => v !== '/traffic').map(([k, v], i) => (
            <span key={k}>{i ? ' · ' : ''}<Link href={v} className="text-brand-blue-deep font-semibold no-underline">{categoryOf(k).label}</Link></span>
          ))}
        </p>
      </div>
      <SiteFooter />
    </main>
  );
}
