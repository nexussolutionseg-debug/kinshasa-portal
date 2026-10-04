// Kin Actualité — live Kinshasa headlines aggregated from Congolese news
// sites' public RSS feeds (server-side, see src/app/api/actualite/route.ts).
//
// What we show from each source: the headline, a short teaser (max ~180
// characters), the date, a thumbnail when the feed provides one, and a
// link that opens the ORIGINAL article on the source's own site. We never
// republish article bodies — that keeps us on the right side of copyright
// and sends the sources real traffic.
//
// Feeds verified on 2026-10-04 (all valid RSS 2.0, updated the same day):
//   lepoint.cd, provinces26rdc.com, mines.cd           (client's list)
//   Radio Okapi, actualite.cd, mediacongo.net,
//   zoom-eco.net, beto.cd (politico.cd now redirects)  (added)
// acp.cd is from the client's list but its feed returned HTTP 503 on the
// day of the check; it stays in the list and simply contributes nothing
// while it's down (every feed is fetched independently, a failing one
// never breaks the page). Not included: sangoyacongo.com (domain did not
// resolve), phoenix-browser.com (a mobile-app landing page, not a news
// site), mataf.net (a currency site — used as the source link of the
// USD/CDF rate widget instead, see src/app/api/taux/route.ts).
import { XMLParser } from 'fast-xml-parser';

export type NewsSource = {
  id: string;
  name: string;
  site: string;
  feed: string;
  color: string;
};

export const NEWS_SOURCES: NewsSource[] = [
  { id: 'radiookapi', name: 'Radio Okapi', site: 'https://www.radiookapi.net', feed: 'https://feeds.feedburner.com/radiookapi/actu?format=xml', color: '#0E5FC9' },
  { id: 'actualite', name: 'Actualite.cd', site: 'https://actualite.cd', feed: 'https://actualite.cd/feed', color: '#D21C2E' },
  { id: 'mediacongo', name: 'Mediacongo', site: 'https://www.mediacongo.net', feed: 'https://www.mediacongo.net/flux_rss.html?type=actualite', color: '#1A82F5' },
  { id: 'lepoint', name: 'Le Point.cd', site: 'https://lepoint.cd', feed: 'https://lepoint.cd/feed/', color: '#A60E1D' },
  { id: 'acp', name: 'ACP', site: 'https://acp.cd', feed: 'https://acp.cd/feed/', color: '#0A2A66' },
  { id: 'provinces26', name: 'Provinces26 RDC', site: 'https://provinces26rdc.com', feed: 'https://provinces26rdc.com/feed/', color: '#2E7D32' },
  { id: 'zoomeco', name: 'Zoom Eco', site: 'https://zoom-eco.net', feed: 'https://zoom-eco.net/feed/', color: '#E8590C' },
  { id: 'mines', name: 'Mines.cd', site: 'https://mines.cd', feed: 'https://mines.cd/feed/', color: '#6D4C41' },
  { id: 'beto', name: 'Beto.cd', site: 'https://beto.cd', feed: 'https://beto.cd/feed/', color: '#7B3FE4' },
];

export type NewsItem = {
  id: string;
  title: string;
  link: string;
  teaser: string;
  date: string | null; // ISO
  image: string | null;
  sourceId: string;
  sourceName: string;
  commune: string | null; // commune named in the item, when one is
  pinned?: boolean;       // editorial "À la une" items from the backoffice
  body?: string | null;   // full text, editorial items only (our own content)
};

// ---------------------------------------------------------------------------
// Kinshasa-only filter (client decision, 2026-10-04): most sources cover the
// whole DRC, so an item is kept only if its title, teaser or categories
// mention Kinshasa, Kinois(e), or one of the city's 24 communes.

export const KINSHASA_COMMUNES = [
  'Bandalungwa', 'Barumbu', 'Bumbu', 'Gombe', 'Kalamu', 'Kasa-Vubu', 'Kimbanseke',
  'Kinshasa', 'Kintambo', 'Kisenso', 'Lemba', 'Limete', 'Lingwala', 'Makala', 'Maluku',
  'Masina', 'Matete', 'Mont-Ngafula', 'Ndjili', 'Ngaba', 'Ngaliema', 'Ngiri-Ngiri', 'Nsele',
  'Selembao',
];

