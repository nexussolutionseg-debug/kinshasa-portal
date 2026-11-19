// Partner packs (2026-11-10), as sold in the « Offre Partenaires » deck:
//   page          → own page + map point; 1 Kin Weekend event per month
//   site          → + Coups de cœur, homepage banner 1 week/month, À la une 1/quarter, monthly report
//   site_reseaux  → + Instagram, newsletter, À la une 1/month, banner 2 weeks/month
// A pack counts while partner_until is empty or not yet past.
export type PackId = 'page' | 'site' | 'site_reseaux';

export const PACKS: { id: PackId; label: string; eventsPerMonth: number | null; bannerWeeks: number; featured: boolean }[] = [
  { id: 'page', label: 'Pack Page', eventsPerMonth: 1, bannerWeeks: 0, featured: false },
  { id: 'site', label: 'Pack Site', eventsPerMonth: null, bannerWeeks: 1, featured: true },
  { id: 'site_reseaux', label: 'Pack Site + Réseaux', eventsPerMonth: null, bannerWeeks: 2, featured: true },
];

export const packOf = (id: string | null | undefined) => PACKS.find((p) => p.id === id) || null;

/** Today in Kinshasa (UTC+1), YYYY-MM-DD. */
const today = () => new Date(Date.now() + 3600000).toISOString().slice(0, 10);

/** The place's pack if it is active today, else null. */
export function activePack(p: { partner_pack?: string | null; partner_until?: string | null } | null | undefined, on = today()) {
  if (!p?.partner_pack) return null;
  if (p.partner_until && String(p.partner_until).slice(0, 10) < on) return null;
  return packOf(p.partner_pack);
}

const rank = (p: any) => {
  const k = activePack(p)?.id;
  return k === 'site_reseaux' ? 0 : k === 'site' ? 1 : k === 'page' ? 2 : 3;
};

/** Paid partners first (Site + Réseaux, Site, then Page); otherwise the order is kept. */
export function partnersFirst<T>(list: T[]): T[] {
  return list
    .map((p, i) => ({ p, i, r: rank(p) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map((x) => x.p);
}

/** Coups de cœur: the hand-picked places first, then active Site / Site + Réseaux partners. */
export function featuredWithPartners<T extends { id: any; featured?: boolean; featured_rank?: number }>(places: T[], max: number): T[] {
  const picked = places.filter((p) => p.featured).sort((a, b) => (a.featured_rank ?? 0) - (b.featured_rank ?? 0));
  const ids = new Set(picked.map((p) => p.id));
  const partners = partnersFirst(places.filter((p) => !ids.has(p.id) && activePack(p as any)?.featured));
  return [...picked, ...partners].slice(0, max);
}

/** What each pack sells, shown on /devenir-partenaire (2026-11-19).
 *  Prices = the « Offre Partenaires » deck (proposed 2026-11-10). Change them here only. */
export const PACK_OFFERS: { id: PackId; name: string; tagline: string; setup: number; monthly: number; popular?: boolean; perks: string[] }[] = [
  {
    id: 'page',
    name: 'Pack Page',
    tagline: 'Être trouvé sur la carte de Kinshasa',
    setup: 49,
    monthly: 15,
    perks: ['Ta page dédiée sur Kinshasa Label', 'Ton point sur la carte de ta commune', 'Boutons appel, WhatsApp et itinéraire', '1 événement Kin Weekend par mois'],
  },
  {
    id: 'site',
    name: 'Pack Site',
    tagline: 'Passer devant les autres',
    setup: 99,
    monthly: 49,
    popular: true,
    perks: ['Tout le Pack Page', 'Place dans les « Coups de cœur » de l’accueil', 'Bannière sur l’accueil 1 semaine par mois', '1 article « À la une » par trimestre', 'Événements Kin Weekend illimités', 'Rapport de visites chaque mois'],
  },
  {
    id: 'site_reseaux',
    name: 'Pack Site + Réseaux',
    tagline: 'Toute la visibilité, site et réseaux',
    setup: 199,
    monthly: 149,
    perks: ['Tout le Pack Site', 'Publications sur notre Instagram', 'Mise en avant dans la newsletter', '1 article « À la une » par mois', 'Bannière sur l’accueil 2 semaines par mois'],
  },
];

/** Labels for the « Pack souhaité » line the partner form adds to a request. */
export const PACK_CHOICE_LABEL: Record<string, string> = {
  page: 'Pack Page',
  site: 'Pack Site',
  site_reseaux: 'Pack Site + Réseaux',
  inconnu: 'Pas encore décidé',
};
