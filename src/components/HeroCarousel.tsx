// Homepage header banner carousel.
//
// Slides = every ACTIVE banner from the backoffice ("Bannière" tab), in
// order, followed by built-in brand slides (Explore / Kin Actualité live /
// Kin Weekend), so the hero is never empty even with zero banners set.
// Banner images are never cropped (long-standing client rule): the image
// is shown whole with `object-contain`, over a blurred, zoomed copy of
// itself so any letterbox area is filled with matching color instead of
// a flat bar.
//
// Autoplays every 7s, pauses on hover/focus and when the tab is hidden,
// never autoplays for visitors who ask for reduced motion. Swipe on touch,
// arrows + dots on desktop, all real buttons with labels.
'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { IconChevronLeft, IconChevronRight, IconArrowRight, IconDice, IconMap, IconExternalLink } from './icons';
import { SpinningWheel } from './BrandMark';
import { LiveDot } from './SiteHeader';
import type { NewsItem } from '../lib/news';
import { timeAgo } from '../lib/news';

type Banner = { id: number | string; image_url?: string | null; message?: string | null; link_url?: string | null; link_label?: string | null };

type Slide = { key: string; render: () => ReactNode; dark: boolean };

export function HeroCarousel({
  banners,
  headlines,
  weekendCount,
  onSurprise,
}: {
  banners: Banner[];
  headlines: NewsItem[];
  weekendCount: number;
  onSurprise: () => void;
}) {
  const slides: Slide[] = [
    ...banners
      .filter((b) => b.image_url || b.message)
      .map<Slide>((b) => ({
        key: `banner-${b.id}`,
        dark: true,
        render: () => <BannerSlide banner={b} />,
      })),
    { key: 'explore', dark: true, render: () => <ExploreSlide onSurprise={onSurprise} /> },
    { key: 'actu', dark: true, render: () => <ActuSlide headlines={headlines} /> },
    { key: 'weekend', dark: false, render: () => <WeekendSlide count={weekendCount} /> },
  ];

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;
  const touchX = useRef<number | null>(null);

  const go = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);

  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || paused || count < 2) return;
    const t = window.setInterval(() => {
      if (document.visibilityState === 'visible') setIndex((i) => (i + 1) % count);
    }, 7000);
    return () => window.clearInterval(t);
  }, [paused, count]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="À la une"
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
        touchX.current = null;
      }}
    >
      <div className="relative overflow-hidden rounded-[28px] shadow-lift">
        <div
          className="flex transition-transform duration-700 ease-[cubic-bezier(.2,.8,.2,1)]"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((s, i) => (
            <div
              key={s.key}
              className="w-full shrink-0 min-h-[560px] sm:min-h-[480px] md:min-h-[460px] relative"
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} sur ${count}`}
              aria-hidden={i !== index}
              // keep off-screen slides out of the tab order
              {...(i !== index ? { inert: '' as unknown as boolean } : {})}
            >
              {s.render()}
            </div>
          ))}
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              aria-label="Diapositive précédente"
              onClick={() => go(index - 1)}
              className="hidden md:inline-flex absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 text-brand-ink items-center justify-center shadow hover:bg-white cursor-pointer"
            >
              <IconChevronLeft size={20} />
            </button>
            <button
              type="button"
              aria-label="Diapositive suivante"
              onClick={() => go(index + 1)}
              className="hidden md:inline-flex absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 text-brand-ink items-center justify-center shadow hover:bg-white cursor-pointer"
            >
              <IconChevronRight size={20} />
            </button>
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
              {slides.map((s, i) => (
                <button
                  key={s.key}
                  type="button"
                  aria-label={`Aller à la diapositive ${i + 1}`}
                  aria-current={i === index}
                  onClick={() => go(i)}
                  className={`h-2.5 rounded-full transition-all cursor-pointer ${
                    i === index ? 'w-8 bg-brand-yellow' : `w-2.5 ${slides[index].dark ? 'bg-white/60' : 'bg-brand-ink/30'}`
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------

function BannerSlide({ banner }: { banner: Banner }) {
  const isExternal = banner.link_url && /^https?:\/\//.test(banner.link_url);
  return (
    <div className="absolute inset-0 bg-brand-navy">
      {banner.image_url && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={banner.image_url} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-60" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={banner.image_url} alt={banner.message || 'Bannière'} className="absolute inset-0 w-full h-full object-contain" />
        </>
      )}
      {(banner.message || banner.link_url) && (
        <div className="absolute left-0 right-0 bottom-0 p-5 pb-12 md:p-8 md:pb-14 bg-gradient-to-t from-black/70 to-transparent flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          {banner.message && (
            <p className="font-display text-xl md:text-3xl font-bold text-white m-0 max-w-2xl drop-shadow">{banner.message}</p>
          )}
          {banner.link_url && (
            <a
              href={banner.link_url}
              target={isExternal ? '_blank' : undefined}
              rel={isExternal ? 'noopener noreferrer' : undefined}
              className="self-start md:self-auto shrink-0 inline-flex items-center gap-1.5 bg-brand-yellow text-brand-ink font-bold text-sm px-5 py-2.5 rounded-full no-underline hover:bg-white"
            >
              {banner.link_label || 'En savoir plus'} {isExternal ? <IconExternalLink size={13} /> : <IconArrowRight size={14} />}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function ExploreSlide({ onSurprise }: { onSurprise: () => void }) {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: 'linear-gradient(120deg,#0A2A66 0%,#0E5FC9 45%,#1A82F5 100%)' }}>
      <div className="absolute -right-36 -bottom-36 opacity-25 md:opacity-90 md:bottom-auto md:right-[-60px] md:top-[-40px] pointer-events-none">
        <SpinningWheel size={520} className="w-[320px] h-[320px] md:w-[520px] md:h-[520px]" />
      </div>
      <div className="absolute right-6 md:right-20 bottom-10 md:bottom-12 hidden sm:block pointer-events-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="" aria-hidden="true" className="w-48 md:w-72 drop-shadow-[0_20px_40px_rgba(0,0,0,0.35)] rounded-full bg-white p-3" />
      </div>
      <div className="relative h-full flex flex-col justify-center gap-5 px-6 md:px-14 pt-10 pb-16 md:py-12 max-w-2xl">
        <span className="self-start inline-flex items-center gap-2 bg-white/15 text-white text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full">
          <span className="bg-brand-yellow text-brand-ink px-1.5 rounded">#001</span> Tu connais Kin ?
        </span>
        <h1 className="font-display text-[34px] sm:text-5xl md:text-6xl font-extrabold text-white leading-[1.05] tracking-tight m-0">
          Le meilleur de Kinshasa, <span className="text-brand-yellow">commune par commune.</span>
        </h1>
        <p className="text-base md:text-lg text-white/85 m-0 max-w-lg">
          Restos, sorties, culture et bons plans — notés par les Kinois, sur une carte interactive.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/#explorer" className="inline-flex items-center gap-2 bg-brand-yellow text-brand-ink font-extrabold px-6 py-3.5 rounded-full no-underline hover:bg-white transition-colors">
            <IconMap size={18} /> Explorer la carte
          </Link>
          <button
            type="button"
            onClick={onSurprise}
            className="inline-flex items-center gap-2 bg-white/10 text-white border-2 border-white/60 font-extrabold px-6 py-3 rounded-full hover:bg-white hover:text-brand-blue-deep transition-colors cursor-pointer"
          >
            <IconDice size={18} /> Surprends-moi
          </button>
        </div>
      </div>
    </div>
  );
}

function ActuSlide({ headlines }: { headlines: NewsItem[] }) {
  const top = headlines.slice(0, 3);
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: 'linear-gradient(120deg,#A60E1D 0%,#D21C2E 55%,#F04A3A 100%)' }}>
      <div className="absolute -left-32 -bottom-40 opacity-20 md:opacity-30 pointer-events-none">
        <SpinningWheel size={460} spin={false} />
      </div>
      <div className="relative h-full grid md:grid-cols-[1fr_1.1fr] gap-6 items-center px-6 md:px-14 pt-10 pb-16 md:py-12">
        <div className="flex flex-col gap-4">
          <span className="self-start inline-flex items-center gap-2 bg-white text-brand-red text-xs font-extrabold uppercase tracking-wider px-3 py-1.5 rounded-full">
            <LiveDot /> En direct
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-extrabold text-white leading-[1.05] m-0">
            Kin Actualité
          </h2>
          <p className="text-base md:text-lg text-white/90 m-0">
            Toute l’info de Kinshasa, réunie depuis les médias congolais — mise à jour en continu.
          </p>
          <Link href="/actualite" className="self-start inline-flex items-center gap-2 bg-white text-brand-red font-extrabold px-6 py-3.5 rounded-full no-underline hover:bg-brand-yellow hover:text-brand-ink transition-colors">
            Lire l’actu <IconArrowRight size={16} />
          </Link>
        </div>
        <ul className="hidden md:flex list-none p-0 m-0 flex-col gap-3">
          {top.length === 0
            ? [0, 1, 2].map((i) => <li key={i} className="h-[76px] rounded-2xl bg-white/15 animate-pulse" />)
            : top.map((n) => (
                <li key={n.id}>
                  <a
                    href={n.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-white rounded-2xl px-4 py-3 no-underline shadow hover:-translate-y-0.5 transition-transform"
                  >
                    <span className="text-[11px] font-bold uppercase tracking-wide text-brand-red">
                      {n.sourceName} · {timeAgo(n.date)}
                    </span>
                    <span className="block text-sm font-bold text-brand-ink leading-snug mt-0.5 line-clamp-2">{n.title}</span>
                  </a>
                </li>
              ))}
        </ul>
      </div>
    </div>
  );
}

