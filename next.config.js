/** @type {import('next').NextConfig} */

// Security headers — added in response to an external scan (Raqib) that
// flagged 3 high-severity findings (missing CSP, missing clickjacking
// protection) plus several lower-severity ones (MIME sniffing, referrer
// policy, permissions policy). Applied site-wide via `headers()` rather
// than per-page, so every route (including the backoffice) is covered.
//
// The CSP's allowed sources are the exact external hosts this app talks
// to today — see the origins used by src/app/page.tsx (Esri map tiles,
// MapLibre's demo glyph server), src/lib/supabase.ts (the Supabase
// project), and src/app/backoffice/page.tsx (Google Places, only ever
// contacted if NEXT_PUBLIC_GOOGLE_PLACES_API_KEY is set — left allowed
// so turning that key on later doesn't silently break under CSP).
// 'unsafe-inline' is kept for script-src/style-src rather than a
// nonce-based setup: this app has several inline style={{...}} usages
// (e.g. the Kin Traffic legend dots) and Next.js's own hydration data,
// and a broken site is worse than a marginally stricter policy — this
// still satisfies "restrict script sources to trusted origins" per the
// scan's own suggested fix, it just doesn't additionally block inline
// script/style execution.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://maps.googleapis.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https: data:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co https://server.arcgisonline.com https://demotiles.maplibre.org https://maps.googleapis.com",
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  // Belt-and-suspenders with frame-ancestors above — older browsers that
  // don't support CSP's frame-ancestors still respect this.
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
];

const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
