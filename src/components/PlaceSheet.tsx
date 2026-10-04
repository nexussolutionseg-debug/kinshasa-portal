// Place detail sheet: opens over the page when a card or map pin is
// clicked (bottom sheet on phones, centered dialog on desktop). Holds the
// 1-5 star rating and the comments thread that used to sit inline in the
// homepage listing — same Supabase writes, same one-rating-per-browser
// guard (localStorage `kin_rated_places`), just a much calmer layout.
'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { categoryOf, getAverageRating } from '../lib/categories';
import { PlaceImage, CategoryIcon } from './PlaceCard';
import { Button } from './Button';
import { IconClose, IconStar, IconPin, IconExternalLink, IconUser, IconArrowRight } from './icons';

const RATED_KEY = 'kin_rated_places';

function readRated(): number[] {
  try {
    return JSON.parse(localStorage.getItem(RATED_KEY) || '[]');
  } catch {
    return [];
  }
}

const RATING_WORDS = ['', 'Bof', 'Correct', 'Bien', 'Très bien', 'Top !'];

export function PlaceSheet({
  place,
  onClose,
  onUpdated,
}: {
  place: any | null;
  onClose: () => void;
  onUpdated?: (place: any) => void;
}) {
  const [rated, setRated] = useState<number[]>([]);
  const [hover, setHover] = useState(0);
  const [justRated, setJustRated] = useState(0);
  const [current, setCurrent] = useState<any | null>(place);
  const [comments, setComments] = useState<any[] | null>(null);
  const [author, setAuthor] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setCurrent(place);
    setJustRated(0);
    setHover(0);
    setComments(null);
    if (!place) return;
    setRated(readRated());
    closeRef.current?.focus();

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);

    supabase
      .from('comments')
      .select('*')
      .eq('place_id', place.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setComments(data || []));

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [place, onClose]);

  if (!place || !current) return null;

  const cat = categoryOf(current.vertical);
  const avg = getAverageRating(current);
  const alreadyRated = rated.includes(current.id);
  const shownStars = hover || justRated || (avg !== null ? Math.round(avg) : 0);

  const rate = async (value: number) => {
    if (alreadyRated) return;
    const updated = {
      ...current,
      rating_sum: (current.rating_sum || 0) + value,
      rating_count: (current.rating_count || 0) + 1,
    };
    const ids = [...rated, current.id];
    setCurrent(updated);
    setRated(ids);
    setJustRated(value);
    onUpdated?.(updated);
    try {
      localStorage.setItem(RATED_KEY, JSON.stringify(ids));
      await supabase.from('places').update({ rating_sum: updated.rating_sum, rating_count: updated.rating_count }).eq('id', current.id);
    } catch (err) {
      console.error('Error updating rating:', err);
    }
  };

  const addComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert([{ place_id: current.id, author_name: author.trim() || 'Kinois', comment_text: text.trim() }])
        .select();
      if (!error && data) {
        setComments((prev) => [data[0], ...(prev || [])]);
        setText('');
      }
    } finally {
      setSending(false);
    }
  };

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
            className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/95 text-brand-ink inline-flex items-center justify-center shadow cursor-pointer hover:bg-white"
          >
            <IconClose size={18} />
          </button>
          <div className="absolute left-5 right-5 bottom-4 text-white">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/95" style={{ color: cat.color }}>
              <CategoryIcon id={current.vertical} size={12} /> {cat.label}
            </span>
            <h2 className="font-display text-2xl md:text-3xl font-extrabold mt-2 mb-0 leading-tight drop-shadow">{current.name}</h2>
          </div>
        </div>

        <div className="p-5 md:p-6 flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold text-brand-muted">
            <span className="inline-flex items-center gap-1"><IconPin size={14} /> {current.commune}</span>
            {current.address && <span>{current.address}</span>}
            {current.budget && <span className="text-brand-ink">{current.budget}</span>}
          </div>

          {current.description && <p className="text-base text-brand-ink/80 leading-relaxed m-0">{current.description}</p>}

          {/* Rating */}
          <div className="rounded-2xl bg-brand-yellow-soft border border-brand-yellow/60 p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide font-bold text-brand-yellow-deep m-0">
                {alreadyRated ? 'Merci pour votre note !' : 'Notez ce lieu'}
              </p>
              <p className="text-sm text-brand-ink m-0 mt-0.5">
                {avg !== null ? (
                  <><strong className="text-lg">{avg.toFixed(1)}</strong> / 5 · {current.rating_count} avis</>
                ) : (
                  'Personne ne l’a encore noté — soyez le premier.'
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex" role="radiogroup" aria-label="Noter ce lieu" onMouseLeave={() => setHover(0)}>
                {[1, 2, 3, 4, 5].map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={v === justRated}
                    aria-label={`${v} étoile${v > 1 ? 's' : ''}`}
                    disabled={alreadyRated}
                    onMouseEnter={() => !alreadyRated && setHover(v)}
                    onFocus={() => !alreadyRated && setHover(v)}
                    onClick={() => rate(v)}
                    className={`p-1 ${alreadyRated ? 'cursor-default' : 'cursor-pointer hover:scale-125'} transition-transform`}
                  >
                    <IconStar size={28} filled={v <= shownStars} className={v <= shownStars ? 'text-brand-yellow drop-shadow-sm' : 'text-brand-line'} />
                  </button>
                ))}
              </div>
              {!alreadyRated && hover > 0 && <span className="text-sm font-bold text-brand-ink w-20">{RATING_WORDS[hover]}</span>}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {current.google_maps_url && (
              <Button href={current.google_maps_url} target="_blank" rel="noopener noreferrer" variant="primary">
                <IconExternalLink size={14} /> Itinéraire Google Maps
              </Button>
            )}
            <Button href={`/commune/${encodeURIComponent(current.commune || 'Gombe')}`} variant="secondary">
              Guide de {current.commune} <IconArrowRight size={14} />
            </Button>
          </div>

          {/* Comments */}
          <div className="border-t border-brand-line pt-5">
            <h3 className="font-display text-lg font-bold text-brand-ink m-0 mb-3">
              Avis des Kinois {comments && comments.length > 0 ? `(${comments.length})` : ''}
            </h3>
            <form onSubmit={addComment} className="flex flex-col sm:flex-row gap-2 mb-4">
              <input
                type="text"
                placeholder="Votre prénom"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="sm:w-36 bg-brand-bg border border-brand-line text-brand-ink px-3 py-2.5 rounded-xl text-sm placeholder:text-brand-muted focus:outline-none focus:border-brand-blue"
              />
              <input
                type="text"
                placeholder="Votre avis sur ce lieu…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                required
                className="flex-1 bg-brand-bg border border-brand-line text-brand-ink px-3 py-2.5 rounded-xl text-sm placeholder:text-brand-muted focus:outline-none focus:border-brand-blue"
              />
              <Button type="submit" disabled={sending} variant="primary">
                {sending ? '…' : 'Publier'}
              </Button>
            </form>
            {comments === null ? (
              <p className="text-sm text-brand-muted m-0">Chargement…</p>
            ) : comments.length === 0 ? (
              <p className="text-sm text-brand-muted m-0">Aucun avis pour l’instant.</p>
            ) : (
              <ul className="list-none p-0 m-0 flex flex-col gap-2">
                {comments.map((c) => (
                  <li key={c.id} className="bg-brand-bg rounded-xl px-3.5 py-2.5">
                    <div className="flex justify-between text-xs font-bold text-brand-blue-deep">
                      <span className="inline-flex items-center gap-1"><IconUser size={12} /> {c.author_name || 'Visiteur'}</span>
                      <span className="text-brand-muted font-semibold">{new Date(c.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <p className="text-sm text-brand-ink/85 mt-1 mb-0">{c.comment_text}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
