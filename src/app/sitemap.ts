import type { MetadataRoute } from 'next';
import { SITE_URL } from '../lib/utm';
import { COMMUNE_NAMES } from '../lib/communes';

// Added in response to a security/SEO scan flagging a missing
// sitemap.xml. Lists the homepage plus every commune page — the same
// 24 communes rendered in communes.json — so search engines can find
// them without depending on crawling internal links.
//
// NEXT_PUBLIC_SITE_URL isn't set yet in this project; once a final
// domain is picked (custom domain or the vercel.app one), set it in
// Vercel → Settings → Environment Variables so these URLs (and
// robots.ts's Sitemap: line) point at the real address instead of this
// fallback.
export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || SITE_URL;

  const communeEntries = COMMUNE_NAMES.map((name) => ({
    url: `${siteUrl}/commune/${encodeURIComponent(name)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const staticEntries = [
    { path: '/actualite', priority: 0.9 },
    { path: '/qui-sommes-nous', priority: 0.6 },
    { path: '/contact', priority: 0.5 },
    { path: '/devenir-partenaire', priority: 0.5 },
    { path: '/politique-de-confidentialite', priority: 0.3 },
  ].map(({ path, priority }) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority,
  }));

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    ...communeEntries,
    ...staticEntries,
  ];
}
