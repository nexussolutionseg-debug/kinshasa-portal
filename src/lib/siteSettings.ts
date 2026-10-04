// Homepage merchandising settings, edited in Backoffice → Vitrine and
// stored as one JSON row in public.site_settings (id = 1). Every page
// falls back to DEFAULT_SETTINGS if the row/table doesn't exist yet, so
// the site never breaks before the SQL is applied.
import { supabase } from './supabase';

export type SectionId =
  | 'categories'
  | 'actualite'
  | 'featured'
  | 'topRated'
  | 'newest'
  | 'categoryRails'
  | 'weekend'
  | 'map'
  | 'communes'
  | 'surprise';

export const SECTION_LABELS: Record<SectionId, { label: string; hint: string }> = {
  categories: { label: 'Tuiles des catégories', hint: 'Les 8 grandes tuiles colorées sous la bannière' },
  actualite: { label: 'Kin Actualité', hint: 'À la une + infos en direct + taux du jour' },
  featured: { label: 'Coups de cœur de la rédaction', hint: 'Les lieux que vous choisissez ci-dessous' },
  topRated: { label: 'Les mieux notés', hint: 'Automatique, selon les notes des visiteurs' },
  newest: { label: 'Nouveaux lieux', hint: 'Automatique, les derniers ajoutés' },
  categoryRails: { label: 'Carrousels par catégorie', hint: 'Kin Food, Kin Places… (3 lieux minimum chacun)' },
  weekend: { label: 'Kin Weekend', hint: 'Les événements à venir' },
  map: { label: 'Carte interactive', hint: 'Carte + filtres + liste' },
  communes: { label: 'Les 24 communes', hint: 'Carrousel des communes' },
  surprise: { label: 'Bandeau « Surprends-moi »', hint: 'Lieu au hasard' },
};

export type SiteSettings = {
  sections: { id: SectionId; visible: boolean }[];
  ticker: boolean;          // scrolling Kin Actu headline bar
  brandSlides: boolean;     // built-in hero slides after your banners
  newsletterPopup: boolean;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  sections: (Object.keys(SECTION_LABELS) as SectionId[]).map((id) => ({ id, visible: true })),
  ticker: true,
  brandSlides: true,
  newsletterPopup: true,
};

export function normalizeSettings(raw: unknown): SiteSettings {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Partial<SiteSettings>;
  const known = new Set(Object.keys(SECTION_LABELS));
  const saved = Array.isArray(d.sections) ? d.sections.filter((s) => s && known.has(s.id)) : [];
  const missing = DEFAULT_SETTINGS.sections.filter((s) => !saved.some((x) => x.id === s.id));
  return {
    sections: [...saved.map((s) => ({ id: s.id, visible: s.visible !== false })), ...missing],
    ticker: d.ticker !== false,
    brandSlides: d.brandSlides !== false,
    newsletterPopup: d.newsletterPopup !== false,
  };
}

export async function loadSiteSettings(): Promise<SiteSettings> {
  try {
    const { data, error } = await supabase.from('site_settings').select('data').eq('id', 1).maybeSingle();
    if (error || !data) return DEFAULT_SETTINGS;
    return normalizeSettings(data.data);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// A banner is live when active and inside its optional schedule window.
export function isBannerLive(b: { active?: boolean; starts_at?: string | null; ends_at?: string | null }, now = Date.now()) {
  if (!b.active) return false;
  if (b.starts_at && Date.parse(b.starts_at) > now) return false;
  if (b.ends_at && Date.parse(b.ends_at) < now) return false;
  return true;
}

export function sortBanners<T extends { position?: number | null; created_at?: string }>(list: T[]): T[] {
  return [...list].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0) || Date.parse(b.created_at || '0') - Date.parse(a.created_at || '0')
  );
}
