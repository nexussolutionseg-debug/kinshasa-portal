// Kin Actualité — live Kinshasa headlines aggregated from Congolese news
// sites' public RSS feeds (server-side, see src/app/api/actualite/route.ts).
//
// What we show from each source: the headline, a short teaser (max ~180
// characters), the date, a thumbnail when the feed provides one, and a
// link that opens the ORIGINAL article on the source's own site. We never
// republish article bodies — that keeps us on the right side of copyright
// and sends the sources real traffic.
//
// Extra feeds (2026-10-08): a second page of each WordPress feed and the
// publishers' own Kinshasa sections (provinces26, beto, zoom-eco, lepoint
// tags/categories), so the city gets ~3 weeks of headlines, not 2 days.
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
  /** Backup feed addresses, tried in order if the main one fails. */
  altFeeds?: string[];
  /**
   * Extra feeds fetched IN ADDITION to the main one (older page, Kinshasa
   * section). `kinshasa: true` = the publisher's own Kinshasa section, so
   * the city test is skipped (the no-politics filter still applies).
   */
  extraFeeds?: { url: string; kinshasa?: boolean }[];
  color: string;
};

export const NEWS_SOURCES: NewsSource[] = [
  { id: 'radiookapi', name: 'Radio Okapi', site: 'https://www.radiookapi.net', feed: 'https://feeds.feedburner.com/radiookapi/actu?format=xml', color: '#0E5FC9' },
  { id: 'actualite', name: 'Actualite.cd', site: 'https://actualite.cd', feed: 'https://actualite.cd/feed', color: '#D21C2E' },
  { id: 'mediacongo', name: 'Mediacongo', site: 'https://www.mediacongo.net', feed: 'https://www.mediacongo.net/flux_rss.html?type=actualite', color: '#1A82F5' },
  { id: 'lepoint', name: 'Le Point.cd', site: 'https://lepoint.cd', feed: 'https://lepoint.cd/feed/', altFeeds: ['https://lepoint.cd/?feed=rss2', 'https://www.lepoint.cd/feed/'], extraFeeds: [{ url: 'https://lepoint.cd/feed/?paged=2' }, { url: 'https://lepoint.cd/tag/kinshasa/feed/', kinshasa: true }], color: '#A60E1D' },
  { id: 'acp', name: 'ACP', site: 'https://acp.cd', feed: 'https://acp.cd/feed/', altFeeds: ['https://acp.cd/?feed=rss2', 'https://www.acp.cd/feed/'], extraFeeds: [{ url: 'https://acp.cd/feed/?paged=2' }, { url: 'https://acp.cd/category/kinshasa/feed/', kinshasa: true }], color: '#0A2A66' },
  { id: 'provinces26', name: 'Provinces26 RDC', site: 'https://provinces26rdc.com', feed: 'https://provinces26rdc.com/feed/', extraFeeds: [{ url: 'https://provinces26rdc.com/feed/?paged=2' }, { url: 'https://provinces26rdc.com/category/kinshasa/feed/', kinshasa: true }, { url: 'https://provinces26rdc.com/category/kinshasa/feed/?paged=2', kinshasa: true }], color: '#2E7D32' },
  { id: 'zoomeco', name: 'Zoom Eco', site: 'https://zoom-eco.net', feed: 'https://zoom-eco.net/feed/', extraFeeds: [{ url: 'https://zoom-eco.net/tag/kinshasa/feed/', kinshasa: true }], color: '#E8590C' },
  { id: 'mines', name: 'Mines.cd', site: 'https://mines.cd', feed: 'https://mines.cd/feed/', altFeeds: ['https://mines.cd/?feed=rss2', 'https://www.mines.cd/feed/'], extraFeeds: [{ url: 'https://mines.cd/feed/?paged=2' }], color: '#6D4C41' },
  { id: 'beto', name: 'Beto.cd', site: 'https://beto.cd', feed: 'https://beto.cd/feed/', extraFeeds: [{ url: 'https://beto.cd/feed/?paged=2' }, { url: 'https://beto.cd/tag/kinshasa/feed/', kinshasa: true }], color: '#7B3FE4' },
];

