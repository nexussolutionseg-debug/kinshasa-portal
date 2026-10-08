import type { MetadataRoute } from 'next';
import { SITE_URL } from '../lib/utm';
import { COMMUNE_NAMES, communeHref } from '../lib/communes';
import { CATEGORY_PATH, PLACE_CATEGORY_IDS } from '../lib/categories';

// Every public page: home, Kin Actualité, the category pages, the 24
// communes (clean lowercase addresses), Kin Weekend and the info pages.
// NEXT_PUBLIC_SITE_URL can override the domain; it defaults to the live site.
export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || SITE_URL;
  const now = new Date();
  const page = (path: string, priority: number, changeFrequency: 'hourly' | 'daily' | 'weekly' | 'monthly' = 'weekly') => ({
    url: `${siteUrl}${path === '/' ? '' : path}`,
    lastModified: now,
    changeFrequency,
    priority,
  });
  return [
    page('/', 1, 'daily'),
    page('/actualite', 0.9, 'hourly'),
    ...PLACE_CATEGORY_IDS.map((id) => page(CATEGORY_PATH[id], 0.8, 'daily')),
    page('/traffic', 0.6),
    page('/communes', 0.8),
    ...COMMUNE_NAMES.map((n) => page(communeHref(n), 0.7)),
    page('/weekend', 0.6, 'daily'),
    page('/qui-sommes-nous', 0.5, 'monthly'),
    page('/contact', 0.4, 'monthly'),
    page('/devenir-partenaire', 0.5, 'monthly'),
    page('/politique-de-confidentialite', 0.2, 'monthly'),
  ];
}
