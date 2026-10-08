// One source of truth for the Kin categories: label, logo color, soft
// tint, a short tagline and the illustrated gradient used whenever a place
// has no photo of its own (so a card never looks empty or broken).
export type CategoryId =
  | 'kin_actualite'
  | 'kin_food'
  | 'kin_places'
  | 'kin_culture'
  | 'kin_style'
  | 'kin_securite'
  | 'kin_traffic'
  | 'kin_weekend';

export type Category = {
  id: CategoryId;
  label: string;
  tagline: string;
  color: string;      // pin / accent
  soft: string;       // chip background
  gradient: string;   // CSS background for illustrated tiles/placeholders
};

export const CATEGORIES: Category[] = [
  {
    id: 'kin_actualite',
    label: 'Kin Actualité',
    tagline: 'Les infos de Kinshasa, en direct',
    color: '#D21C2E',
    soft: '#FDE8EA',
    gradient: 'linear-gradient(135deg,#0A2A66 0%,#1A82F5 100%)',
  },
  {
    id: 'kin_food',
    label: 'Kin Food',
    tagline: 'Restos, maquis & terrasses',
    color: '#D21C2E',
    soft: '#FDE8EA',
    gradient: 'linear-gradient(135deg,#FF6B5A 0%,#D21C2E 100%)',
  },
  {
    id: 'kin_places',
    label: 'Kin Places',
    tagline: 'Les lieux à voir absolument',
    color: '#1A82F5',
    soft: '#E6F1FF',
    gradient: 'linear-gradient(135deg,#4BA3F7 0%,#0E5FC9 100%)',
  },
  {
    id: 'kin_culture',
    label: 'Kin Culture',
    tagline: 'Musique, art & patrimoine',
    color: '#B98A00',
    soft: '#FFF7D1',
    gradient: 'linear-gradient(135deg,#FFE36B 0%,#F5B400 100%)',
  },
  {
    id: 'kin_style',
    label: 'Kin Style',
    tagline: 'Mode, sape & beauté',
    color: '#C2185B',
    soft: '#FCE4EF',
    gradient: 'linear-gradient(135deg,#F06292 0%,#C2185B 100%)',
  },
  {
    id: 'kin_securite',
    label: 'Kin Sécurité',
    tagline: 'Commissariats & numéros utiles',
    color: '#0A2A66',
    soft: '#E3E9F5',
    gradient: 'linear-gradient(135deg,#3B5BA9 0%,#0A2A66 100%)',
  },
  {
    id: 'kin_traffic',
    label: 'Kin Traffic',
    tagline: 'Où ça bouchonne ?',
    color: '#E8590C',
    soft: '#FFEADB',
    gradient: 'linear-gradient(135deg,#FFA94D 0%,#E8590C 100%)',
  },
  {
    id: 'kin_weekend',
    label: 'Kin Weekend',
    tagline: 'Concerts, expos & sorties',
    color: '#7B3FE4',
    soft: '#EFE6FD',
    gradient: 'linear-gradient(135deg,#9D6BFF 0%,#5B21B6 100%)',
  },
];

export const CATEGORY_BY_ID: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c])
);

export function categoryOf(id?: string | null): Category {
  return CATEGORY_BY_ID[id || ''] || CATEGORY_BY_ID.kin_places;
}

// Average rating out of 5 from the running rating_sum / rating_count kept
// on each place row. null when nobody has rated it yet.
export function getAverageRating(place: { rating_sum?: number; rating_count?: number }): number | null {
  const count = place.rating_count || 0;
  if (count <= 0) return null;
  return (place.rating_sum || 0) / count;
}

// One page per category (client audit, 2026-10-08).
export const CATEGORY_PATH: Record<CategoryId, string> = {
  kin_actualite: '/actualite',
  kin_food: '/food',
  kin_places: '/places',
  kin_culture: '/culture',
  kin_style: '/style',
  kin_securite: '/securite',
  kin_traffic: '/traffic',
  kin_weekend: '/weekend',
};

/** The place categories that get a /food, /places… listing page. */
export const PLACE_CATEGORY_IDS: CategoryId[] = ['kin_food', 'kin_places', 'kin_culture', 'kin_style', 'kin_securite'];

export function categoryFromSlug(slug: string): Category | null {
  const id = (Object.keys(CATEGORY_PATH) as CategoryId[]).find((k) => CATEGORY_PATH[k] === `/${slug}`);
  return id && PLACE_CATEGORY_IDS.includes(id) ? categoryOf(id) : null;
}
