// Google Maps share links → position (2026-11-12). The Google Maps app shares
// short links (maps.app.goo.gl/…) that hide the coordinates; this route,
// for team accounts only, follows the link to Google's full address and
// reads the pin from it. No Google API, no key, no billing.
import { NextResponse } from 'next/server';
import { isTeamToken, bearer } from '../../../lib/statsAuth';
import { parsePosition, isShortMapLink } from '../../../lib/geo';

export const dynamic = 'force-dynamic';

const ALLOWED = /^https:\/\/(maps\.app\.goo\.gl|goo\.gl|g\.co|(www\.|maps\.)?google\.[a-z.]+|consent\.google\.[a-z.]+)\//i;

export async function GET(req: Request) {
  if (!(await isTeamToken(bearer(req)))) return NextResponse.json({ ok: false, error: 'Réservé à l’équipe.' }, { status: 401 });
  let url = (new URL(req.url).searchParams.get('url') || '').trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  url = url.replace(/^http:/i, 'https:');
  if (!isShortMapLink(url) && !ALLOWED.test(url)) return NextResponse.json({ ok: false, error: 'Lien Google Maps attendu.' });

  const seen: string[] = [url];
  try {
    for (let i = 0; i < 6; i++) {
      const pos = parsePosition(decodeURIComponent(url));
      if (pos) return NextResponse.json({ ok: true, ...pos, url });
      // consent.google.* wraps the real address in ?continue=
      const cont = /[?&]continue=([^&]+)/.exec(url);
      if (/consent\.google\./i.test(url) && cont) {
        url = decodeURIComponent(cont[1]);
        seen.push(url);
        continue;
      }
      const r = await fetch(url, {
        redirect: 'manual',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KinshasaLabel/1.0)', 'Accept-Language': 'fr' },
        signal: AbortSignal.timeout(8000),
      });
      const next = r.headers.get('location');
      if (!next) {
        // Last page: Google sometimes puts the pin in the page itself.
        const html = r.status === 200 ? (await r.text()).slice(0, 400_000) : '';
        const inPage = parsePosition(html.match(/!3d-?\d+\.\d+!4d-?\d+\.\d+/)?.[0] || html.match(/@-?\d+\.\d+,-?\d+\.\d+/)?.[0] || '');
        if (inPage) return NextResponse.json({ ok: true, ...inPage, url });
        break;
      }
      url = new URL(next, url).toString();
      if (!ALLOWED.test(url)) break;
      seen.push(url);
    }
  } catch {
    return NextResponse.json({ ok: false, error: 'Google Maps ne répond pas. Réessaie, ou touche la carte à l’endroit exact.' });
  }
  return NextResponse.json({
    ok: false,
    error: 'Pas de position dans ce lien. Dans Google Maps, ouvre la fiche du lieu (l’épingle rouge), puis Partager → Copier le lien.',
  });
}
