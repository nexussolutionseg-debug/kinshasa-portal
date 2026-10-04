// Kin Actualité building blocks: a data hook that merges the live feed
// (/api/actualite) with the team's own editorial posts (the `news` table,
// managed in the backoffice, formerly "Kin News" — now "À la une"), plus
// the news card, the scrolling headline ticker and the USD/CDF widget.
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { type NewsItem, timeAgo } from '../lib/news';
import { withUtm } from '../lib/utm';
import { loadSiteSettings } from '../lib/siteSettings';
import { IconExternalLink, IconPin, IconMoney, IconNews, IconClose } from './icons';
import { LiveDot } from './SiteHeader';

export type SourceStatus = { id: string; name: string; site: string; color: string; ok: boolean; count: number };

export function editorialToItem(row: any): NewsItem {
  return {
    id: `editorial:${row.id}`,
    title: row.title,
    link: withUtm(row.link_url, 'a_la_une'),
    teaser: (row.body || '').slice(0, 180),
    body: row.body || null,
    date: row.published_date ? new Date(row.published_date).toISOString() : null,
    image: null,
    sourceId: 'kinshasa-label',
    sourceName: 'Kinshasa Label',
    commune: row.commune || null,
    pinned: true,
  };
}

export function useKinNews(commune?: string | null) {
  const [live, setLive] = useState<NewsItem[] | null>(null);
  const [pinned, setPinned] = useState<NewsItem[]>([]);
  const [sources, setSources] = useState<SourceStatus[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/actualite')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => {
        if (cancelled) return;
        setLive(d.items || []);
        setSources(d.sources || []);
        setUpdatedAt(d.updatedAt || null);
      })
      .catch(() => !cancelled && setLive([]));

    // The team's own articles only show when switched on in Backoffice →
    // Vitrine → Sections de l'accueil → "Afficher nos articles À la une".
    loadSiteSettings().then((settings) => {
      if (cancelled || !settings.showEditorial) return;
      supabase
        .from('news')
        .select('*')
        .order('published_date', { ascending: false })
        .limit(12)
        .then(({ data }) => !cancelled && setPinned((data || []).map(editorialToItem)));
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const byCommune = (list: NewsItem[]) =>
    commune ? list.filter((n) => (n.commune || '').toLowerCase() === commune.toLowerCase()) : list;

  return {
    loading: live === null,
    live: byCommune(live || []),
    pinned: byCommune(pinned),
    sources,
    updatedAt,
  };
}

const SOURCE_TINTS = ['#0E5FC9', '#D21C2E', '#B98A00', '#0A2A66', '#7B3FE4', '#E8590C'];
function tintFor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return SOURCE_TINTS[h % SOURCE_TINTS.length];
}

function NewsImage({ item, className, tint }: { item: NewsItem; className: string; tint: string }) {
  const [ok, setOk] = useState(true);
  if (item.image && ok)
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={item.image} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setOk(false)} className={`object-cover ${className}`} />
    );
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{ background: item.pinned ? 'linear-gradient(135deg,#FFE36B,#F5B400)' : `linear-gradient(135deg, ${tint}, #0A2A66)` }}
    >
      {item.pinned ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/logo.svg" alt="" aria-hidden="true" className="w-24 md:w-36 rounded-full bg-white p-2 shadow-lift" />
      ) : (
        <span className="font-display font-extrabold text-xl px-4 text-center text-white/90">{item.sourceName}</span>
      )}
    </div>
  );
}

function fullDate(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
}

