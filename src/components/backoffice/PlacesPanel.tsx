// Backoffice → "Lieux" (rebuilt 2026-10-07, phone-first).
//   * Liste: search, filters (visibles / masqués / sans position / sans photo),
//     one-tap Afficher / Masquer, multi-select for bulk show / hide / delete.
//   * Ajouter / Éditer: all fields incl. type, phone, Google rating, and a
//     single "Position" box that accepts GPS, a plus code or a Maps link.
//   * Importer: Excel or CSV, template download, preview with problems
//     explained before anything is written, optional update of existing.
//   * Exporter: every place in the same format (edit in Excel → re-import).
// Needs supabase/places-import.sql for the new fields.
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { CATEGORIES, categoryOf } from '../../lib/categories';
import { COMMUNE_NAMES, communeAt, sameCommune } from '../../lib/communes';
import { parsePosition } from '../../lib/geo';
import { uploadImage } from '../../lib/upload';
import {
  TEMPLATE_EXAMPLES, TEMPLATE_HEADERS, TEMPLATE_HELP, mapRows, placeKey, readImportFile, templateCsv,
  type ImportRow,
} from '../../lib/placeImport';
import communesGeo from '../../data/communes.json';
import { Button } from '../Button';
import { IconEdit, IconExternalLink, IconPin, IconPlus, IconSearch, IconTrash, IconWarning } from '../icons';

type Place = Record<string, any>;
type Tab = 'list' | 'form' | 'import';
type Filter = 'all' | 'live' | 'hidden' | 'nopos' | 'nophoto';

const PLACE_CATEGORIES = CATEGORIES.filter((c) => ['kin_places', 'kin_food', 'kin_culture', 'kin_style', 'kin_securite'].includes(c.id));
const SQL_HINT = 'Exécutez d’abord le fichier SQL « places-import » dans Supabase (SQL Editor), puis réessayez.';
const needsSql = (msg = '') => /published|place_type|phone|google_r|verification|column|schema cache|null value in column "l(at|ng)"/i.test(msg);

const input = 'w-full h-11 px-3 bg-white border border-brand-line text-brand-ink rounded-xl text-[16px] md:text-sm placeholder:text-brand-muted focus:outline-none focus:border-brand-blue';
const label = 'block text-xs font-bold text-brand-ink/70 mb-1.5';
const chip = (on: boolean) =>
  `shrink-0 h-10 px-4 rounded-full text-sm font-bold border-2 cursor-pointer ${on ? 'bg-brand-ink text-white border-brand-ink' : 'bg-white border-brand-line text-brand-ink'}`;

const EMPTY = {
  name: '', commune: 'Gombe', vertical: 'kin_places', place_type: '', address: '', position: '', description: '',
  budget: '', phone: '', google_rating: '', google_reviews: '', google_maps_url: '', image_url: '', published: true, verification: '',
};
type Form = typeof EMPTY;

