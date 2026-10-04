// Kin Actualité aggregator — fetches every source's RSS feed server-side,
// keeps only Kinshasa items, de-duplicates and sorts newest first.
//
// Cached for 15 minutes (ISR): visitors always get an instant cached
// response, and Next.js refreshes it in the background. Server-side
// fetches aren't subject to the browser CSP, and no API key or paid
// service is involved — it's plain public RSS. Cost: $0.
import { NextResponse } from 'next/server';
import { NEWS_SOURCES, parseFeed, filterKinshasa, type NewsItem } from '../../../lib/news';
import { withUtm } from '../../../lib/utm';

export const revalidate = 900;

const FEED_TIMEOUT_MS = 8000;
const MAX_ITEMS = 80;

// Some WordPress sites sit behind firewalls that refuse requests that look
// like bots, so we identify as a normal browser-compatible client and fall
// back to each site's alternative feed addresses before giving up.
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 (compatible; KinshasaLabel/1.0; +https://kinshasalabel.com)',
  Accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.6',
};

async function fetchSource(source: (typeof NEWS_SOURCES)[number]) {
  let lastError: unknown = null;
  for (const url of [source.feed, ...(source.altFeeds || [])]) {
    try {
      const res = await fetch(url, {
        headers: HEADERS,
        signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
        next: { revalidate },
      });
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

export async function GET() {
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
        items.push({ ...item, link: withUtm(item.link, 'kin_actualite', item.sourceId) });
      }
      return { id: s.id, name: s.name, site: s.site, color: s.color, ok: true, count: r.value.length };
    }
    return { id: s.id, name: s.name, site: s.site, color: s.color, ok: false, count: 0 };
  });

  items.sort((a, b) => (b.date ? Date.parse(b.date) : 0) - (a.date ? Date.parse(a.date) : 0));

  return NextResponse.json({
    updatedAt: new Date().toISOString(),
    items: items.slice(0, MAX_ITEMS),
    sources,
  });
}
