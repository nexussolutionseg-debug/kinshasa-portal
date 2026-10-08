// Homepage merchandising settings, edited in Backoffice → Vitrine and
// stored as one JSON row in public.site_settings (id = 1). Every page
// falls back to DEFAULT_SETTINGS if the row/table doesn't exist yet, so
// the site never breaks before the SQL is applied.
import { supabase } from './supabase';

// Homepage = 5 blocks (client audit, 2026-10-08): hero, clickable
// categories, map, six communes + "Voir les 24", newsletter (footer).
// "Coups de cœur" is optional and only shows when the team has picked
// places. Kin Actualité, Kin Weekend and the 24 communes have their own pages.
export type SectionId = 'categories' | 'featured' | 'map' | 'communes';

export const SECTION_LABELS: Record<SectionId, { label: string; hint: string }> = {
  categories: { label: 'Tuiles des catégories', hint: 'Les grandes tuiles colorées — chacune ouvre sa page (Kin Food, Kin Places…)' },
  featured: { label: 'Coups de cœur de la rédaction', hint: 'Les lieux choisis dans l’onglet « Coups de cœur » (masqué s’il est vide)' },
  map: { label: 'Carte interactive', hint: 'Carte + filtres + liste des lieux' },
  communes: { label: 'Communes en vedette', hint: 'Six communes + lien « Voir les 24 communes »' },
};

export type SiteSettings = {
  sections: { id: SectionId; visible: boolean }[];
  ticker: boolean;          // scrolling Kin Actu headline bar
  brandSlides: boolean;     // built-in hero slides after your banners
  newsletterPopup: boolean;
  /** Show the team's own 'À la une' articles alongside pulled news (off until the team starts publishing). */
  showEditorial: boolean;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  sections: (Object.keys(SECTION_LABELS) as SectionId[]).map((id) => ({ id, visible: true })),
  ticker: true,
  brandSlides: true,
  newsletterPopup: true,
  showEditorial: false,
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
    showEditorial: d.showEditorial === true,
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
