// Horizontal rail ("carousel") used for every row of cards on the site.
// Native scrolling with snap points: swipe on phones, trackpad/shift-wheel
// on desktop, plus round arrow buttons that appear on hover (desktop only)
// and disable themselves at either end. Keyboard users can tab through the
// cards inside; the arrows are real <button>s with labels.
'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { IconChevronLeft, IconChevronRight, IconArrowRight } from './icons';

type Props = {
  id?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  seeAllHref?: string;
  seeAllLabel?: string;
  children: ReactNode;
  /** Tailwind width classes applied to each slide wrapper. */
  itemClassName?: string;
  className?: string;
};

export function Carousel({
  id,
  title,
  subtitle,
  eyebrow,
  seeAllHref,
  seeAllLabel = 'Tout voir',
  children,
  itemClassName = 'w-[78%] sm:w-[44%] md:w-[31%] lg:w-[23.5%]',
  className = '',
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [update, children]);

  const scrollBy = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  const items = Array.isArray(children) ? children.flat() : [children];

  return (
    <section id={id} className={`group/rail relative ${className}`}>
      <div className="flex items-end justify-between gap-4 mb-4">
        <div className="min-w-0">
          {eyebrow && <div className="mb-1">{eyebrow}</div>}
          <h2 className="font-display text-2xl md:text-3xl font-extrabold text-brand-ink tracking-tight m-0">{title}</h2>
          {subtitle && <p className="text-sm md:text-base text-brand-muted mt-1 m-0">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {seeAllHref && (
            <Link
              href={seeAllHref}
              className="hidden sm:inline-flex items-center gap-1 text-sm font-bold text-brand-blue-deep no-underline hover:text-brand-blue"
            >
              {seeAllLabel} <IconArrowRight size={14} />
            </Link>
          )}
          <div className="hidden md:flex gap-2">
            <button
              type="button"
              aria-label="Précédent"
              onClick={() => scrollBy(-1)}
              disabled={atStart}
              className="w-10 h-10 rounded-full bg-white border border-brand-line shadow-card inline-flex items-center justify-center text-brand-ink hover:bg-brand-blue hover:text-white hover:border-brand-blue transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              <IconChevronLeft size={18} />
            </button>
            <button
              type="button"
              aria-label="Suivant"
              onClick={() => scrollBy(1)}
              disabled={atEnd}
              className="w-10 h-10 rounded-full bg-white border border-brand-line shadow-card inline-flex items-center justify-center text-brand-ink hover:bg-brand-blue hover:text-white hover:border-brand-blue transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              <IconChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <div ref={ref} className="rail flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 md:mx-0 md:px-0 scroll-px-4 md:scroll-px-0">
        {items.map((child, i) => (
          <div key={i} className={`shrink-0 ${itemClassName}`}>
            {child}
          </div>
        ))}
      </div>

      {seeAllHref && (
        <Link
          href={seeAllHref}
          className="sm:hidden mt-1 inline-flex items-center gap-1 text-sm font-bold text-brand-blue-deep no-underline"
        >
          {seeAllLabel} <IconArrowRight size={14} />
        </Link>
      )}
    </section>
  );
}
