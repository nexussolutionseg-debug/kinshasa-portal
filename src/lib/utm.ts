// UTM tracking (2026-10-04).
//
// 1. withUtm(): tags OUTGOING links (news articles, banner buttons, the
//    team's "À la une" source links) with utm_source=kinshasalabel.com so
//    the sites we send visitors to can see it in their own analytics —
//    useful proof of value when talking to partners and advertisers.
//    Links to our own site, Google Maps and social profiles are left alone,
//    and existing utm_* parameters are never overwritten.
//
// 2. buildTrackingLink(): builds INCOMING links to kinshasalabel.com for
//    Instagram, WhatsApp, flyers… Google Analytics reads the utm_* values
//    automatically (Acquisition → Traffic acquisition → Session source /
//    medium / campaign). Used by the backoffice "Liens de suivi" tool.

export const SITE_URL = 'https://www.kinshasalabel.com';
const OWN_HOSTS = /(^|\.)kinshasalabel\.com$/i;
const SKIP_HOSTS = /(^|\.)(google\.[a-z.]+|goo\.gl|instagram\.com|facebook\.com|tiktok\.com|x\.com|twitter\.com|linkedin\.com|wa\.me|whatsapp\.com)$/i;

export function withUtm(url: string | null | undefined, campaign: string, content?: string): string {
  if (!url) return '';
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return url;
    if (OWN_HOSTS.test(u.hostname) || SKIP_HOSTS.test(u.hostname)) return url;
    if ([...u.searchParams.keys()].some((k) => k.startsWith('utm_'))) return url;
    u.searchParams.set('utm_source', 'kinshasalabel.com');
    u.searchParams.set('utm_medium', 'referral');
    u.searchParams.set('utm_campaign', campaign);
    if (content) u.searchParams.set('utm_content', content);
    return u.toString();
  } catch {
    return url; // relative links (/commune/Gombe) stay as they are
  }
}

export function slug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}

export function buildTrackingLink(opts: { path: string; source: string; medium: string; campaign: string; content?: string }): string {
  const u = new URL(opts.path.startsWith('http') ? opts.path : SITE_URL + (opts.path.startsWith('/') ? opts.path : '/' + opts.path));
  u.searchParams.set('utm_source', slug(opts.source) || 'direct');
  u.searchParams.set('utm_medium', slug(opts.medium) || 'social');
  u.searchParams.set('utm_campaign', slug(opts.campaign) || 'general');
  if (opts.content) u.searchParams.set('utm_content', slug(opts.content));
  return u.toString();
}
