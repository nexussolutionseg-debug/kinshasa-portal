// Backoffice → "Avis" (review moderation, 2026-10-04).
// Every review (stars + optional comment), newest first, with the place it
// belongs to. Hide = removed from the site but kept here (can be shown
// again). Delete = gone for good, and its stars are removed from the
// place's average (database trigger). Needs supabase/reviews-moderation.sql.
'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Stars } from '../PlaceCard';
import { IconSearch, IconTrash } from '../icons';

type Review = { id: number; place_id: number; author_name: string | null; comment_text: string | null; rating: number | null; hidden: boolean; created_at: string };

export function ReviewsPanel() {
  const [rows, setRows] = useState<Review[] | null>(null);
  const [places, setPlaces] = useState<Record<number, string>>({});
  const [filter, setFilter] = useState<'all' | 'text' | 'hidden' | 'low'>('all');
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState('');

  const load = async () => {
    const [{ data, error }, { data: pl }] = await Promise.all([
      supabase.from('comments').select('id, place_id, author_name, comment_text, rating, hidden, created_at').order('created_at', { ascending: false }).limit(500),
      supabase.from('places').select('id, name'),
    ]);
    if (error) {
      setMsg(/column|does not exist/i.test(error.message)
        ? "Exécutez d'abord le fichier SQL « reviews-moderation » dans Supabase (SQL Editor) pour activer la modération."
        : error.message);
      setRows([]);
      return;
    }
    setRows((data || []) as Review[]);
    setPlaces(Object.fromEntries((pl || []).map((p: any) => [p.id, p.name])));
  };
  useEffect(() => {
    load();
  }, []);

  const list = useMemo(() => {
    let r = rows || [];
    if (filter === 'text') r = r.filter((x) => x.comment_text);
    if (filter === 'hidden') r = r.filter((x) => x.hidden);
    if (filter === 'low') r = r.filter((x) => (x.rating ?? 5) <= 2);
    if (q) {
      const s = q.toLowerCase();
      r = r.filter((x) => `${x.author_name} ${x.comment_text} ${places[x.place_id] || ''}`.toLowerCase().includes(s));
    }
    return r;
  }, [rows, filter, q, places]);

  const toggleHidden = async (r: Review) => {
    const { error } = await supabase.from('comments').update({ hidden: !r.hidden }).eq('id', r.id);
    if (error) return setMsg(error.message);
    setRows((prev) => (prev || []).map((x) => (x.id === r.id ? { ...x, hidden: !r.hidden } : x)));
  };

  const remove = async (r: Review) => {
    if (!confirm('Supprimer définitivement cet avis ? Ses étoiles seront retirées de la note du lieu.')) return;
    const { error } = await supabase.from('comments').delete().eq('id', r.id);
    if (error) return setMsg(error.message);
    setRows((prev) => (prev || []).filter((x) => x.id !== r.id));
  };

  const week = (rows || []).filter((x) => Date.now() - Date.parse(x.created_at) < 7 * 864e5).length;

  return (
    <div className="bg-white rounded-3xl border border-brand-line p-5 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h2 className="font-display text-2xl font-extrabold text-brand-ink m-0">Avis des visiteurs</h2>
          <p className="text-sm text-brand-muted m-0 mt-1">
            {rows ? `${rows.length} avis au total · ${week} cette semaine` : 'Chargement…'} · « Masquer » retire un avis du site sans le supprimer.
          </p>
        </div>
      </div>
      {msg && <p className="text-sm bg-brand-yellow-soft rounded-xl px-3 py-2 mb-3">{msg}</p>}

      <div className="flex flex-col md:flex-row gap-2 mb-4">
        <div className="rail flex gap-2 overflow-x-auto">
          {([
            ['all', 'Tous'],
            ['text', 'Avec commentaire'],
            ['low', '1–2 étoiles'],
            ['hidden', 'Masqués'],
          ] as const).map(([id, l]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`shrink-0 h-10 px-4 rounded-full text-sm font-bold border-2 cursor-pointer ${filter === id ? 'bg-brand-ink text-white border-brand-ink' : 'bg-white border-brand-line text-brand-ink'}`}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="relative md:ml-auto md:w-72">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted"><IconSearch size={16} /></span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (lieu, nom, texte)…" className="w-full h-10 pl-9 pr-3 border border-brand-line rounded-full text-[15px] focus:outline-none focus:border-brand-blue" />
        </div>
      </div>

      {rows && list.length === 0 ? (
        <p className="text-sm text-brand-muted text-center py-8">Aucun avis dans cette vue.</p>
      ) : (
        <ul className="list-none p-0 m-0 flex flex-col gap-2">
          {list.map((r) => (
            <li key={r.id} className={`flex flex-col sm:flex-row sm:items-start gap-3 border rounded-2xl p-3.5 ${r.hidden ? 'border-dashed border-brand-line bg-brand-bg opacity-70' : 'border-brand-line'}`}>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <strong className="text-brand-ink">{places[r.place_id] || `Lieu #${r.place_id}`}</strong>
                  {r.rating ? <Stars value={r.rating} size={13} /> : null}
                  <span className="text-brand-muted">· {r.author_name || 'Visiteur'} · {new Date(r.created_at).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  {r.hidden && <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-brand-line text-brand-muted">Masqué</span>}
                </div>
                <p className="text-[15px] text-brand-ink/85 mt-1 mb-0 whitespace-pre-line break-words">
                  {r.comment_text || <span className="text-brand-muted italic">Note sans commentaire</span>}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button type="button" onClick={() => toggleHidden(r)} className="h-9 px-3 rounded-lg border border-brand-line text-sm font-bold hover:border-brand-blue cursor-pointer">
                  {r.hidden ? 'Afficher' : 'Masquer'}
                </button>
                <button type="button" onClick={() => remove(r)} aria-label="Supprimer" className="h-9 w-9 rounded-lg border border-brand-line inline-flex items-center justify-center text-brand-danger hover:border-brand-danger cursor-pointer">
                  <IconTrash size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
