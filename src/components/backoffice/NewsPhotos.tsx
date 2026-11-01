// Backoffice → À la une → photos of one article (2026-11-01).
// Several photos (up to MAX), added in one go from the phone or computer,
// reordered with the arrows, removed one by one. The first photo is the
// cover (cards, share previews, top of the article); the others form the
// gallery under the text.
'use client';

import { useState } from 'react';
import { uploadImage } from '../../lib/upload';

export const MAX_NEWS_PHOTOS = 12;

export function NewsPhotos({ value, onChange, onError, onBusy }: {
  value: string[];
  onChange: (next: string[]) => void;
  onError: (msg: string) => void;
  onBusy: (busy: boolean) => void;
}) {
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_NEWS_PHOTOS - value.length;
    const list = Array.from(files).slice(0, Math.max(0, room));
    if (files.length > room) onError(`Maximum ${MAX_NEWS_PHOTOS} photos par article : ${files.length - list.length} photo(s) ignorée(s).`);
    if (!list.length) return;
    setUploading({ done: 0, total: list.length });
    onBusy(true);
    let next = [...value];
    for (const [i, f] of list.entries()) {
      try {
        next = [...next, await uploadImage(f, 'news', 1600)];
        onChange(next);
      } catch (err: any) {
        onError(`Échec de l’envoi de « ${f.name} » : ${err?.message || err}`);
      }
      setUploading({ done: i + 1, total: list.length });
    }
    setUploading(null);
    onBusy(false);
  };

  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const makeCover = (i: number) => onChange([value[i], ...value.filter((_, k) => k !== i)]);
  const remove = (i: number) => onChange(value.filter((_, k) => k !== i));

  const btn = 'w-8 h-8 inline-flex items-center justify-center rounded-full bg-white/95 text-brand-ink text-sm font-bold border border-brand-line cursor-pointer disabled:opacity-30';

  return (
    <div>
      {value.length > 0 && (
        <ul className="list-none m-0 p-0 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-3">
          {value.map((src, i) => (
            <li key={src} className={`relative rounded-xl overflow-hidden border-2 ${i === 0 ? 'border-brand-yellow' : 'border-brand-line'} bg-brand-bg`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Photo ${i + 1}`} className="w-full aspect-[4/3] object-cover block" />
              <span className={`absolute left-2 top-2 text-[11px] font-extrabold px-2 py-0.5 rounded-full ${i === 0 ? 'bg-brand-yellow text-brand-ink' : 'bg-white/90 text-brand-ink'}`}>
                {i === 0 ? 'Couverture' : i + 1}
              </span>
              <div className="absolute inset-x-0 bottom-0 p-1.5 flex items-center gap-1 bg-gradient-to-t from-black/50 to-transparent">
                <button type="button" className={btn} onClick={() => move(i, -1)} disabled={i === 0} aria-label="Déplacer à gauche">←</button>
                <button type="button" className={btn} onClick={() => move(i, 1)} disabled={i === value.length - 1} aria-label="Déplacer à droite">→</button>
                {i > 0 && (
                  <button type="button" className="h-8 px-2 rounded-full bg-white/95 text-brand-ink text-[11px] font-bold border border-brand-line cursor-pointer" onClick={() => makeCover(i)}>
                    Couverture
                  </button>
                )}
                <button type="button" className={`${btn} ml-auto text-brand-red-dark`} onClick={() => remove(i)} aria-label={`Retirer la photo ${i + 1}`}>✕</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {value.length < MAX_NEWS_PHOTOS && (
        <label className="w-full box-border min-h-11 px-3 py-2.5 bg-brand-bg border-2 border-dashed border-brand-line rounded-xl flex items-center justify-center gap-2 cursor-pointer text-brand-blue-deep font-semibold text-sm hover:border-brand-blue">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            disabled={!!uploading}
            onChange={(e) => { const f = e.target.files; add(f).finally(() => { e.target.value = ''; }); }}
          />
          {uploading
            ? `Envoi des photos… ${uploading.done}/${uploading.total}`
            : value.length ? `+ Ajouter d’autres photos (${value.length}/${MAX_NEWS_PHOTOS})` : '+ Ajouter des photos (tu peux en choisir plusieurs)'}
        </label>
      )}
      <p className="text-[11px] text-brand-muted mt-1.5 mb-0">
        La 1<sup>re</sup> photo est la couverture (cartes, partage WhatsApp, haut de l’article) ; les autres s’affichent en galerie sous le texte.
        Format paysage conseillé, réduites automatiquement pour charger vite.
      </p>
    </div>
  );
}
