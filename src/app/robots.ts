import type { MetadataRoute } from 'next';

// Added in response to a security/SEO scan flagging a missing robots.txt.
// Disallows the backoffice and API routes from being indexed — they're
// not secret, but there's no reason for them to show up in search
// results either. Next.js serves this at /robots.txt automatically.
export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kinshasa-portal-virid.vercel.app';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/backoffice', '/login', '/api/'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