function download(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export function PlacesPanel({ places, reload, startWith = 'list' }: { places: Place[]; reload: () => Promise<void> | void; startWith?: Tab }) {
  const [tab, setTab] = useState<Tab>(startWith);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [editing, setEditing] = useState<Place | null>(null);

  const say = (ok: boolean, text: string) => {
    setMsg({ ok, text });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openForm = (p: Place | null) => {
    setEditing(p);
    setTab('form');
    setMsg(null);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-white border border-brand-line rounded-2xl">
        {([
          ['list', `Liste (${places.length})`],
          ['form', editing ? 'Modifier' : 'Ajouter'],
          ['import', 'Importer'],
        ] as const).map(([id, l]) => (
          <button
            key={id}
            type="button"
            onClick={() => (id === 'form' ? openForm(editing) : (setTab(id), setMsg(null)))}
            className={`h-11 rounded-xl text-sm font-bold cursor-pointer ${tab === id ? 'bg-brand-ink text-white' : 'text-brand-ink hover:bg-brand-bg'}`}
          >
            {l}
          </button>
        ))}
      </div>

      {msg && (
        <p className={`m-0 rounded-xl px-4 py-3 text-sm font-semibold ${msg.ok ? 'bg-brand-blue-soft text-brand-blue-deep' : 'bg-brand-yellow-soft text-brand-ink'}`}>
          {msg.text}
        </p>
      )}

      {tab === 'list' && <PlaceList places={places} reload={reload} onEdit={openForm} say={say} />}
      {tab === 'form' && (
        <PlaceForm
          key={editing?.id ?? 'new'}
          place={editing}
          onDone={async (text) => {
            await reload();
            setEditing(null);
            setTab('list');
            say(true, text);
          }}
          onCancel={() => { setEditing(null); setTab('list'); }}
          say={say}
        />
      )}
      {tab === 'import' && <PlaceImport places={places} reload={reload} say={say} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
function PlaceList({ places, reload, onEdit, say }: { places: Place[]; reload: () => Promise<void> | void; onEdit: (p: Place) => void; say: (ok: boolean, t: string) => void }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const [shown, setShown] = useState(40);
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);

  const isLive = (p: Place) => p.published !== false;
  const counts = {
    all: places.length,
    live: places.filter(isLive).length,
    hidden: places.filter((p) => !isLive(p)).length,
    nopos: places.filter((p) => !(p.lat && p.lng)).length,
    nophoto: places.filter((p) => !p.image_url).length,
  };

  const list = useMemo(() => {
    let r = places;
    if (filter === 'live') r = r.filter(isLive);
    if (filter === 'hidden') r = r.filter((p) => !isLive(p));
    if (filter === 'nopos') r = r.filter((p) => !(p.lat && p.lng));
    if (filter === 'nophoto') r = r.filter((p) => !p.image_url);
    if (cat !== 'all') r = r.filter((p) => p.vertical === cat);
    if (q.trim()) {
      const s = q.toLowerCase();
      r = r.filter((p) => `${p.name} ${p.commune} ${p.place_type || ''} ${p.address || ''}`.toLowerCase().includes(s));
    }
    return r;
  }, [places, filter, cat, q]);

  useEffect(() => { setShown(40); setSel(new Set()); }, [filter, cat, q]);

  const toggle = (id: number) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const setPublished = async (ids: number[], published: boolean) => {
    setBusy(true);
    const { error } = await supabase.from('places').update({ published }).in('id', ids);
    setBusy(false);
    if (error) return say(false, needsSql(error.message) ? SQL_HINT : error.message);
    setSel(new Set());
    await reload();
    say(true, `${ids.length} lieu${ids.length > 1 ? 'x' : ''} ${published ? 'visible' : 'masqué'}${ids.length > 1 ? 's' : ''} sur le site.`);
  };

  const remove = async (ids: number[]) => {
    if (!confirm(ids.length === 1 ? 'Supprimer définitivement ce lieu ?' : `Supprimer définitivement ${ids.length} lieux ?`)) return;
    setBusy(true);
    const { error } = await supabase.from('places').delete().in('id', ids);
    setBusy(false);
    if (error) return say(false, error.message);
    setSel(new Set());
    await reload();
    say(true, `${ids.length} lieu${ids.length > 1 ? 'x supprimés' : ' supprimé'}.`);
  };

  return (
    <div className="bg-white rounded-3xl border border-brand-line p-4 md:p-6">
      <div className="relative mb-3">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted"><IconSearch size={16} /></span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (nom, commune, type, adresse)…" className={`${input} pl-9 rounded-full`} />
      </div>
      <div className="rail flex gap-2 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-1 mb-2">
        {([
          ['all', 'Tous'], ['live', 'Visibles'], ['hidden', 'Masqués'], ['nopos', 'Sans position'], ['nophoto', 'Sans photo'],
        ] as const).map(([id, l]) => (
          <button key={id} type="button" onClick={() => setFilter(id)} className={chip(filter === id)}>
            {l} <span className="opacity-60 font-semibold">{counts[id]}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select value={cat} onChange={(e) => setCat(e.target.value)} className={`${input} w-auto h-10`} aria-label="Catégorie">
          <option value="all">Toutes catégories</option>
          {PLACE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        {list.length > 0 && (
          <button type="button" className="h-10 px-3 text-sm font-bold text-brand-blue-deep cursor-pointer" onClick={() => setSel(sel.size === list.length ? new Set() : new Set(list.map((p) => p.id)))}>
            {sel.size === list.length ? 'Tout désélectionner' : `Tout sélectionner (${list.length})`}
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-brand-muted text-center py-10 m-0">Aucun lieu dans cette vue.</p>
      ) : (
        <ul className="list-none p-0 m-0 flex flex-col gap-2">
          {list.slice(0, shown).map((p) => {
            const c = categoryOf(p.vertical);
            const live = isLive(p);
            return (
              <li key={p.id} className={`border rounded-2xl p-3 ${live ? 'border-brand-line' : 'border-dashed border-brand-line bg-brand-bg'} ${sel.has(p.id) ? 'ring-2 ring-brand-blue' : ''}`}>
                <div className="flex gap-3">
                  <label className="shrink-0 pt-1 cursor-pointer">
                    <input type="checkbox" checked={sel.has(p.id)} onChange={() => toggle(p.id)} className="w-5 h-5 accent-[#1A82F5]" aria-label={`Sélectionner ${p.name}`} />
                  </label>
                  {p.image_url ? (
                    <img src={p.image_url} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl shrink-0" style={{ background: c.gradient }} aria-hidden="true" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="m-0 font-bold text-brand-ink leading-snug break-words">{p.name}</p>
                    <p className="m-0 text-xs text-brand-muted mt-0.5 break-words">
                      {[c.label, p.commune, p.place_type].filter(Boolean).join(' · ')}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${live ? 'bg-brand-blue-soft text-brand-blue-deep' : 'bg-brand-line text-brand-muted'}`}>{live ? 'Visible' : 'Masqué'}</span>
                      {!(p.lat && p.lng) && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand-yellow-soft text-brand-ink">Sans position</span>}
                      {p.verification && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-bg text-brand-muted border border-brand-line truncate max-w-[200px]">{p.verification}</span>}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2 mt-3">
                  <button type="button" onClick={() => onEdit(p)} className="h-10 rounded-xl border border-brand-line text-sm font-bold inline-flex items-center justify-center gap-1.5 hover:border-brand-blue cursor-pointer">
                    <IconEdit size={14} /> Modifier
                  </button>
                  <button type="button" disabled={busy} onClick={() => setPublished([p.id], !live)} className={`h-10 rounded-xl text-sm font-bold cursor-pointer ${live ? 'border border-brand-line hover:border-brand-blue' : 'bg-brand-blue text-white'}`}>
                    {live ? 'Masquer' : 'Afficher'}
                  </button>
                  <button type="button" disabled={busy} onClick={() => remove([p.id])} aria-label={`Supprimer ${p.name}`} className="h-10 w-10 rounded-xl border border-brand-line inline-flex items-center justify-center text-brand-danger hover:border-brand-danger cursor-pointer">
                    <IconTrash size={15} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {list.length > shown && (
        <div className="text-center mt-4">
          <Button variant="secondary" onClick={() => setShown((n) => n + 60)}>Afficher plus ({list.length - shown})</Button>
        </div>
      )}

      {sel.size > 0 && (
        <div className="sticky bottom-3 mt-4 z-10 bg-brand-ink text-white rounded-2xl p-2 flex items-center gap-1.5 shadow-lift">
          <span className="text-sm font-bold px-2 mr-auto whitespace-nowrap">{sel.size} choisi{sel.size > 1 ? 's' : ''}</span>
          <button type="button" disabled={busy} onClick={() => setPublished([...sel], true)} className="h-10 px-3 rounded-xl bg-white text-brand-ink text-sm font-bold cursor-pointer">Afficher</button>
          <button type="button" disabled={busy} onClick={() => setPublished([...sel], false)} className="h-10 px-3 rounded-xl bg-white/15 text-white text-sm font-bold cursor-pointer">Masquer</button>
          <button type="button" disabled={busy} onClick={() => remove([...sel])} aria-label="Supprimer la sélection" className="h-10 w-10 shrink-0 rounded-xl bg-white/15 inline-flex items-center justify-center cursor-pointer"><IconTrash size={15} /></button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
function PlaceForm({ place, onDone, onCancel, say }: { place: Place | null; onDone: (t: string) => void; onCancel: () => void; say: (ok: boolean, t: string) => void }) {
  const [f, setF] = useState<Form>(() =>
    place
      ? {
          name: place.name || '', commune: COMMUNE_NAMES.find((c) => sameCommune(c, place.commune)) || place.commune || 'Gombe',
          vertical: place.vertical || 'kin_places', place_type: place.place_type || '', address: place.address || '',
          position: place.lat && place.lng ? `${Number(place.lat).toFixed(6)}, ${Number(place.lng).toFixed(6)}` : '',
          description: place.description || '', budget: place.budget || '', phone: place.phone || '',
          google_rating: place.google_rating != null ? String(place.google_rating).replace('.', ',') : '',
          google_reviews: place.google_reviews != null ? String(place.google_reviews) : '',
          google_maps_url: place.google_maps_url || '', image_url: place.image_url || '',
          published: place.published !== false, verification: place.verification || '',
        }
      : EMPTY
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));

  const pos = parsePosition(f.position) || (!f.position ? parsePosition(f.google_maps_url) : null);
  const posCommune = pos ? communeAt(pos.lat, pos.lng, communesGeo as any) : null;

  // Google Places autocomplete, when a key is configured.
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
    if (!key || place) return;
    const init = () => {
      const g = (window as any).google;
      if (!nameRef.current || !g?.maps?.places) return;
      const ac = new g.maps.places.Autocomplete(nameRef.current, { types: ['establishment', 'geocode'], componentRestrictions: { country: 'cd' } });
      ac.addListener('place_changed', () => {
        const r = ac.getPlace();
        if (!r) return;
        setF((x) => ({
          ...x,
          name: r.name || x.name,
          address: r.formatted_address || x.address,
          google_maps_url: r.url || x.google_maps_url,
          position: r.geometry?.location ? `${r.geometry.location.lat().toFixed(6)}, ${r.geometry.location.lng().toFixed(6)}` : x.position,
          phone: r.international_phone_number || x.phone,
        }));
      });
    };
    if ((window as any).google?.maps?.places) return init();
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    s.async = true;
    s.onload = init;
    document.head.appendChild(s);
  }, [place]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.position.trim() && !pos) return say(false, 'Position non reconnue. Collez « -4.3217, 15.3125 », un plus code (M79J+6H) ou un lien Google Maps — ou laissez vide.');
    const rating = f.google_rating.trim() ? parseFloat(f.google_rating.replace(',', '.')) : null;
    if (rating !== null && !(rating >= 0 && rating <= 5)) return say(false, 'La note Google doit être entre 0 et 5.');
    const payload = {
      name: f.name.trim(),
      commune: f.commune,
      vertical: f.vertical,
      place_type: f.place_type.trim() || null,
      address: f.address.trim() || null,
      description: f.description.trim(),
      budget: f.budget || null,
      phone: f.phone.trim() || null,
      google_rating: rating,
      google_reviews: f.google_reviews.trim() ? parseInt(f.google_reviews, 10) || null : null,
      google_maps_url: f.google_maps_url.trim() || null,
      image_url: f.image_url.trim() || null,
      lat: pos?.lat ?? null,
      lng: pos?.lng ?? null,
      published: f.published,
      verification: f.verification.trim() || null,
      ...(place ? {} : { is_label_recommended: true }),
    };
    setSaving(true);
    const { error } = place
      ? await supabase.from('places').update(payload).eq('id', place.id)
      : await supabase.from('places').insert([payload]);
    setSaving(false);
    if (error) return say(false, needsSql(error.message) ? SQL_HINT : error.message);
    onDone(place ? `« ${payload.name} » mis à jour.` : `« ${payload.name} » ajouté${payload.published ? ' et visible sur le site' : ' (masqué)'}.`);
  };

  return (
    <form onSubmit={save} className="bg-white rounded-3xl border border-brand-line p-4 md:p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl md:text-2xl font-extrabold m-0 break-words min-w-0">{place ? `Modifier : ${place.name}` : 'Ajouter un lieu'}</h2>
        {place && <Button type="button" variant="ghost" onClick={onCancel}>Annuler</Button>}
      </div>

      <label className="flex items-center justify-between gap-3 bg-brand-bg rounded-2xl px-4 py-3 cursor-pointer">
        <span>
          <span className="block font-bold text-sm">Visible sur le site</span>
          <span className="block text-xs text-brand-muted">Décochez pour garder le lieu en brouillon (masqué).</span>
        </span>
        <input type="checkbox" checked={f.published} onChange={(e) => set('published', e.target.checked)} className="w-6 h-6 accent-[#1A82F5] shrink-0" />
      </label>

      <div>
        <label className={label} htmlFor="pl-name">Nom du lieu *</label>
        <input id="pl-name" ref={nameRef} required value={f.name} onChange={(e) => set('name', e.target.value)} className={input} placeholder="ex : Hôtel Stella" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="pl-commune">Commune *</label>
          <select id="pl-commune" value={f.commune} onChange={(e) => set('commune', e.target.value)} className={input}>
            {COMMUNE_NAMES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="pl-cat">Catégorie *</label>
          <select id="pl-cat" value={f.vertical} onChange={(e) => set('vertical', e.target.value)} className={input}>
            {PLACE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="pl-type">Type</label>
          <input id="pl-type" value={f.place_type} onChange={(e) => set('place_type', e.target.value)} className={input} placeholder="ex : Hôtel, Flat-hôtel, Restaurant…" list="pl-types" />
          <datalist id="pl-types">
            {['Hôtel', 'Flat-hôtel', 'Résidence', 'Guest house', 'Appartement meublé', 'Restaurant', 'Bar / lounge', 'Musée', 'Galerie', 'Boutique', 'Parc', 'Commissariat'].map((t) => <option key={t} value={t} />)}
          </datalist>
        </div>
        <div>
          <label className={label} htmlFor="pl-budget">Budget</label>
          <select id="pl-budget" value={f.budget} onChange={(e) => set('budget', e.target.value)} className={input}>
            <option value="">Non précisé</option>
            <option value="$">$ (abordable)</option>
            <option value="$$">$$ (moyen)</option>
            <option value="$$$">$$$ (premium)</option>
          </select>
        </div>
      </div>

      <div>
        <label className={label} htmlFor="pl-addr">Adresse / repère</label>
        <input id="pl-addr" value={f.address} onChange={(e) => set('address', e.target.value)} className={input} placeholder="ex : 54 bd Lumumba, réf. Échangeur" />
      </div>

      <div>
        <label className={label} htmlFor="pl-pos">Position sur la carte</label>
        <input id="pl-pos" value={f.position} onChange={(e) => set('position', e.target.value)} className={input} placeholder="-4.3217, 15.3125 · plus code M79J+6H · ou lien Google Maps" />
        <p className={`text-xs mt-1.5 mb-0 flex items-start gap-1 ${f.position && !pos ? 'text-brand-red-dark font-semibold' : 'text-brand-muted'}`}>
          {pos ? (
            <>
              <IconPin size={12} className="mt-0.5 shrink-0" /> {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
              {posCommune && (sameCommune(posCommune, f.commune) ? ` · bien dans ${posCommune}` : <strong className="text-brand-red-dark"> · ce point est à {posCommune}, pas à {f.commune}</strong>)}
              {' · '}<a href={`https://www.google.com/maps?q=${pos.lat},${pos.lng}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5">vérifier <IconExternalLink size={10} /></a>
            </>
          ) : f.position ? (
            'Position non reconnue.'
          ) : (
            'Facultatif. Sans position, le lieu apparaît sur la page de sa commune mais pas comme épingle sur la carte.'
          )}
        </p>
      </div>

      <div>
        <label className={label} htmlFor="pl-desc">Description *</label>
        <textarea id="pl-desc" required rows={3} value={f.description} onChange={(e) => set('description', e.target.value)} className={`${input} h-auto py-2.5 resize-y`} placeholder="Ce qui rend ce lieu spécial, en 1 ou 2 phrases." />
      </div>

      <div>
        <span className={label}>Photo</span>
        <div className="flex flex-col sm:flex-row gap-2">
          <label className="shrink-0 inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-brand-blue text-white text-sm font-bold cursor-pointer hover:bg-brand-blue-deep">
            {uploading ? 'Envoi…' : 'Importer une photo'}
            <input type="file" accept="image/*" className="sr-only" onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              setUploading(true);
              try { set('image_url', await uploadImage(file, 'places', 1400)); } catch (err: any) { say(false, `Échec de l’envoi de la photo : ${err.message || err}`); } finally { setUploading(false); }
            }} />
          </label>
          <input type="url" value={f.image_url} onChange={(e) => set('image_url', e.target.value)} placeholder="… ou collez un lien https://" className={input} aria-label="Lien de la photo" />
        </div>
        {f.image_url && <img src={f.image_url} alt="Aperçu" className="mt-2 w-32 h-24 object-cover rounded-xl border border-brand-line" />}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="pl-phone">Téléphone</label>
          <input id="pl-phone" type="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} className={input} placeholder="+243 …" />
        </div>
        <div>
          <label className={label} htmlFor="pl-maps">Lien Google Maps</label>
          <input id="pl-maps" type="url" value={f.google_maps_url} onChange={(e) => set('google_maps_url', e.target.value)} className={input} placeholder="https://maps.app.goo.gl/…" />
        </div>
        <div>
          <label className={label} htmlFor="pl-gr">Note Google (0 à 5)</label>
          <input id="pl-gr" inputMode="decimal" value={f.google_rating} onChange={(e) => set('google_rating', e.target.value)} className={input} placeholder="ex : 4,3" />
        </div>
        <div>
          <label className={label} htmlFor="pl-gn">Nombre d’avis Google</label>
          <input id="pl-gn" inputMode="numeric" value={f.google_reviews} onChange={(e) => set('google_reviews', e.target.value)} className={input} placeholder="ex : 52" />
        </div>
      </div>

      <div>
        <label className={label} htmlFor="pl-ver">Note interne / statut de vérification</label>
        <input id="pl-ver" value={f.verification} onChange={(e) => set('verification', e.target.value)} className={input} placeholder="ex : Identifié, À vérifier, Commune à confirmer…" />
        <p className="text-[11px] text-brand-muted mt-1 mb-0">Pour l’équipe : non affiché sur le site.</p>
      </div>

      <Button type="submit" variant="primary" size="lg" fullWidth disabled={saving}>
        {saving ? 'Enregistrement…' : place ? 'Enregistrer les modifications' : 'Enregistrer le lieu'}
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
function PlaceImport({ places, reload, say }: { places: Place[]; reload: () => Promise<void> | void; say: (ok: boolean, t: string) => void }) {
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [problem, setProblem] = useState('');
  const [update, setUpdate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [showAll, setShowAll] = useState(false);

  const existing = useMemo(() => {
    const m = new Map<string, Place>();
    for (const p of places) m.set(placeKey(p.name, p.commune, p.address), p);
    return m;
  }, [places]);

  const plan = useMemo(() => {
    if (!rows) return null;
    const seen = new Set<string>();
    const out = rows.map((r) => {
      if (!r.place) return { r, action: 'error' as const };
      const k = placeKey(r.place.name, r.place.commune, r.place.address);
      if (seen.has(k)) return { r, action: 'dup-file' as const };
      seen.add(k);
      const ex = existing.get(k);
      if (ex) return { r, action: update ? ('update' as const) : ('skip' as const), id: ex.id };
      return { r, action: 'new' as const };
    });
    const n = (a: string) => out.filter((x) => x.action === a).length;
    const newRows = out.filter((x) => x.action === 'new');
    return {
      out,
      add: newRows.length,
      addLive: newRows.filter((x) => x.r.place!.published).length,
      upd: n('update'),
      skip: n('skip') + n('dup-file'),
      err: n('error'),
      noPos: out.filter((x) => (x.action === 'new' || x.action === 'update') && x.r.place!.lat == null).length,
      warn: out.filter((x) => (x.action === 'new' || x.action === 'update') && x.r.warnings.some((w) => w.startsWith('La position'))).length,
    };
  }, [rows, existing, update]);

  const onFile = async (file: File) => {
    setFileName(file.name);
    setRows(null);
    setProblem('');
    try {
      const table = await readImportFile(file);
      const { rows: r, missingColumns } = mapRows(table, communesGeo as any);
      if (missingColumns.length) {
        setProblem(`Colonnes introuvables : ${missingColumns.join(', ')}. Utilisez le modèle (la première ligne doit contenir les titres des colonnes).`);
        return;
      }
      if (!r.length) return setProblem('Le fichier ne contient aucune ligne de lieu.');
      setRows(r);
    } catch (e: any) {
      setProblem(`Lecture impossible : ${e.message || e}`);
    }
  };

  const run = async () => {
    if (!plan) return;
    setBusy(true);
    let done = 0;
    try {
      const toAdd = plan.out.filter((x) => x.action === 'new').map((x) => ({ ...x.r.place!, is_label_recommended: true }));
      for (let i = 0; i < toAdd.length; i += 50) {
        setProgress(`Ajout… ${Math.min(i + 50, toAdd.length)} / ${toAdd.length}`);
        const { error } = await supabase.from('places').insert(toAdd.slice(i, i + 50));
        if (error) throw error;
        done += Math.min(50, toAdd.length - i);
      }
      const toUpd = plan.out.filter((x) => x.action === 'update');
      for (let i = 0; i < toUpd.length; i += 10) {
        setProgress(`Mise à jour… ${Math.min(i + 10, toUpd.length)} / ${toUpd.length}`);
        const res = await Promise.all(toUpd.slice(i, i + 10).map((x) => {
          const { image_url, ...rest } = x.r.place!;
          // never wipe a photo the team already uploaded
          return supabase.from('places').update(image_url ? { ...rest, image_url } : rest).eq('id', (x as any).id);
        }));
        const bad = res.find((x) => x.error);
        if (bad?.error) throw bad.error;
      }
      await reload();
      setRows(null);
      setFileName('');
      say(true, `Import terminé : ${toAdd.length} lieu(x) ajouté(s)${toUpd.length ? `, ${toUpd.length} mis à jour` : ''}. Ils apparaissent tout de suite sur le site (sauf les lieux masqués).`);
    } catch (e: any) {
      await reload();
      say(false, needsSql(e.message) ? SQL_HINT : `Import interrompu après ${done} lieu(x) : ${e.message}`);
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  const downloadXlsx = async (withData: boolean) => {
    const { default: writeExcelFile } = await import('write-excel-file/browser');
    const head = TEMPLATE_HEADERS.map((h) => ({ value: h, fontWeight: 'bold' as const, backgroundColor: '#E6F1FF' }));
    const body: (string | number | null)[][] = withData
      ? places.map((p) => [
          p.commune, p.name, categoryOf(p.vertical).label, p.place_type || '', p.address || '',
          p.lat && p.lng ? `${Number(p.lat).toFixed(6)}, ${Number(p.lng).toFixed(6)}` : '',
          p.description || '', p.budget || '', p.phone || '', p.google_rating ?? null, p.google_reviews ?? null,
          p.google_maps_url || '', p.image_url || '', p.verification || '', p.published === false ? 'non' : 'oui',
        ])
      : TEMPLATE_EXAMPLES;
    const widths = [14, 32, 12, 18, 32, 24, 40, 8, 18, 11, 11, 30, 30, 22, 8].map((width) => ({ width }));
    const blob = await writeExcelFile([
      { sheet: 'Lieux', data: [head, ...body.map((r) => r.map((v) => (v === '' ? null : v)))], columns: widths },
      { sheet: 'Mode d’emploi', data: [[{ value: 'Comment remplir le fichier', fontWeight: 'bold' as const }], ...TEMPLATE_HELP.map((t) => [t])], columns: [{ width: 120 }] },
    ] as any).toBlob();
    download(blob, withData ? `kinshasa-label-lieux-${new Date().toISOString().slice(0, 10)}.xlsx` : 'modele-import-lieux.xlsx');
  };

  const label = (a: string) =>
    ({ new: 'Ajout', update: 'Mise à jour', skip: 'Déjà présent', 'dup-file': 'Doublon dans le fichier', error: 'Erreur' } as Record<string, string>)[a];

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-3xl border border-brand-line p-4 md:p-6">
        <h2 className="font-display text-xl md:text-2xl font-extrabold m-0">1. Le modèle</h2>
        <p className="text-sm text-brand-muted mt-1 mb-3">Remplissez une ligne par lieu. Seuls <strong>Commune</strong> et <strong>Établissement</strong> sont obligatoires.</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <Button variant="primary" onClick={() => downloadXlsx(false)}>Modèle Excel</Button>
          <Button variant="secondary" onClick={() => download(new Blob([templateCsv()], { type: 'text/csv;charset=utf-8' }), 'modele-import-lieux.csv')}>Modèle CSV</Button>
          <Button variant="secondary" onClick={() => downloadXlsx(true)} disabled={!places.length}>Exporter mes lieux ({places.length})</Button>
        </div>
        <details className="mt-3">
          <summary className="text-sm font-bold text-brand-blue-deep cursor-pointer">Comment remplir les colonnes ?</summary>
          <ul className="text-sm text-brand-ink/80 pl-5 mt-2 mb-0 flex flex-col gap-1">
            {TEMPLATE_HELP.map((t) => <li key={t}>{t}</li>)}
            <li>Astuce : « Exporter mes lieux » donne un fichier au même format — corrigez-le dans Excel puis réimportez-le avec « Mettre à jour les lieux existants ».</li>
          </ul>
        </details>
      </div>

      <div className="bg-white rounded-3xl border border-brand-line p-4 md:p-6">
        <h2 className="font-display text-xl md:text-2xl font-extrabold m-0">2. Votre fichier</h2>
        <p className="text-sm text-brand-muted mt-1 mb-3">Excel (.xlsx) ou CSV. Rien n’est enregistré avant votre confirmation.</p>
        <label className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-brand-line rounded-2xl p-6 text-center cursor-pointer hover:border-brand-blue">
          <IconPlus size={22} />
          <span className="font-bold">{fileName || 'Choisir un fichier'}</span>
          <span className="text-xs text-brand-muted">.xlsx ou .csv</span>
          <input type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) onFile(file); }} />
        </label>
        {problem && <p className="mt-3 mb-0 rounded-xl bg-brand-yellow-soft px-3 py-2 text-sm font-semibold flex gap-2"><IconWarning size={16} className="shrink-0 mt-0.5" /> {problem}</p>}
      </div>

      {plan && (
        <div className="bg-white rounded-3xl border border-brand-line p-4 md:p-6">
          <h2 className="font-display text-xl md:text-2xl font-extrabold m-0">3. Vérifier et importer</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
            {[
              ['À ajouter', plan.add, `${plan.addLive} visibles · ${plan.add - plan.addLive} masqués`],
              ['À mettre à jour', plan.upd, update ? 'lieux existants' : 'option désactivée'],
              ['Ignorés', plan.skip, 'déjà présents / doublons'],
              ['Erreurs', plan.err, plan.err ? 'lignes non importées' : 'aucune'],
            ].map(([t, n, s]) => (
              <div key={t as string} className="rounded-2xl bg-brand-bg p-3">
                <span className="block text-xs font-bold text-brand-muted">{t}</span>
                <span className="block font-display text-2xl font-extrabold">{n}</span>
                <span className="block text-[11px] text-brand-muted">{s}</span>
              </div>
            ))}
          </div>
          {(plan.noPos > 0 || plan.warn > 0) && (
            <p className="text-sm text-brand-ink/80 mt-3 mb-0">
              {plan.noPos > 0 && <>{plan.noPos} lieu(x) sans position : ils apparaîtront sur leur commune, sans épingle sur la carte (ajoutez-la plus tard via « Modifier »). </>}
              {plan.warn > 0 && <><strong>{plan.warn}</strong> position(s) tombent dans une autre commune que celle indiquée — voir la liste ci-dessous.</>}
            </p>
          )}

          <label className="flex items-center gap-2.5 mt-4 text-sm font-semibold cursor-pointer">
            <input type="checkbox" checked={update} onChange={(e) => setUpdate(e.target.checked)} className="w-5 h-5 accent-[#1A82F5]" />
            Mettre à jour les lieux existants (même nom, commune et adresse)
          </label>

          <ul className="list-none p-0 m-0 mt-4 flex flex-col gap-1.5">
            {plan.out
              .filter((x) => showAll || x.action === 'error' || x.r.warnings.some((w) => w.startsWith('La position')))
              .map((x) => (
                <li key={x.r.line} className={`rounded-xl px-3 py-2 text-sm border ${x.action === 'error' ? 'border-brand-red/40 bg-[#FDE8EA]' : 'border-brand-line'}`}>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-[11px] font-bold text-brand-muted">Ligne {x.r.line}</span>
                    <strong className="break-words">{x.r.place?.name || '—'}</strong>
                    {x.r.place && <span className="text-brand-muted text-xs">{x.r.place.commune}</span>}
                    <span className="ml-auto text-[11px] font-extrabold uppercase text-brand-blue-deep">{label(x.action)}{x.r.place && x.action !== 'error' ? (x.r.place.published ? ' · visible' : ' · masqué') : ''}</span>
                  </div>
                  {[...x.r.errors, ...x.r.warnings].length > 0 && (
                    <p className="m-0 mt-0.5 text-xs text-brand-ink/75">{[...x.r.errors, ...x.r.warnings].join(' · ')}</p>
                  )}
                </li>
              ))}
          </ul>
          <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-2 text-sm font-bold text-brand-blue-deep cursor-pointer">
            {showAll ? 'Ne montrer que les points à vérifier' : `Voir les ${plan.out.length} lignes`}
          </button>

          <div className="mt-4">
            <Button variant="primary" size="lg" fullWidth disabled={busy || plan.add + plan.upd === 0} onClick={run}>
              {busy ? progress || 'Import…' : plan.add + plan.upd === 0 ? 'Rien à importer' : `Importer ${plan.add + plan.upd} lieu${plan.add + plan.upd > 1 ? 'x' : ''}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
