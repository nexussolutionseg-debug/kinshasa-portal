// Image-first place card used in every carousel, plus the illustrated
// fallback art shown whenever a place has no photo (or its photo fails to
// load) — a category gradient with a big icon, so nothing looks broken.
'use client';

import { useState } from 'react';
import { categoryOf, getAverageRating } from '../lib/categories';
import {
  IconStar, IconFork, IconPin, IconMask, IconShirt, IconShield, IconCar, IconCalendar, IconNews,
} from './icons';

export function CategoryIcon({ id, size = 18, className = '' }: { id?: string | null; size?: number; className?: string }) {
  const props = { size, className };
  switch (id) {
    case 'kin_food': return <IconFork {...props} />;
    case 'kin_culture': return <IconMask {...props} />;
    case 'kin_style': return <IconShirt {...props} />;
    case 'kin_securite': return <IconShield {...props} />;
    case 'kin_traffic': return <IconCar {...props} />;
    case 'kin_weekend': return <IconCalendar {...props} />;
    case 'kin_actualite': return <IconNews {...props} />;
    default: return <IconPin {...props} />;
  }
}

export function PlaceArt({ vertical, className = '' }: { vertical?: string | null; className?: string }) {
  const cat = categoryOf(vertical);
  return (
    <div className={`relative overflow-hidden flex items-center justify-center ${className}`} style={{ background: cat.gradient }}>
      {/* soft wheel rings in the corner, echoing the logo */}
      <svg className="absolute -right-10 -bottom-10 w-44 h-44 opacity-25" viewBox="-50 -50 100 100" aria-hidden="true">
        <circle r="40" fill="none" stroke="#fff" strokeWidth="3" />
        <circle r="30" fill="none" stroke="#fff" strokeWidth="2" />
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return <line key={i} x1="0" y1="0" x2={Math.cos(a) * 30} y2={Math.sin(a) * 30} stroke="#fff" strokeWidth="1.5" />;
        })}
      </svg>
      <span className="relative w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm inline-flex items-center justify-center text-white">
        <CategoryIcon id={vertical} size={32} />
      </span>
    </div>
  );
}

export function Stars({ value, size = 13 }: { value: number; size?: number }) {
  const filled = Math.round(value);
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((v) => (
        <IconStar key={v} size={size} filled={v <= filled} className={v <= filled ? 'text-brand-yellow' : 'text-brand-line'} />
      ))}
    </span>
  );
}

export function PlaceImage({ src, alt, vertical, className = '' }: { src?: string | null; alt: string; vertical?: string | null; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <PlaceArt vertical={vertical} className={className} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={`object-cover ${className}`} />
  );
}

export function PlaceCard({ place, onOpen, badge }: { place: any; onOpen: (place: any) => void; badge?: string }) {
  const cat = categoryOf(place.vertical);
  const avg = getAverageRating(place);

  return (
    <button
      type="button"
      onClick={() => onOpen(place)}
      className="group w-full text-left bg-white rounded-2xl overflow-hidden border border-brand-line shadow-card hover:shadow-lift hover:-translate-y-1 transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/40"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <PlaceImage
          src={place.image_url}
          alt={place.name}
          vertical={place.vertical}
          className="w-full h-full group-hover:scale-105 transition-transform duration-500"
        />
        <span
          className="absolute top-3 left-3 inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/95 shadow-sm"
          style={{ color: cat.color }}
        >
          <CategoryIcon id={place.vertical} size={12} /> {cat.label}
        </span>
        {badge && (
          <span className="absolute top-3 right-3 text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-brand-yellow text-brand-ink shadow-sm">
            {badge}
          </span>
        )}
        {avg !== null && (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 text-xs font-extrabold px-2 py-1 rounded-full bg-brand-ink/80 text-white">
            <IconStar size={12} filled className="text-brand-yellow" /> {avg.toFixed(1)}
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between gap-2 text-xs font-semibold text-brand-muted">
          <span className="inline-flex items-center gap-1 truncate">
            <IconPin size={12} /> {place.commune}
          </span>
          {place.budget && <span className="shrink-0 text-brand-ink/70">{place.budget}</span>}
        </div>
        <h3 className="font-display text-lg font-bold text-brand-ink leading-snug mt-1 mb-1 line-clamp-1">{place.name}</h3>
        <p className="text-sm text-brand-muted leading-relaxed m-0 line-clamp-2 min-h-[2.75rem]">{place.description}</p>
        <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-brand-muted">
          <Stars value={avg ?? 0} />
          <span>{avg !== null ? `${place.rating_count} avis` : 'Soyez le premier à noter'}</span>
        </div>
      </div>
    </button>
  );
}
