// Reviews for one place: the 1-5 star form and the list of written reviews.
// Used in the place pop-up (PlaceSheet) and on the place's own page
// (/lieu/[id]). Moved out of PlaceSheet on 2026-11-10, logic unchanged.
//
// ONE form — 1-5 stars (required) + optional name + optional comment — sent
// through the `submit_review` database function, which enforces the anti-spam
// limits server-side (see supabase/reviews-moderation.sql). The browser also
// remembers places already reviewed (localStorage `kin_rated_places`).
// Hidden reviews (Backoffice → Avis) are never returned to visitors.
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Stars } from './PlaceCard';
import { Button } from './Button';
import { IconStar, IconUser } from './icons';

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

// The database's anti-spam messages are written with "vous"; the site says "tu".
function tuMessage(m?: string) {
  if (!m) return m;
  return m
    .replace("Vous avez déjà donné votre avis sur ce lieu aujourd'hui. Merci !", 'Tu as déjà donné ton avis sur ce lieu aujourd’hui. Merci !')
    .replace("Trop d'avis envoyés en peu de temps. Réessayez plus tard.", 'Trop d’avis envoyés en peu de temps. Réessaie plus tard.');
}

export function PlaceReviews({ place, onUpdated }: { place: any; onUpdated?: (place: any) => void }) {
  const [current, setCurrent] = useState<any>(place);
  const [rated, setRated] = useState<number[]>([]);
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [author, setAuthor] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [reviews, setReviews] = useState<any[] | null>(null);

  useEffect(() => {
    setCurrent(place);
    setStars(0);
    setHover(0);
    setText('');
    setError('');
    setDone(false);
    setReviews(null);
    setRated(readRated());
    let cancelled = false;
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
      if (!cancelled) setReviews((rows || []).filter((r: any) => r.comment_text));
    })();
    return () => {
      cancelled = true;
    };
  }, [place]);

  const alreadyReviewed = rated.includes(current.id);
  const shown = hover || stars;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stars) {
      setError('Choisis une note de 1 à 5 étoiles.');
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
      setError(tuMessage(err.message) || 'Envoi impossible pour le moment. Réessaie plus tard.');
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
    <>
          {/* REVIEW FORM */}
          <div className="rounded-3xl bg-brand-yellow-soft border border-brand-yellow/60 p-4 md:p-5">
            {done || alreadyReviewed ? (
              <p className="m-0 text-base font-bold text-brand-ink">
                {done ? 'Merci pour ton avis ! 🙌' : 'Tu as déjà donné ton avis sur ce lieu. Merci !'}
              </p>
            ) : (
              <form onSubmit={submit} className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="m-0 font-display text-lg font-extrabold text-brand-ink">Donne ton avis</p>
                  <div className="flex items-center gap-1.5">
                    <div className="inline-flex" role="radiogroup" aria-label="Ta note" onMouseLeave={() => setHover(0)}>
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
                  <label className="sr-only" htmlFor="rv-name">Ton prénom</label>
                  <input
                    id="rv-name"
                    type="text"
                    maxLength={60}
                    placeholder="Ton prénom (facultatif)"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="sm:w-48 h-11 bg-white border border-brand-line text-brand-ink px-3 rounded-xl text-[15px] placeholder:text-brand-muted focus:outline-none focus:border-brand-blue"
                  />
                </div>
                <label className="sr-only" htmlFor="rv-text">Ton avis</label>
                <textarea
                  id="rv-text"
                  rows={3}
                  maxLength={1000}
                  placeholder="Ton expérience (facultatif) : accueil, ambiance, prix…"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full bg-white border border-brand-line text-brand-ink px-3 py-2.5 rounded-xl text-[15px] placeholder:text-brand-muted focus:outline-none focus:border-brand-blue resize-y"
                />
                {error && <p className="m-0 text-sm font-semibold text-brand-red-dark">{error}</p>}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-[11px] text-brand-muted">Ton avis est public. Reste courtois : l’équipe peut retirer les messages inappropriés.</span>
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
    </>
  );
}