export type NewsItem = {
  id: string;
  title: string;
  link: string;
  teaser: string;          // ~180 chars, for cards
  summary?: string;        // up to ~420 chars, for the detail view (publisher's own excerpt)
  author?: string | null;
  categories?: string[];
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
// are about the city itself (see isAboutKinshasa below for the exact rule).

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

// "Kinshasa" alone is NOT enough: Congolese press also uses it to mean the
// national government ("Kinshasa veut…", "entre Kinshasa et Kigali"). So an
// item counts as Kinshasa news only when it:
//   - names one of the 24 communes, or says Kinois / Kinoise, or
//   - opens with the "Kinshasa :" dateline the local press uses for city news, or
//   - places the story IN the city ("à Kinshasa", "ville de Kinshasa",
//     "gouverneur de Kinshasa", "habitants de Kinshasa", …).
// Checked against the headline and the short teaser only — not the whole
// article body, which mentions Kinshasa in passing far too often.
const KINOIS_RE = /kinois(?:e|es)?|Kin la belle/i;
const DATELINE_RE = /^\s*(?:RDC\s*[-–:]\s*)?Kinshasa\s*[:,–]/i;
// "à Kinshasa" in a HEADLINE means the story is about the city ("coupures
// d'électricité à Kinshasa"); in a teaser it's usually just where a national
// announcement was made ("le ministre a annoncé à Kinshasa…"), so it only
// counts in the title.
const IN_CITY_TITLE_RE = /(?:^|\s)(?:à|a|dans|sur)\s+Kinshasa\b/i;
const CITY_RE =
  /\b(?:de la ville de|ville de|ville-province de|province de|gouverneur de|gouvernorat de|habitants de|rues de|routes de|quartiers? de|communes? de|marchés? de|bourgmestres? de|embouteillages? (?:à|de)|inondations? (?:à|de)|planification de|urbanisme de|aménagement de|assainissement de|mobilité (?:à|de)|transports? (?:à|de)|circulation (?:à|de)|desserte (?:à|de))\s+Kinshasa\b|\bKinshasa\b[^.]{0,60}\burgences urbaines\b|\bKinshasa[\s-]ville\b|\bville[- ]province\b/i;

// "Kinshasa replonge dans l'insalubrité", "Kinshasa : files d'attente pour
// le carburant"… — the city named in the headline next to an everyday-life
// subject. Government / diplomacy uses ("Kinshasa veut…", "Kinshasa et
// Kigali") are removed afterwards by the no-politics filter.
const CITY_LIFE_RE =
  /insalubrit|assainissement|d[ée]chets|immondices|carburant|essence|embouteillage|bouchons?\b|circulation|inondation|[ée]rosion|pluie|[ée]lectricit[ée]|d[ée]lestage|coupures?|snel|regideso|eau potable|[ée]coles?|[ée]l[èe]ves|enseignants|universit|h[ôo]pital|sant[ée]|cholera|chol[ée]ra|mpox|march[ée]s?\b|prix|loyer|transport|bus\b|taxis?|wewa|routes?\b|voirie|travaux|chantier|fourri[èe]re|police|kuluna|ins[ée]curit|vols?\b|braquage|incendie|naufrage|concert|festival|musique|rumba|th[ée][âa]tre|exposition|stade|fête|bars?\b|bo[îi]tes de nuit|restaurants?|h[ôo]tels?|tourisme|barreau|escroquer|jeunes|enfants|femmes/i;

export function detectCommune(text: string): string | null {
  for (const [re, name] of COMMUNE_PATTERNS) if (re.test(text)) return name;
  return null;
}

export function isAboutKinshasa(title: string, teaser = ''): boolean {
  const both = `${title} ${teaser}`;
  return (
    detectCommune(both) !== null ||
    KINOIS_RE.test(both) ||
    DATELINE_RE.test(title) ||
    DATELINE_RE.test(teaser) ||
    IN_CITY_TITLE_RE.test(title) ||
    CITY_RE.test(both) ||
    (/\bKinshasa\b/i.test(title) && CITY_LIFE_RE.test(title))
  );
}

// ---------------------------------------------------------------------------
// No politics (client decision, 2026-10-07): Kin Actualité shows the city's
// social life — services, health, schools, culture, sport, markets, works,
// safety — not politics, elections, government affairs or diplomacy.
// The headline is the strongest signal; the teaser only counts for words
// that are political whatever the context (a senator opening a building
// fair is still city news). Sport headlines are never treated as political
// ("RDC-Ouganda" is a football match, not diplomacy).

const POLITICAL_TITLE_RE = new RegExp(
  [
    'politi(?:que|ques|cien|ciens|cienne)', '[ée]lections?', '[ée]lectora(?:l|le|ux|les)', 'scrutin', 'la pr[ée]sidentielle',
    'pr[ée]sidentielles?\\s+de\\s+20\\d\\d', 'candidature', 'd[ée]put[ée]s?', 's[ée]nat(?:eur|eurs|rice)?\\b', 'assembl[ée]e\\s+(?:nationale|provinciale)',
    'parlement(?:aire|aires)?', 'pl[ée]ni[èe]re', 'motion', 'investiture', 'premier\\s+ministre', "chef\\s+de\\s+l['’][ée]tat",
    'pr[ée]sident\\s+de\\s+la\\s+r[ée]publique', 'tshisekedi', 'kabila', 'katumbi', 'fayulu', 'kamerhe', 'suminwa', 'muzito', 'matata',
    'udps', 'union\\s+sacr[ée]e', 'lamuka', '\\bfcc\\b', 'opposition', 'majorit[ée]\\s+(?:pr[ée]sidentielle|parlementaire)', 'dialogue\\s+national',
    'constitution(?:nel|nelle)?', 'r[ée]f[ée]rendum', '\\bceni\\b', '\\bm23\\b', '\\bafc\\b', 'fdlr', 'kagame', 'kigali', 'monusco',
    'conseil\\s+de\\s+s[ée]curit[ée]', 'diplomat', 'ambassad', 'sanctions?', 'accords?\\s+de\\s+(?:paix|washington|doha|luanda)',
    'coop[ée]ration\\s+(?:judiciaire|militaire|bilat[ée]rale)', 'interpell?e', 'boycott', 'coup\\s+d[\'’][ée]tat', 'r[ée]vision\\s+constitutionnelle',
    'kinshasa\\s+et\\s+(?:moscou|kigali|brazzaville|washington|paris|p[ée]kin|luanda|kampala|bruxelles)',
    'rdc\\s*[-–]\\s*(?:russie|chine|rwanda|ouganda|burundi|angola|france|belgique|usa|[ée]tats-unis|ue|union\\s+europ[ée]enne)\\s*:',
  ].join('|'),
  'i'
);
// "Kinshasa, Luanda et Lusaka veulent…" = governments talking, not the city.
const CAPITALS = '(?:luanda|lusaka|kigali|kampala|brazzaville|bujumbura|nairobi|pretoria|addis-abeba|moscou|washington|paris|bruxelles|p[ée]kin|londres|doha|lom[ée])';
const GOVERNMENTS_RE = new RegExp(`\\bkinshasa\\s*(?:,|et)\\s*${CAPITALS}|${CAPITALS}\\s*(?:,|et)\\s*kinshasa\\b`, 'i');

// Social news only (client, 2026-10-07): business deals and investment /
// trade news are left out too (they are economy, not city life).
const BUSINESS_TITLE_RE =
  /investiss|investisseurs?|accords? (?:sign|de financement|de partenariat|commerciaux|commercial)|protocole d['’]accord|chambre de commerce|\banapi\b|export(?:ation)?s?\b|corridor|interconnexion|fonds propres|millions? (?:usd|de dollars)|milliards? (?:usd|de dollars)|d[ée]jeuner-conf[ée]rence|forum [ée]conomique|commerce ext[ée]rieur|zone[s]? [ée]conomique/i;

const POLITICAL_TEASER_RE =
  /[ée]lections?\b|[ée]lectora(?:l|le|ux)|la pr[ée]sidentielle|dialogue national|parti politique|union sacr[ée]e|\budps\b|lamuka|\bm23\b|r[ée]vision constitutionnelle/i;
const POLITICAL_CATEGORY_RE = /politi|diplomat|[ée]lection|parlement|gouvernance/i;
const SPORT_RE = /\b(?:foot|football|match|l[ée]opards|fecofa|linafoot|championnat|basket|handball|volley|boxe|athl[ée]tisme|coupe d['’]afrique|\bcan\b|tp mazembe|v\.?club|dcmp)\b/i;

export function isPolitical(title: string, teaser = '', categories: string[] = []): boolean {
  if (SPORT_RE.test(title)) return false;
  return (
    POLITICAL_TITLE_RE.test(title) ||
    GOVERNMENTS_RE.test(title) ||
    BUSINESS_TITLE_RE.test(title) ||
    POLITICAL_TEASER_RE.test(teaser) ||
    categories.some((c) => POLITICAL_CATEGORY_RE.test(c))
  );
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
    const catList = (Array.isArray(it.category) ? it.category : it.category ? [it.category] : [])
      .map((c) => stripHtml(asText(c)))
      .filter((c) => c && c.length < 40 && !/^(non class|uncategori|actualit[ée]s?$|a la une|à la une|une$)/i.test(c));
    const cats = catList.join(' ');
    const author = stripHtml(asText(it['dc:creator']) || asText(it.author) || '').replace(/^.*\(([^)]+)\)$/, '$1').slice(0, 60) || null;
    const dateRaw = asText(it.pubDate) || asText(it['dc:date']) || asText(it.published) || asText(it.updated);
    const d = dateRaw ? new Date(dateRaw) : null;
    const safeLink = safeHttpUrl(decodeEntities(link));
    if (!title || !safeLink) continue;

    void cats;
    const haystack = JSON.stringify([title, teaserOf(plain, 400)]);
    out.push({
      id: `${source.id}:${safeLink}`,
      title,
      link: safeLink,
      teaser: teaserOf(plain),
      summary: teaserOf(plain, 420),
      author: author && !/admin|redaction@|^\S+@\S+$/i.test(author) ? author : null,
      categories: [...new Set(catList)].slice(0, 3),
      date: d && !isNaN(d.getTime()) ? d.toISOString() : null,
      image: safeHttpUrl(firstImage(it, html)),
      sourceId: source.id,
      sourceName: source.name,
      commune: detectCommune(`${title} ${teaserOf(plain, 400)}`),
    });
    // keep the haystack check for the caller
    (out[out.length - 1] as NewsItem & { _hay?: string })._hay = haystack;
  }
  return out;
}

/** Headlines older than this are dropped (section feeds can hold years-old posts). */
export const NEWS_MAX_AGE_DAYS = 21;

export function filterKinshasa(items: NewsItem[], opts: { kinshasaSection?: boolean; now?: number } = {}): NewsItem[] {
  const oldest = (opts.now ?? Date.now()) - NEWS_MAX_AGE_DAYS * 86400000;
  return items
    .filter((i) => {
      if (i.date && Date.parse(i.date) < oldest) return false;
      const hay = (i as NewsItem & { _hay?: string })._hay;
      const [title, teaser] = hay ? (JSON.parse(hay) as [string, string]) : [i.title, i.teaser];
      return (opts.kinshasaSection || isAboutKinshasa(title, teaser)) && !isPolitical(i.title, teaser, i.categories || []);
    })
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