// Spelling variants seen in Congolese press, mapped to the canonical name.
const COMMUNE_PATTERNS: [RegExp, string][] = [
  ...KINSHASA_COMMUNES.filter((c) => c !== 'Kinshasa').map(
    (c) => [new RegExp(`\\b${c.replace('-', '[\\s-]?')}\\b`, 'i'), c] as [RegExp, string]
  ),
  [/\bN['’]?\s?djili\b/i, 'Ndjili'],
  [/\bN['’]?\s?sele\b/i, 'Nsele'],
  [/\bMont[\s-]Ngafula\b/i, 'Mont-Ngafula'],
];

// "Bandal" is how everyone says Bandalungwa.
COMMUNE_PATTERNS.push([/\bBandal\b/i, 'Bandalungwa']);

const KINSHASA_RE = /\bkin(?:shasa|ois|oise|oises)\b|\bKin la belle\b|\bville[- ]province\b/i;

export function detectCommune(text: string): string | null {
  for (const [re, name] of COMMUNE_PATTERNS) if (re.test(text)) return name;
  return null;
}

export function isAboutKinshasa(text: string): boolean {
  return KINSHASA_RE.test(text) || detectCommune(text) !== null;
}

// ---------------------------------------------------------------------------
// RSS parsing helpers

const ENTITIES: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'",
  '&nbsp;': ' ', '&laquo;': '«', '&raquo;': '»', '&rsquo;': '’', '&lsquo;': '‘',
  '&ldquo;': '“', '&rdquo;': '”', '&hellip;': '…', '&ndash;': '–', '&mdash;': '—',
  '&eacute;': 'é', '&egrave;': 'è', '&ecirc;': 'ê', '&agrave;': 'à', '&ccedil;': 'ç',
};

export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&[a-z]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? m);
}

export function stripHtml(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim();
}

function teaserOf(text: string, max = 180): string {
  // WordPress feeds end descriptions with "The post X appeared first on Y."
  const clean = text.replace(/\s*(The post|L’article|L'article)\s.+?(appeared first on|est apparu en premier sur).*$/i, '').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(' ') > 80 ? cut.lastIndexOf(' ') : max).replace(/[,;:.\s]+$/, '') + '…';
}

function asText(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (Array.isArray(v)) return v.map(asText).join(' ');
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if ('#text' in o) return asText(o['#text']);
    if ('__cdata' in o) return asText(o['__cdata']);
  }
  return '';
}

function firstImage(item: Record<string, unknown>, html: string): string | null {
  const candidates: unknown[] = [item['media:content'], item['media:thumbnail'], item['enclosure']];
  for (const c of candidates) {
    const list = Array.isArray(c) ? c : c ? [c] : [];
    for (const m of list) {
      const o = m as Record<string, string>;
      const url = o?.['@_url'];
      const type = o?.['@_type'] || '';
      if (url && (!type || type.startsWith('image'))) return url;
    }
  }
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? decodeEntities(m[1]) : null;
}

function safeHttpUrl(u: string | null): string | null {
  if (!u) return null;
  try {
    const url = new URL(u.trim());
    if (url.protocol === 'https:') return url.toString();
    if (url.protocol === 'http:') {
      // Upgrade images to https so they load under the site's CSP / mixed-content rules.
      url.protocol = 'https:';
      return url.toString();
    }
  } catch {
    /* ignore */
  }
  return null;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  cdataPropName: '__cdata',
  processEntities: false,
  htmlEntities: false,
});

export function parseFeed(xml: string, source: NewsSource): NewsItem[] {
  const doc = parser.parse(xml);
  const rssItems = doc?.rss?.channel?.item;
  const atomEntries = doc?.feed?.entry;
  const raw: Record<string, unknown>[] = Array.isArray(rssItems)
    ? rssItems
    : rssItems
    ? [rssItems]
    : Array.isArray(atomEntries)
    ? atomEntries
    : atomEntries
    ? [atomEntries]
    : [];

  const out: NewsItem[] = [];
  for (const it of raw) {
    const title = stripHtml(asText(it.title));
    let link = asText(it.link);
    if (!link && it.link && typeof it.link === 'object') {
      const l = (Array.isArray(it.link) ? it.link[0] : it.link) as Record<string, string>;
      link = l?.['@_href'] || '';
    }
    // Some feeds (e.g. Radio Okapi via FeedBurner) entity-escape their HTML
    // instead of using CDATA, so decode once before stripping tags.
    const unescape = (h: string) => (/&lt;[a-z/!]/i.test(h) ? decodeEntities(h) : h);
    const summaryHtml = unescape(asText(it.description) || asText(it.summary));
    const contentHtml = unescape(asText(it['content:encoded']) || asText(it.content));
    const html = `${summaryHtml} ${contentHtml}`;
    const plain = stripHtml(summaryHtml || contentHtml);
    const cats = asText(it.category);
    const dateRaw = asText(it.pubDate) || asText(it['dc:date']) || asText(it.published) || asText(it.updated);
    const d = dateRaw ? new Date(dateRaw) : null;
    const safeLink = safeHttpUrl(decodeEntities(link));
    if (!title || !safeLink) continue;

    const haystack = `${title} ${plain.slice(0, 600)} ${cats}`;
    out.push({
      id: `${source.id}:${safeLink}`,
      title,
      link: safeLink,
      teaser: teaserOf(plain),
      date: d && !isNaN(d.getTime()) ? d.toISOString() : null,
      image: safeHttpUrl(firstImage(it, html)),
      sourceId: source.id,
      sourceName: source.name,
      commune: detectCommune(`${title} ${plain.slice(0, 600)}`),
    });
    // keep the haystack check for the caller
    (out[out.length - 1] as NewsItem & { _hay?: string })._hay = haystack;
  }
  return out;
}

export function filterKinshasa(items: NewsItem[]): NewsItem[] {
  return items
    .filter((i) => isAboutKinshasa((i as NewsItem & { _hay?: string })._hay || `${i.title} ${i.teaser}`))
    .map((i) => {
      const { _hay, ...rest } = i as NewsItem & { _hay?: string };
      void _hay;
      return rest;
    });
}

// "il y a 12 min", "il y a 3 h", "hier", "2 oct."
export function timeAgo(iso: string | null, now = Date.now()): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  const diff = Math.max(0, now - t);
  const min = Math.round(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const days = Math.round(h / 24);
  if (days === 1) return 'hier';
  if (days < 7) return `il y a ${days} j`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
