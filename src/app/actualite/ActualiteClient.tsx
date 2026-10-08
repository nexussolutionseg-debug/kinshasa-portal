'use client';
// Kin Actualité — the main news page (client decision 2026-10-04: the old
// editorial "Kin News" merges in here as "À la une", and Kin Actualité is
// the name everywhere). Live items come from /api/actualite (Kinshasa-only
// RSS aggregation, refreshed every 15 min); "À la une" from the backoffice.
import { TimeAgo } from '../../components/TimeAgo';
import { useMemo, useState } from 'react';
import { SiteHeader } from '../../components/SiteHeader';
import { SiteTicker } from '../../components/SiteTicker';
import { SiteFooter } from '../../components/SiteFooter';
import { SpinningWheel } from '../../components/BrandMark';
import { useKinNews, NewsCard, ExchangeRateCard, NewsEmpty, LiveDot, type InitialNews } from '../../components/KinNews';
import type { Rate } from '../../lib/rates';
import { IconPin, IconExternalLink } from '../../components/icons';


const PAGE = 12;

export function ActualiteClient({ initialNews, initialRate }: { initialNews: InitialNews; initialRate: Rate | null }) {
  const news = useKinNews(undefined, initialNews);
  const [commune, setCommune] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);

  const communes = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const n of [...news.pinned, ...news.live]) if (n.commune) counts[n.commune] = (counts[n.commune] || 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [news.pinned, news.live]);

  const filteredLive = news.live.filter(
    (n) => (!commune || n.commune === commune) && (!source || n.sourceId === source)
  );
  const filteredPinned = source ? [] : news.pinned.filter((n) => !commune || n.commune === commune);

  const chip = (active: boolean) =>
    `shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-bold border-2 transition-colors cursor-pointer ${
      active ? 'bg-brand-ink text-white border-brand-ink' : 'bg-white text-brand-ink border-brand-line hover:border-brand-blue'
    }`;

  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader below={<SiteTicker />} />

      {/* HERO */}
      <section className="relative overflow-hidden text-white" style={{ background: 'linear-gradient(120deg,#A60E1D 0%,#D21C2E 55%,#F04A3A 100%)' }}>
        <span className="absolute -right-24 -top-28 opacity-30 pointer-events-none">
          <SpinningWheel size={420} />
        </span>
        <div className="relative max-w-[1400px] mx-auto px-4 md:px-6 py-10 md:py-14">
          <span className="inline-flex items-center gap-2 bg-white text-brand-red text-xs font-extrabold uppercase tracking-wider px-3 py-1.5 rounded-full">
            <LiveDot /> En direct
          </span>
          <h1 className="font-display text-4xl md:text-6xl font-extrabold m-0 mt-3 tracking-tight">Kin Actualité</h1>
          <p className="text-base md:text-lg text-white/90 m-0 mt-2 max-w-2xl">
            L’info de Kinshasa réunie depuis les médias congolais, plus les sujets de la rédaction Kinshasa Label.
            {news.updatedAt && <> Mis à jour <TimeAgo iso={news.updatedAt} />.</>}
          </p>
        </div>
      </section>

      <div className="max-w-[1400px] w-full mx-auto px-4 md:px-6 py-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] pb-16">
        <div className="min-w-0 flex flex-col gap-8">
          {/* FILTERS */}
          <div className="flex flex-col gap-3">
            {communes.length > 0 && (
              <div className="rail flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0" aria-label="Filtrer par commune">
                <button type="button" className={chip(!commune)} onClick={() => setCommune(null)}>
                  Tout Kinshasa
                </button>
                {communes.map(([c, n]) => (
                  <button key={c} type="button" className={chip(commune === c)} onClick={() => setCommune(commune === c ? null : c)}>
                    <IconPin size={13} /> {c} <span className="opacity-60">{n}</span>
                  </button>
                ))}
              </div>
            )}
            {news.sources.length > 0 && (
              <div className="rail flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0" aria-label="Filtrer par média">
                <button type="button" className={chip(!source)} onClick={() => setSource(null)}>
                  Tous les médias
                </button>
                {news.sources
                  .filter((s) => s.count > 0)
                  .map((s) => (
                    <button key={s.id} type="button" className={chip(source === s.id)} onClick={() => setSource(source === s.id ? null : s.id)}>
                      <span className="w-2 h-2 rounded-full" style={{ background: s.color }} /> {s.name}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* À LA UNE */}
          {filteredPinned.length > 0 && (
            <section>
              <h2 className="font-display text-2xl font-extrabold text-brand-ink m-0 mb-4">
                <span className="bg-brand-yellow px-2 rounded-lg">À la une</span> par la rédaction
              </h2>
              <div className="grid grid-cols-1 gap-5 [&>*]:min-w-0 sm:grid-cols-2">
                {filteredPinned.slice(0, 4).map((n) => (
                  <NewsCard key={n.id} item={n} />
                ))}
              </div>
            </section>
          )}

          {/* LIVE */}
          <section>
            <h2 className="font-display text-2xl font-extrabold text-brand-ink m-0 mb-4 inline-flex items-center gap-2">
              <LiveDot /> Dernières infos {commune ? `· ${commune}` : ''}
            </h2>
            {filteredLive.length === 0 ? (
              <NewsEmpty loading={news.loading} />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-5 [&>*]:min-w-0 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredLive.slice(0, shown).map((n, i) => (
                    <div key={n.id} className={i === 0 && !commune && !source ? 'sm:col-span-2' : ''}>
                      <NewsCard item={n} variant={i === 0 && !commune && !source ? 'feature' : 'card'} />
                    </div>
                  ))}
                </div>
                {filteredLive.length > shown && (
                  <div className="flex justify-center mt-6">
                    <button
                      type="button"
                      onClick={() => setShown((s) => s + PAGE)}
                      className="bg-brand-ink text-white font-bold px-6 py-3 rounded-full cursor-pointer hover:bg-brand-blue-deep"
                    >
                      Plus d’infos
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>

        {/* SIDEBAR */}
        <aside className="flex flex-col gap-5 lg:sticky lg:top-24 self-start w-full">
          <ExchangeRateCard initial={initialRate} />
          <div className="bg-white rounded-2xl border border-brand-line shadow-card p-5">
            <h3 className="font-display text-lg font-extrabold text-brand-ink m-0">Nos sources</h3>
            <p className="text-xs text-brand-muted m-0 mt-1 leading-relaxed">
              Nous affichons uniquement le titre et un court extrait : chaque article s’ouvre sur le site du média. Seules les infos qui
              concernent Kinshasa et ses communes sont retenues.
            </p>
            <ul className="list-none p-0 m-0 mt-3">
              {(news.sources.length ? news.sources : []).map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 py-2 border-b border-brand-line last:border-0">
                  <a href={s.site} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-ink no-underline hover:text-brand-blue-deep">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} /> {s.name} <IconExternalLink size={11} />
                  </a>
                  <span className={`text-[11px] font-bold ${s.ok ? 'text-brand-muted' : 'text-brand-red'}`}>
                    {s.ok ? `${s.count} info${s.count > 1 ? 's' : ''}` : 'indisponible'}
                  </span>
                </li>
              ))}
              {news.sources.length === 0 && <li className="text-sm text-brand-muted py-2">Chargement…</li>}
            </ul>
          </div>
        </aside>
      </div>

      <SiteFooter />
    </main>
  );
}
