// Place detail sheet: opens over the page when a card or map pin is
// clicked (bottom sheet on phones, centered dialog on desktop).
// Reviews live in <PlaceReviews> (shared with the place page). Since
// 2026-11-10 every place also has its own page (/lieu/<id>-<slug>), linked
// from here with « Voir la page ».
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { categoryOf, getAverageRating } from '../lib/categories';
import { PlaceImage, CategoryIcon, Stars } from './PlaceCard';
import { PlaceReviews } from './PlaceReviews';
import { PlaceTracker } from './PlaceTracker';
import { Button } from './Button';
import { communeHref } from '../lib/communes';
import { placeHref, directionsHref, telHref, whatsappHref } from '../lib/places';
import { IconClose, IconStar, IconPin, IconExternalLink, IconArrowRight, IconPhone } from './icons';

export function PlaceSheet({
  place,
  onClose,
  onUpdated,
}: {
  place: any | null;
  onClose: () => void;
  onUpdated?: (place: any) => void;
}) {
  const [current, setCurrent] = useState<any | null>(place);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setCurrent(place);
    if (!place) return;
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [place, onClose]);

  if (!place || !current) return null;

  const cat = categoryOf(current.vertical);
  const directions = directionsHref(current);
  const phoneHref = telHref(current.phone);
  const wa = whatsappHref(current);
  const avg = getAverageRating(current);

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center" role="dialog" aria-modal="true" aria-label={current.name}>
      <button type="button" aria-label="Fermer" onClick={onClose} className="absolute inset-0 bg-brand-ink/50 backdrop-blur-[2px] cursor-default" />

      <div className="relative w-full md:max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl md:rounded-3xl shadow-lift animate-pop-in">
        <div className="relative aspect-[16/9] md:aspect-[2/1]">
          <PlaceImage src={current.image_url} alt={current.name} vertical={current.vertical} className="w-full h-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="absolute top-3 right-3 w-11 h-11 rounded-full bg-white/95 text-brand-ink inline-flex items-center justify-center shadow cursor-pointer hover:bg-white"
          >
            <IconClose size={18} />
          </button>
          <div className="absolute left-5 right-5 bottom-4 text-white">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/95" style={{ color: cat.color }}>
              <CategoryIcon id={current.vertical} size={12} /> {cat.label}{current.place_type ? ` · ${current.place_type}` : ''}
            </span>
            <h2 className="font-display text-2xl md:text-3xl font-extrabold mt-2 mb-0 leading-tight drop-shadow">{current.name}</h2>
          </div>
        </div>

        <div className="p-5 md:p-6 flex flex-col gap-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold text-brand-muted">
            <span className="inline-flex items-center gap-1"><IconPin size={14} /> {current.commune}</span>
            {current.address && <span>{current.address}</span>}
            {current.budget && <span className="text-brand-ink">{current.budget}</span>}
            <span className="inline-flex items-center gap-1.5 text-brand-ink">
              <Stars value={avg ?? 0} size={15} />
              {avg !== null ? <><strong>{avg.toFixed(1)}</strong> · {current.rating_count} avis</> : 'Pas encore noté'}
            </span>
            {current.google_rating != null && (
              <span className="inline-flex items-center gap-1 text-brand-muted" title="Note relevée sur Google, indicative">
                Google <strong className="text-brand-ink">{Number(current.google_rating).toFixed(1).replace('.', ',')}</strong>
                <IconStar size={12} filled className="text-brand-yellow" />
                {current.google_reviews ? <>({current.google_reviews})</> : null}
              </span>
            )}
          </div>

          {current.description && <p className="text-base text-brand-ink/80 leading-relaxed m-0">{current.description}</p>}

          <div className="flex flex-wrap gap-2">
            <Link
              href={placeHref(current)}
              className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-brand-ink text-white font-bold no-underline"
            >
              Voir la page <IconArrowRight size={14} />
            </Link>
            {wa && (
              <Button href={wa} target="_blank" rel="noopener noreferrer" variant="secondary" data-track="whatsapp" data-place={current.id}>
                WhatsApp
              </Button>
            )}
            {phoneHref && (
              <Button href={phoneHref} variant="secondary" data-track="call" data-place={current.id}>
                <IconPhone size={14} /> {current.phone}
              </Button>
            )}
            {directions && (
              <Button href={directions} target="_blank" rel="noopener noreferrer" variant="secondary" data-track="directions" data-place={current.id}>
                <IconExternalLink size={14} /> Itinéraire
              </Button>
            )}
            <Button href={communeHref(current.commune || 'Gombe')} variant="ghost">
              Guide de {current.commune} <IconArrowRight size={14} />
            </Button>
          </div>

          <PlaceTracker placeId={current.id} />
          <PlaceReviews place={current} onUpdated={(u) => { setCurrent(u); onUpdated?.(u); }} />
        </div>
      </div>
    </div>
  );
}
