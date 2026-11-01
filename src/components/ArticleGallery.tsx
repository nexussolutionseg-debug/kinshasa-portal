// « À la une » article photos (2026-11-01): cover at the top, the other
// photos as a grid under the text; tapping any photo opens it full screen
// (swipe or arrow keys to browse, Échap or ✕ to close).
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export function ArticleCover({ images, title }: { images: string[]; title: string }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!images.length) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(0)} className="block w-full p-0 border-0 bg-transparent cursor-zoom-in mb-6" aria-label="Agrandir la photo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[0]} alt={title} className="w-full max-h-[460px] object-cover rounded-3xl border border-brand-line block" />
      </button>
      {open != null && <Lightbox images={images} start={open} title={title} onClose={() => setOpen(null)} />}
    </>
  );
}

export function ArticleGallery({ images, title }: { images: string[]; title: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const rest = images.slice(1);
  if (!rest.length) return null;
  return (
    <section className="mt-8" aria-label="Galerie photos">
      <h2 className="font-display text-xl font-extrabold text-brand-ink m-0 mb-3">Photos <span className="text-brand-muted text-base font-bold">({images.length})</span></h2>
      <ul className="list-none m-0 p-0 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {rest.map((src, i) => (
          <li key={src}>
            <button type="button" onClick={() => setOpen(i + 1)} className="block w-full p-0 border-0 bg-transparent cursor-zoom-in" aria-label={`Agrandir la photo ${i + 2}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`${title} — photo ${i + 2}`} loading="lazy" className="w-full aspect-[4/3] object-cover rounded-2xl border border-brand-line block hover:opacity-90" />
            </button>
          </li>
        ))}
      </ul>
      {open != null && <Lightbox images={images} start={open} title={title} onClose={() => setOpen(null)} />}
    </section>
  );
}

function Lightbox({ images, start, title, onClose }: { images: string[]; start: number; title: string; onClose: () => void }) {
  const [i, setI] = useState(start);
  const touch = useRef<number | null>(null);
  const go = useCallback((d: number) => setI((x) => (x + d + images.length) % images.length), [images.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [go, onClose]);

  const nav = 'absolute top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/15 hover:bg-white/30 text-white text-2xl border-0 cursor-pointer';
  return (
    <div role="dialog" aria-modal="true" aria-label={`Photos — ${title}`} className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center"
      onClick={onClose}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touch.current == null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        touch.current = null;
      }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={images[i]} alt={`${title} — photo ${i + 1}`} className="max-w-[94vw] max-h-[84vh] object-contain rounded-xl" onClick={(e) => e.stopPropagation()} />
      <button type="button" onClick={onClose} aria-label="Fermer" className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white text-xl border-0 cursor-pointer">✕</button>
      {images.length > 1 && (
        <>
          <button type="button" onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Photo précédente" className={`${nav} left-3`}>‹</button>
          <button type="button" onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Photo suivante" className={`${nav} right-3`}>›</button>
          <p className="absolute bottom-5 inset-x-0 text-center text-white/80 text-sm m-0">{i + 1} / {images.length}</p>
        </>
      )}
    </div>
  );
}
