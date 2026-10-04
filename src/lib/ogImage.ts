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

// First real photo in the article body: the WordPress featured image
// (wp-post-image) if present, else the first <img> from an uploads/files
// folder. Looks at src, data-src / data-lazy-src (lazy loading) and srcset.
function pickBodyImage(html: string, base: string): string | null {
  const body = html.split(/<\/head>/i)[1] || '';
  const tags = body.match(/<img\b[^>]*>/gi) || [];
  const srcOf = (tag: string) => {
    const attr = (n: string) => tag.match(new RegExp(`\\s${n}=["']([^"']+)["']`, 'i'))?.[1];
    const set = attr('srcset') || attr('data-srcset');
    return attr('data-src') || attr('data-lazy-src') || attr('src') || (set ? set.split(',')[0].trim().split(/\s+/)[0] : undefined);
  };
  const ordered = [...tags.filter((t) => /wp-post-image|featured|attachment-/i.test(t)), ...tags];
  for (const tag of ordered) {
    const src = srcOf(tag);
    if (!src || src.startsWith('data:')) continue;
    if (!/uploads|\/files\/|\/images?\/|\/media\//i.test(src)) continue;
    const w = Number(tag.match(/\swidth=["']?(\d+)/i)?.[1] || 0);
    if (w && w < 200) continue; // icons, avatars, share buttons
    const abs = absolutize(src, base);
    if (abs) return abs;
  }
  return null;
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
      let headDone = false;
      while (html.length < MAX_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
        if (!headDone && /<\/head>/i.test(html)) {
          headDone = true;
          const raw = pickMeta(html.split(/<\/head>/i)[0], ['og:image:secure_url', 'og:image', 'twitter:image', 'twitter:image:src']);
          result = raw ? absolutize(raw, res.url || articleUrl) : null;
          if (result) break; // share image found: no need for the body
        }
        // Some sites (e.g. Provinces26 RDC) declare no share image: fall back
        // to the article's main photo — stop once one is found.
        if (headDone && pickBodyImage(html, res.url || articleUrl)) break;
      }
      reader.cancel().catch(() => {});
      if (!result) result = pickBodyImage(html, res.url || articleUrl);
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
