// Finds an article's "share image" (og:image / twitter:image) for news items
// whose RSS feed has no picture. Every Congolese news site we pull from sets
// one on its article pages (it's what WhatsApp/Facebook previews use).
//
// Only the <head> of the page is downloaded (we stop reading as soon as
// </head> arrives, max ~300 KB), each request times out after 6 s, and
// results are memoised per server instance, so a refresh of the news feed
// costs a handful of small requests at most.
const cache = new Map<string, string | null>();
const MAX_BYTES = 300_000;

function pickMeta(head: string, keys: string[]): string | null {
  for (const key of keys) {
    // <meta property="og:image" content="…"> in either attribute order
    const re1 = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']+)["']`, 'i');
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${key}["']`, 'i');
    const m = head.match(re1) || head.match(re2);
    if (m) return m[1];
  }
  const link = head.match(/<link[^>]+rel=["']image_src["'][^>]*href=["']([^"']+)["']/i);
  return link ? link[1] : null;
}

function absolutize(src: string, base: string): string | null {
  try {
    const u = new URL(src.replace(/&amp;/g, '&'), base);
    if (u.protocol === 'http:') u.protocol = 'https:';
    if (u.protocol !== 'https:') return null;
    // skip obvious logos / placeholders — judged on the FILE NAME only
    // (Drupal sites like Radio Okapi keep real photos under /sites/default/)
    const file = u.pathname.split('/').pop() || '';
    if (/logo|favicon|placeholder|avatar|default[-_.]/i.test(file)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export async function findShareImage(articleUrl: string, headers: Record<string, string>): Promise<string | null> {
  if (cache.has(articleUrl)) return cache.get(articleUrl)!;
  let result: string | null = null;
  try {
    const res = await fetch(articleUrl, { headers, signal: AbortSignal.timeout(5000), cache: 'no-store', redirect: 'follow' });
    if (res.ok && res.body && /html/i.test(res.headers.get('content-type') || 'text/html')) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let html = '';
      while (html.length < MAX_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
        if (/<\/head>/i.test(html)) break;
      }
      reader.cancel().catch(() => {});
      const head = html.split(/<\/head>/i)[0];
      const raw = pickMeta(head, ['og:image:secure_url', 'og:image', 'twitter:image', 'twitter:image:src']);
      result = raw ? absolutize(raw, res.url || articleUrl) : null;
    }
  } catch {
    result = null;
  }
  cache.set(articleUrl, result);
  return result;
}

// Run async jobs with a small concurrency limit (be polite to news sites).
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k]);
      }
    })
  );
  return out;
}