// Detail view for one news item, on our site: photo, source, date & time,
// author, commune, categories, the publisher's own summary, and a clear
// button to the full article on the source site (plus WhatsApp share).
// We never republish the article body — the full text stays at the source.
export function NewsSheet({ item, onClose }: { item: NewsItem | null; onClose: () => void }) {
  useEffect(() => {
    if (!item) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [item, onClose]);
  if (!item) return null;
  const tint = tintFor(item.sourceName);
  const external = /^https?:/.test(item.link);
  const share = `https://wa.me/?text=${encodeURIComponent(`${item.title} — via Kinshasa Label\n${item.link}`)}`;
  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center" role="dialog" aria-modal="true" aria-label={item.title}>
      <button type="button" aria-label="Fermer" onClick={onClose} className="absolute inset-0 bg-brand-ink/55 backdrop-blur-[2px] cursor-default" />
      <article className="relative w-full md:max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl md:rounded-3xl shadow-lift animate-pop-in">
        <div className="relative aspect-[16/9]">
          <NewsImage item={item} tint={tint} className="w-full h-full" />
          <button type="button" onClick={onClose} aria-label="Fermer" className="absolute top-3 right-3 w-11 h-11 rounded-full bg-white/95 text-brand-ink inline-flex items-center justify-center shadow cursor-pointer">
            <IconClose size={18} />
          </button>
          <span className="absolute left-4 bottom-4 inline-flex items-center gap-1.5 bg-white/95 text-xs font-extrabold uppercase tracking-wide px-3 py-1.5 rounded-full" style={{ color: item.pinned ? '#0B2545' : tint }}>
            {item.pinned ? 'À la une · Kinshasa Label' : item.sourceName}
          </span>
        </div>
        <div className="p-5 md:p-7 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-brand-muted font-semibold">
            <span className="first-letter:uppercase">{fullDate(item.date)}</span>
            {item.author && <span>· par {item.author}</span>}
            {item.commune && (
              <span className="inline-flex items-center gap-1 text-brand-blue-deep">
                <IconPin size={13} /> {item.commune}
              </span>
            )}
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-extrabold text-brand-ink leading-tight mt-2 mb-3">{item.title}</h2>
          {item.categories && item.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {item.categories.map((c) => (
                <span key={c} className="text-xs font-bold bg-brand-bg text-brand-ink/70 px-2.5 py-1 rounded-full">{c}</span>
              ))}
            </div>
          )}
          <p className="text-base text-brand-ink/80 leading-relaxed m-0 whitespace-pre-line">{item.pinned && item.body ? item.body : item.summary || item.teaser}</p>

          <div className="flex flex-col sm:flex-row gap-2.5 mt-6">
            {external && (
              <a href={item.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-brand-red text-white font-bold no-underline hover:bg-brand-red-dark">
                Lire l’article complet sur {item.pinned ? 'la source' : item.sourceName} <IconExternalLink size={15} />
              </a>
            )}
            {external && (
              <a href={share} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-full border-2 border-brand-line text-brand-ink font-bold no-underline hover:border-[#25D366]">
                Partager sur WhatsApp
              </a>
            )}
          </div>
          {!item.pinned && (
            <p className="text-xs text-brand-muted mt-4 mb-0">
              Résumé et photo fournis par {item.sourceName}. L’article complet et tous les droits appartiennent à son éditeur.
            </p>
          )}
        </div>
      </article>
    </div>
  );
}

export function NewsCard({ item, variant = 'card' }: { item: NewsItem; variant?: 'card' | 'row' | 'feature' }) {
  const [open, setOpen] = useState(false);
  const tint = tintFor(item.sourceName);
  const clickable = !!item.link || !!item.body || !!item.summary;

  const meta = (
    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide flex-wrap">
      {item.pinned ? (
        <span className="bg-brand-yellow text-brand-ink px-2 py-0.5 rounded-full">À la une</span>
      ) : (
        <span style={{ color: tint }}>{item.sourceName}</span>
      )}
      <span className="text-brand-muted font-semibold normal-case tracking-normal">{timeAgo(item.date)}</span>
      {item.commune && (
        <span className="inline-flex items-center gap-0.5 text-brand-blue-deep normal-case tracking-normal">
          <IconPin size={11} /> {item.commune}
        </span>
      )}
    </div>
  );

  const sheet = open ? <NewsSheet item={item} onClose={() => setOpen(false)} /> : null;
  const btnProps = clickable
    ? { type: 'button' as const, onClick: () => setOpen(true), 'aria-label': `${item.title} — ${item.pinned ? 'Kinshasa Label' : item.sourceName}, voir le détail` }
    : {};
  const Wrapper: any = clickable ? 'button' : 'div';

  if (variant === 'row') {
    return (
      <>
        <Wrapper {...btnProps} className="group w-full text-left flex gap-3 py-3 border-b border-brand-line last:border-0 cursor-pointer bg-transparent">
          <div className="min-w-0 flex-1">
            {meta}
            <p className="text-sm font-bold text-brand-ink leading-snug mt-1 mb-0 group-hover:text-brand-blue-deep line-clamp-2">{item.title}</p>
            {clickable && <span className="inline-flex items-center gap-1 mt-1.5 text-xs font-bold text-brand-blue-deep group-hover:underline">Lire la suite →</span>}
          </div>
          {item.image && <NewsImage item={item} tint={tint} className="w-20 h-16 rounded-xl shrink-0" />}
        </Wrapper>
        {sheet}
      </>
    );
  }

  const feature = variant === 'feature';
  return (
    <>
      <Wrapper
        {...btnProps}
        className={`group w-full text-left h-full flex flex-col bg-white rounded-2xl overflow-hidden border border-brand-line shadow-card cursor-pointer ${
          clickable ? 'hover:shadow-lift hover:-translate-y-1' : ''
        } transition-all duration-200`}
      >
        <div className={`relative overflow-hidden w-full ${feature ? 'aspect-[16/9] lg:aspect-auto lg:flex-1 lg:min-h-[260px]' : 'aspect-[16/9] shrink-0'}`}>
          <NewsImage item={item} tint={tint} className="w-full h-full group-hover:scale-105 transition-transform duration-500" />
        </div>
        <div className={`p-4 flex flex-col gap-1.5 w-full ${feature ? 'md:p-6' : 'flex-1'}`}>
          {meta}
          <h3 className={`font-display font-bold text-brand-ink leading-snug m-0 group-hover:text-brand-blue-deep ${feature ? 'text-xl md:text-2xl' : 'text-base line-clamp-3'}`}>
            {item.title}
          </h3>
          {(item.teaser || item.body) && <p className="text-sm text-brand-muted leading-relaxed m-0 line-clamp-2">{item.pinned && item.body ? item.body : item.teaser}</p>}
          {clickable && (
            <span className="mt-auto pt-3">
              <span className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-brand-blue-soft text-brand-blue-deep text-sm font-bold group-hover:bg-brand-blue group-hover:text-white transition-colors">
                Lire la suite →
              </span>
            </span>
          )}
        </div>
      </Wrapper>
      {sheet}
    </>
  );
}

export function NewsTicker({ items }: { items: NewsItem[] }) {
  if (items.length === 0) return null;
  const list = items.slice(0, 10);
  return (
    <div className="bg-brand-ink text-white">
      <div className="max-w-[1400px] mx-auto flex items-stretch">
        <Link href="/actualite" className="shrink-0 inline-flex items-center gap-2 bg-brand-red px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider no-underline text-white">
          <span className="relative inline-flex w-2 h-2"><span className="absolute inset-0 rounded-full bg-white animate-live-dot" /></span>
          Kin Actu
        </Link>
        <div className="relative flex-1 overflow-hidden group">
          <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused]">
            {[0, 1].map((dup) => (
              <ul key={dup} className="flex list-none m-0 p-0" aria-hidden={dup === 1}>
                {list.map((n) => (
                  <li key={`${dup}-${n.id}`} className="flex items-center">
                    <a
                      href={n.link || '/actualite'}
                      target={/^https?:/.test(n.link) ? '_blank' : undefined}
                      rel="noopener noreferrer"
                      tabIndex={dup === 1 ? -1 : undefined}
                      className="px-5 py-2.5 text-sm text-white/90 no-underline hover:text-brand-yellow whitespace-nowrap"
                    >
                      <span className="text-brand-yellow font-bold mr-2">{n.pinned ? 'À la une' : n.sourceName}</span>
                      {n.title}
                    </a>
                    <span className="text-white/30" aria-hidden="true">●</span>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ExchangeRateCard() {
  const [rate, setRate] = useState<{ ok: boolean; usdCdf?: number; eurCdf?: number | null; updatedAt?: string } | null>(null);
  useEffect(() => {
    fetch('/api/taux')
      .then((r) => r.json())
      .then(setRate)
      .catch(() => setRate({ ok: false }));
  }, []);
  const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });

  return (
    <div className="rounded-2xl p-5 text-brand-ink border border-brand-yellow/70 bg-brand-yellow-soft">
      <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-brand-yellow-deep">
        <IconMoney size={16} /> Taux du jour
      </div>
      {rate === null ? (
        <div className="h-16 mt-3 rounded-xl bg-white/60 animate-pulse" />
      ) : rate.ok && rate.usdCdf ? (
        <>
          <p className="font-display text-3xl font-extrabold m-0 mt-2">
            1 $ = {fmt(rate.usdCdf)} <span className="text-lg">FC</span>
          </p>
          {rate.eurCdf && <p className="text-sm font-semibold text-brand-ink/70 m-0 mt-0.5">1 € = {fmt(rate.eurCdf)} FC</p>}
          <p className="text-[11px] text-brand-muted m-0 mt-2 leading-relaxed">
            Taux de référence indicatif.{' '}
            <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer" className="underline text-brand-muted">
              Rates by Exchange Rate API
            </a>
            {' · '}
            <a href="https://www.mataf.net/fr/conversion/monnaie-USD-CDF" target="_blank" rel="noopener noreferrer" className="underline text-brand-blue-deep font-semibold">
              Convertisseur Mataf
            </a>
          </p>
        </>
      ) : (
        <p className="text-sm m-0 mt-2">
          Taux indisponible pour le moment —{' '}
          <a href="https://www.mataf.net/fr/conversion/monnaie-USD-CDF" target="_blank" rel="noopener noreferrer" className="underline font-semibold">
            voir sur Mataf
          </a>
          .
        </p>
      )}
    </div>
  );
}

export function NewsEmpty({ loading }: { loading: boolean }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-brand-line p-8 text-center text-brand-muted">
      <IconNews size={28} className="mx-auto mb-2 text-brand-blue" />
      {loading ? 'Chargement des dernières infos…' : 'Pas encore d’actualité sur Kinshasa pour le moment — revenez dans quelques minutes.'}
    </div>
  );
}

export { LiveDot };
