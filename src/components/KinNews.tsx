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
import { IconExternalLink, IconPin, IconMoney, IconNews } from './icons';
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

    supabase
      .from('news')
      .select('*')
      .order('published_date', { ascending: false })
      .limit(12)
      .then(({ data }) => !cancelled && setPinned((data || []).map(editorialToItem)));

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

export function NewsCard({ item, variant = 'card' }: { item: NewsItem; variant?: 'card' | 'row' | 'feature' }) {
  const [imgOk, setImgOk] = useState(true);
  const tint = tintFor(item.sourceName);
  const hasLink = !!item.link;
  const Wrapper: any = hasLink ? 'a' : 'div';
  const wrapperProps = hasLink
    ? { href: item.link, target: /^https?:/.test(item.link) ? '_blank' : undefined, rel: 'noopener noreferrer' }
    : {};

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

  if (variant === 'row') {
    return (
      <Wrapper {...wrapperProps} className="group flex gap-3 py-3 no-underline border-b border-brand-line last:border-0">
        <div className="min-w-0 flex-1">
          {meta}
          <p className="text-sm font-bold text-brand-ink leading-snug mt-1 mb-0 group-hover:text-brand-blue-deep line-clamp-2">{item.title}</p>
        </div>
        {item.image && imgOk && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt="" loading="lazy" onError={() => setImgOk(false)} className="w-20 h-16 rounded-xl object-cover shrink-0" />
        )}
      </Wrapper>
    );
  }

  const feature = variant === 'feature';
  return (
    <Wrapper
      {...wrapperProps}
      className={`group h-full flex flex-col bg-white rounded-2xl overflow-hidden border border-brand-line shadow-card no-underline ${
        hasLink ? 'hover:shadow-lift hover:-translate-y-1' : ''
      } transition-all duration-200`}
    >
      <div className={`relative overflow-hidden ${feature ? 'aspect-[16/9] lg:aspect-auto lg:flex-1 lg:min-h-[260px]' : 'aspect-[16/9] shrink-0'}`}>
        {item.image && imgOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt="" loading="lazy" onError={() => setImgOk(false)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: item.pinned ? 'linear-gradient(135deg,#FFE36B,#F5B400)' : `linear-gradient(135deg, ${tint}, #0A2A66)` }}
          >
            {item.pinned ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/logo.svg" alt="" aria-hidden="true" className="w-28 md:w-40 rounded-full bg-white p-2 shadow-lift" />
            ) : (
              <span className="font-display font-extrabold text-xl px-4 text-center text-white/90">{item.sourceName}</span>
            )}
          </div>
        )}
      </div>
      <div className={`p-4 flex flex-col gap-1.5 ${feature ? 'md:p-6' : 'flex-1'}`}>
        {meta}
        <h3 className={`font-display font-bold text-brand-ink leading-snug m-0 group-hover:text-brand-blue-deep ${feature ? 'text-xl md:text-2xl' : 'text-base line-clamp-3'}`}>
          {item.title}
        </h3>
        {item.pinned && item.body ? (
          <p className="text-sm text-brand-ink/75 leading-relaxed m-0 whitespace-pre-line">{item.body}</p>
        ) : (
          item.teaser && <p className="text-sm text-brand-muted leading-relaxed m-0 line-clamp-2">{item.teaser}</p>
        )}
        {hasLink && /^https?:/.test(item.link) && (
          <span className="mt-auto pt-2 inline-flex items-center gap-1 text-xs font-bold text-brand-blue-deep">
            Lire sur {item.pinned ? 'la source' : item.sourceName} <IconExternalLink size={11} />
          </span>
        )}
      </div>
    </Wrapper>
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
