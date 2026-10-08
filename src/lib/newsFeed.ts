// Kin Actualité aggregator, shared by /api/actualite (browser refresh) and
// the server-rendered pages (so Google sees the headlines, not a spinner).
// Fetches every source's RSS feed, keeps Kinshasa social news only,
// de-duplicates, sorts newest first and adds each article's share image
// when the feed has none. Plain public RSS: no key, no cost.
import { NEWS_SOURCES, parseFeed, filterKinshasa, type NewsItem } from './news';
import { withUtm } from './utm';
import { findShareImage, mapLimit } from './ogImage';

export const NEWS_REVALIDATE = 900;
const FEED_TIMEOUT_MS = 8000;
const MAX_ITEMS = 60;

// Some WordPress sites refuse requests that look like bots, so we identify
// as a normal browser-compatible client and try backup feed addresses.
export const FEED_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 (compatible; KinshasaLabel/1.0; +https://kinshasalabel.com)',
  Accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.6',
};

export type SourceStatus = { id: string; name: string; site: string; color: string; ok: boolean; count: number };
export type NewsFeed = { updatedAt: string; items: NewsItem[]; sources: SourceStatus[] };

async function fetchSource(source: (typeof NEWS_SOURCES)[number]) {
  let lastError: unknown = null;
  for (const url of [source.feed, ...(source.altFeeds || [])]) {
    try {
      const res = await fetch(url, { headers: FEED_HEADERS, signal: AbortSignal.timeout(FEED_TIMEOUT_MS), next: { revalidate: NEWS_REVALIDATE } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xml = await res.text();
      if (!/<(rss|feed|rdf:RDF)[\s>]/i.test(xml)) throw new Error('not a feed');
      return filterKinshasa(parseFeed(xml, source));
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

export async function getNewsFeed(): Promise<NewsFeed> {
  const results = await Promise.allSettled(NEWS_SOURCES.map(fetchSource));
  const seen = new Set<string>();
  const items: NewsItem[] = [];
  const sources = NEWS_SOURCES.map((s, i) => {
    const r = results[i];
    if (r.status === 'fulfilled') {
      for (const item of r.value) {
        const key = item.title.toLowerCase().replace(/\W+/g, ' ').trim();
        if (seen.has(key) || seen.has(item.link)) continue;
        seen.add(key);
        seen.add(item.link);
        items.push(item);
      }
      return { id: s.id, name: s.name, site: s.site, color: s.color, ok: true, count: r.value.length };
    }
    return { id: s.id, name: s.name, site: s.site, color: s.color, ok: false, count: 0 };
  });

  items.sort((a, b) => (b.date ? Date.parse(b.date) : 0) - (a.date ? Date.parse(a.date) : 0));
  const top = items.slice(0, MAX_ITEMS);
  await mapLimit(top, 10, async (item) => {
    if (!item.image) item.image = await findShareImage(item.link, FEED_HEADERS);
  });

  return {
    updatedAt: new Date().toISOString(),
    items: top.map((item) => ({ ...item, link: withUtm(item.link, 'kin_actualite', item.sourceId) })),
    sources,
  };
}

/** Same feed, but never throws and gives up after `ms` (pages must render fast). */
export async function getNewsFeedSafe(ms = 12000): Promise<NewsFeed | null> {
  try {
    return await Promise.race([getNewsFeed(), new Promise<null>((r) => setTimeout(() => r(null), ms))]);
  } catch {
    return null;
  }
}
