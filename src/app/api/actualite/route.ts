// Kin Actualité aggregator — fetches every source's RSS feed server-side,
// keeps only Kinshasa items, de-duplicates and sorts newest first.
//
// Cached for 15 minutes (ISR): visitors always get an instant cached
// response, and Next.js refreshes it in the background. Server-side
// fetches aren't subject to the browser CSP, and no API key or paid
// service is involved — it's plain public RSS. Cost: $0.
import { NextResponse } from 'next/server';
import { NEWS_SOURCES, parseFeed, filterKinshasa, type NewsItem } from '../../../lib/news';

export const revalidate = 900;

const FEED_TIMEOUT_MS = 8000;
const MAX_ITEMS = 80;

async function fetchSource(source: (typeof NEWS_SOURCES)[number]) {
  const res = await fetch(source.feed, {
    headers: {
      'User-Agent': 'KinshasaLabelBot/1.0 (+https://kinshasalabel.com; news headlines with links to the source)',
      Accept: 'application/rss+xml, application/xml, text/xml, */*',
    },
    signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  return filterKinshasa(parseFeed(xml, source));
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
        items.push(item);
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
