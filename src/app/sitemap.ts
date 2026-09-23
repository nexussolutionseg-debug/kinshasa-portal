import type { MetadataRoute } from 'next';
import communesData from '../data/communes.json';

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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kinshasa-portal-virid.vercel.app';

  const communeEntries = (communesData as any).features.map((f: any) => ({
    url: `${siteUrl}/commune/${encodeURIComponent(f.properties.name)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    ...communeEntries,
  ];
}
