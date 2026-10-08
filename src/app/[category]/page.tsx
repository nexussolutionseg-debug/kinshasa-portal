// /food, /places, /culture, /style, /securite — one page per category
// (client audit, 2026-10-08). Rendered on the server with the places
// already in the HTML (plus schema.org data) and rebuilt every 5 minutes.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SiteHeader } from '../../components/SiteHeader';
import { SiteTicker } from '../../components/SiteTicker';
import { SiteFooter } from '../../components/SiteFooter';
import { PageHero } from '../../components/PageHero';
import { CategoryClient } from '../../components/CategoryClient';
import { CategoryIcon } from '../../components/PlaceCard';
import { CATEGORY_PATH, PLACE_CATEGORY_IDS, categoryFromSlug, categoryOf } from '../../lib/categories';
import { serverPlaces } from '../../lib/supabaseServer';
import { ldJson, placesListJsonLd } from '../../lib/jsonld';

export const revalidate = 300;
export const dynamicParams = false;

export function generateStaticParams() {
  return PLACE_CATEGORY_IDS.map((id) => ({ category: CATEGORY_PATH[id].slice(1) }));
}

const INTRO: Record<string, string> = {
  kin_food: 'Restos, maquis, terrasses et bons plans pour bien manger à Kinshasa, commune par commune.',
  kin_places: 'Les lieux à voir, les hôtels et les adresses où dormir à Kinshasa, commune par commune.',
  kin_culture: 'Musique, art, musées et patrimoine : la culture kinoise, commune par commune.',
  kin_style: 'Mode, sape, créateurs et beauté : le style kinois, commune par commune.',
  kin_securite: 'Commissariats et postes utiles près de chez toi, commune par commune.',
};

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const c = categoryFromSlug(category);
  if (!c) return {};
  return {
    title: `${c.label} — ${c.tagline}`,
    description: INTRO[c.id],
    alternates: { canonical: CATEGORY_PATH[c.id] },
    openGraph: { title: `${c.label} — Kinshasa Label`, description: INTRO[c.id] },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const c = categoryFromSlug(category);
  if (!c) notFound();
  const places = await serverPlaces({ vertical: c.id });
  const cat = categoryOf(c.id);
  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader below={<SiteTicker />} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(placesListJsonLd(places, `${cat.label} à Kinshasa`, CATEGORY_PATH[c.id])) }} />
      <PageHero
        gradient={cat.gradient}
        dark={c.id !== 'kin_culture'}
        eyebrow={
          <span className="inline-flex items-center gap-2 bg-white/90 text-brand-ink text-xs font-extrabold uppercase tracking-wider px-3 py-1.5 rounded-full">
            <CategoryIcon id={c.id} size={14} /> {places.length > 0 ? `${places.length} adresse${places.length > 1 ? 's' : ''}` : 'Kinshasa Label'}
          </span>
        }
        title={cat.label}
        intro={INTRO[c.id]}
      />
      <CategoryClient category={cat} initialPlaces={places} />
      <SiteFooter />
    </main>
  );
}