function WeekendSlide({ count }: { count: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: 'linear-gradient(120deg,#FFE36B 0%,#FCD933 50%,#F5B400 100%)' }}>
      <div className="absolute -right-32 -bottom-32 md:bottom-auto md:right-[-80px] md:top-[-80px] opacity-30 md:opacity-70 pointer-events-none">
        <SpinningWheel size={440} className="w-[300px] h-[300px] md:w-[440px] md:h-[440px]" />
      </div>
      <div className="relative h-full flex flex-col justify-center gap-4 px-6 md:px-14 pt-10 pb-16 md:py-12 max-w-2xl">
        <span className="self-start bg-brand-ink text-brand-yellow text-xs font-extrabold uppercase tracking-wider px-3 py-1.5 rounded-full">
          Kin Weekend
        </span>
        <h2 className="font-display text-4xl md:text-6xl font-extrabold text-brand-ink leading-[1.02] m-0">
          On sort où <span className="text-brand-red">ce weekend ?</span>
        </h2>
        <p className="text-base md:text-lg text-brand-ink/80 m-0">
          {count > 0 ? `${count} sortie${count > 1 ? 's' : ''} au programme : concerts, expos, soirées et plus.` : 'Concerts, expos, soirées : le programme des sorties à Kinshasa.'}
        </p>
        <Link href="/#kin-weekend" className="self-start inline-flex items-center gap-2 bg-brand-ink text-white font-extrabold px-6 py-3.5 rounded-full no-underline hover:bg-brand-red transition-colors">
          Voir les sorties <IconArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
