// Place detail sheet: opens over the page when a card or map pin is
// clicked (bottom sheet on phones, centered dialog on desktop).
//
// Reviews (2026-10-04): ONE form — 1-5 stars (required) + optional name +
// optional comment — sent through the `submit_review` database function,
// which enforces the anti-spam limits server-side (see
// supabase/reviews-moderation.sql). The browser also remembers places
// already reviewed (localStorage `kin_rated_places`) to avoid accidental
// repeats. Hidden reviews (Backoffice → Avis) are never returned to visitors.
// Until that SQL is applied, it falls back to the previous rating/comment
// writes so nothing breaks in between.
'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { categoryOf, getAverageRating } from '../lib/categories';
import { PlaceImage, CategoryIcon, Stars } from './PlaceCard';
import { Button } from './Button';
import { IconClose, IconStar, IconPin, IconExternalLink, IconUser, IconArrowRight } from './icons';

const RATED_KEY = 'kin_rated_places';
const RATING_WORDS = ['', 'Bof', 'Correct', 'Bien', 'Très bien', 'Top !'];

function readRated(): number[] {
  try {
    return JSON.parse(localStorage.getItem(RATED_KEY) || '[]');
  } catch {
    return [];
  }
}

const missingFn = (e: any) => /could not find the function|PGRST202|does not exist/i.test(`${e?.message} ${e?.code}`);

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
  const [rated, setRated] = useState<number[]>([]);
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [author, setAuthor] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [reviews, setReviews] = useState<any[] | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setCurrent(place);
    setStars(0);
    setHover(0);
    setText('');
    setError('');
    setDone(false);
    setReviews(null);
    if (!place) return;
    setRated(readRated());
    closeRef.current?.focus();

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);

    (async () => {
      const first = await supabase
        .from('comments')
        .select('id, author_name, comment_text, rating, created_at')
        .eq('place_id', place.id)
        .order('created_at', { ascending: false })
        .limit(50);
      let rows: any[] | null = first.data;
      if (first.error) {
        // before the reviews SQL: no `rating` column yet
        const fb = await supabase.from('comments').select('id, author_name, comment_text, created_at').eq('place_id', place.id).order('created_at', { ascending: false }).limit(50);
        rows = fb.data;
      }
      setReviews((rows || []).filter((r: any) => r.comment_text));
    })();

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [place, onClose]);

  if (!place || !current) return null;

  const cat = categoryOf(current.vertical);
  const avg = getAverageRating(current);
  const alreadyReviewed = rated.includes(current.id);
  const shown = hover || stars;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stars) {
      setError('Choisissez une note de 1 à 5 étoiles.');
      return;
    }
    setSending(true);
    setError('');
    const name = author.trim() || 'Kinois';
    const body = text.trim();
    let { error: err } = await supabase.rpc('submit_review', { p_place_id: current.id, p_rating: stars, p_author: name, p_text: body || null });
    if (err && missingFn(err)) {
      // Fallback until supabase/reviews-moderation.sql is applied.
      const r = await supabase.rpc('rate_place', { p_place_id: current.id, p_value: stars });
      if (r.error) await supabase.from('places').update({ rating_sum: (current.rating_sum || 0) + stars, rating_count: (current.rating_count || 0) + 1 }).eq('id', current.id);
      err = body ? (await supabase.from('comments').insert([{ place_id: current.id, author_name: name, comment_text: body }])).error : null;
    }
    setSending(false);
    if (err) {
      setError(err.message || 'Envoi impossible pour le moment. Réessayez plus tard.');
      return;
    }
    const updated = { ...current, rating_sum: (current.rating_sum || 0) + stars, rating_count: (current.rating_count || 0) + 1 };
    setCurrent(updated);
    onUpdated?.(updated);
    const ids = [...rated, current.id];
    setRated(ids);
    try {
      localStorage.setItem(RATED_KEY, JSON.stringify(ids));
    } catch {
      /* ignore */
    }
    if (body) setReviews((prev) => [{ id: `new-${Date.now()}`, author_name: name, comment_text: body, rating: stars, created_at: new Date().toISOString() }, ...(prev || [])]);
    setDone(true);
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
            className="absolute top-3 right-3 w-11 h-11 rounded-full bg-white/95 text-brand-ink inline-flex items-center justify-center shadow cursor-pointer hover:bg-white"
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

        <div className="p-5 md:p-6 flex flex-col gap-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold text-brand-muted">
            <span className="inline-flex items-center gap-1"><IconPin size={14} /> {current.commune}</span>
            {current.address && <span>{current.address}</span>}
            {current.budget && <span className="text-brand-ink">{current.budget}</span>}
            <span className="inline-flex items-center gap-1.5 text-brand-ink">
              <Stars value={avg ?? 0} size={15} />
              {avg !== null ? <><strong>{avg.toFixed(1)}</strong> · {current.rating_count} avis</> : 'Pas encore noté'}
            </span>
          </div>

          {current.description && <p className="text-base text-brand-ink/80 leading-relaxed m-0">{current.description}</p>}

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

          {/* REVIEW FORM */}
          <div className="rounded-3xl bg-brand-yellow-soft border border-brand-yellow/60 p-4 md:p-5">
            {done || alreadyReviewed ? (
              <p className="m-0 text-base font-bold text-brand-ink">
                {done ? 'Merci pour votre avis ! 🙌' : 'Vous avez déjà donné votre avis sur ce lieu. Merci !'}
              </p>
            ) : (
              <form onSubmit={submit} className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="m-0 font-display text-lg font-extrabold text-brand-ink">Donnez votre avis</p>
                  <div className="flex items-center gap-1.5">
                    <div className="inline-flex" role="radiogroup" aria-label="Votre note" onMouseLeave={() => setHover(0)}>
                      {[1, 2, 3, 4, 5].map((v) => (
                        <button
                          key={v}
                          type="button"
                          role="radio"
                          aria-checked={v === stars}
                          aria-label={`${v} étoile${v > 1 ? 's' : ''}`}
                          onMouseEnter={() => setHover(v)}
                          onClick={() => {
                            setStars(v);
                            setError('');
                          }}
                          className="p-1 cursor-pointer hover:scale-125 transition-transform"
                        >
                          <IconStar size={30} filled={v <= shown} className={v <= shown ? 'text-brand-yellow drop-shadow-sm' : 'text-brand-line'} />
                        </button>
                      ))}
                    </div>
                    <span className="text-sm font-bold text-brand-ink w-[70px]">{RATING_WORDS[shown]}</span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <label className="sr-only" htmlFor="rv-name">Votre prénom</label>
                  <input
                    id="rv-name"
                    type="text"
                    maxLength={60}
                    placeholder="Votre prénom (facultatif)"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="sm:w-48 h-11 bg-white border border-brand-line text-brand-ink px-3 rounded-xl text-[15px] placeholder:text-brand-muted focus:outline-none focus:border-brand-blue"
                  />
                </div>
                <label className="sr-only" htmlFor="rv-text">Votre avis</label>
                <textarea
                  id="rv-text"
                  rows={3}
                  maxLength={1000}
                  placeholder="Votre expérience (facultatif) : accueil, ambiance, prix…"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full bg-white border border-brand-line text-brand-ink px-3 py-2.5 rounded-xl text-[15px] placeholder:text-brand-muted focus:outline-none focus:border-brand-blue resize-y"
                />
                {error && <p className="m-0 text-sm font-semibold text-brand-red-dark">{error}</p>}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-[11px] text-brand-muted">Votre avis est public. Restez courtois : l’équipe peut retirer les messages inappropriés.</span>
                  <Button type="submit" variant="primary" disabled={sending}>
                    {sending ? 'Envoi…' : 'Publier mon avis'}
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* REVIEWS LIST */}
          <div className="border-t border-brand-line pt-5">
            <h3 className="font-display text-lg font-bold text-brand-ink m-0 mb-3">
              Avis des Kinois {reviews && reviews.length > 0 ? `(${reviews.length})` : ''}
            </h3>
            {reviews === null ? (
              <p className="text-sm text-brand-muted m-0">Chargement…</p>
            ) : reviews.length === 0 ? (
              <p className="text-sm text-brand-muted m-0">Aucun avis écrit pour l’instant.</p>
            ) : (
              <ul className="list-none p-0 m-0 flex flex-col gap-2">
                {reviews.map((c) => (
                  <li key={c.id} className="bg-brand-bg rounded-xl px-3.5 py-2.5">
                    <div className="flex justify-between items-center gap-2 text-xs font-bold text-brand-blue-deep">
                      <span className="inline-flex items-center gap-1.5">
                        <IconUser size={12} /> {c.author_name || 'Visiteur'}
                        {c.rating ? <Stars value={c.rating} size={11} /> : null}
                      </span>
                      <span className="text-brand-muted font-semibold">{new Date(c.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <p className="text-sm text-brand-ink/85 mt-1 mb-0 whitespace-pre-line">{c.comment_text}</p>
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
