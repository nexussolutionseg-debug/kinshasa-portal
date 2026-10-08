'use client';
// Listing for one category page (/food, /places…): commune filter, place
// cards, the shared detail sheet. Starts from the server-rendered list and
// refreshes once in the browser so backoffice changes show immediately.
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { canonicalCommune, sameCommune } from '../lib/communes';
import { CATEGORIES, CATEGORY_PATH, PLACE_CATEGORY_IDS, type Category } from '../lib/categories';
import { PlaceCard, CategoryIcon } from './PlaceCard';
import { PlaceSheet } from './PlaceSheet';
import { SpinningWheel } from './BrandMark';
import { IconPin, IconArrowRight } from './icons';

export function CategoryClient({ category, initialPlaces }: { category: Category; initialPlaces: any[] }) {
  const [places, setPlaces] = useState<any[]>(initialPlaces);
  const [commune, setCommune] = useState<string | null>(null);
  const [open, setOpen] = useState<any | null>(null);

  useEffect(() => {
    supabase
      .from('places')
      .select('*')
      .eq('vertical', category.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setPlaces(data.filter((p: any) => p.published !== false));
      });
  }, [category.id]);

  const communes = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of places) {
      const c = canonicalCommune(p.commune) || p.commune;
      if (c) m.set(c, (m.get(c) || 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'));
  }, [places]);

  const list = useMemo(() => (commune ? places.filter((p) => sameCommune(p.commune, commune)) : places), [places, commune]);
  const close = useCallback(() => setOpen(null), []);
  const update = useCallback((u: any) => setPlaces((prev) => prev.map((p) => (p.id === u.id ? u : p))), []);
  const chip = (on: boolean) =>
    `shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-bold border-2 transition-colors cursor-pointer ${
      on ? 'bg-brand-ink text-white border-brand-ink' : 'bg-white text-brand-ink border-brand-line hover:border-brand-blue'
    }`;

  return (
    <div className="max-w-[1400px] w-full mx-auto px-4 md:px-6 py-8 pb-16 flex flex-col gap-8">
      {communes.length > 1 && (
        <div className="rail flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0" aria-label="Filtrer par commune">
          <button type="button" className={chip(!commune)} onClick={() => setCommune(null)}>
            Toutes les communes <span className="opacity-60">{places.length}</span>
          </button>
          {communes.map(([c, n]) => (
            <button key={c} type="button" className={chip(commune === c)} onClick={() => setCommune(commune === c ? null : c)} aria-pressed={commune === c}>
              <IconPin size={13} /> {c} <span className="opacity-60">{n}</span>
            </button>
          ))}
        </div>
      )}

      {list.length > 0 ? (
        <ul className="list-none p-0 m-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
          {list.map((p) => (
            <li key={p.id} className="min-w-0">
              <PlaceCard place={p} onOpen={setOpen} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-3xl bg-white border border-brand-line shadow-card p-8 md:p-12 text-center flex flex-col items-center gap-3">
          <SpinningWheel size={72} spin={false} />
          <h2 className="font-display text-2xl font-extrabold text-brand-ink m-0">Les premières adresses {category.label} arrivent</h2>
          <p className="text-brand-muted m-0 max-w-md">Tu connais un lieu qui mérite d’y être ? Dis-le-nous, on le vérifie et on l’ajoute.</p>
          <Link href="/devenir-partenaire" className="mt-1 inline-flex items-center gap-1.5 bg-brand-red text-white font-bold px-6 py-3 rounded-full no-underline hover:bg-brand-red-dark">
            Propose un lieu <IconArrowRight size={14} />
          </Link>
        </div>
      )}

      <nav aria-label="Autres rubriques" className="border-t border-brand-line pt-6">
        <p className="text-xs font-extrabold uppercase tracking-wider text-brand-muted m-0 mb-3">Les autres rubriques</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.filter((c) => c.id !== category.id && (PLACE_CATEGORY_IDS.includes(c.id) || c.id === 'kin_traffic' || c.id === 'kin_actualite')).map((c) => (
            <Link key={c.id} href={CATEGORY_PATH[c.id]} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-sm font-bold no-underline border-2 border-brand-line bg-white text-brand-ink hover:border-brand-blue">
              <CategoryIcon id={c.id} size={15} /> {c.label}
            </Link>
          ))}
        </div>
      </nav>

      <PlaceSheet place={open} onClose={close} onUpdated={update} />
    </div>
  );
}
