// Backoffice → Prospects: find a business's position on OpenStreetMap
// (Nominatim, free, no key). Team accounts only (same check as Kin Stats),
// limited to greater Kinshasa, so the site never becomes an open proxy.
// Nominatim's usage policy: identify the app, max ~1 request/second, cache.
import { NextResponse } from 'next/server';
import { isTeamToken, bearer } from '../../../lib/statsAuth';
import { inKinshasa } from '../../../lib/geo';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!(await isTeamToken(bearer(req)))) return NextResponse.json({ error: 'Réservé à l’équipe.' }, { status: 401 });
  const u = new URL(req.url);
  const q = (u.searchParams.get('q') || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  const commune = (u.searchParams.get('commune') || '').trim().slice(0, 40);
  if (q.length < 2) return NextResponse.json({ results: [] });
  const params = new URLSearchParams({
    q: [q, commune, 'Kinshasa'].filter(Boolean).join(', '),
    format: 'jsonv2',
    countrycodes: 'cd',
    viewbox: '15.0,-3.9,16.6,-5.2',
    bounded: '1',
    limit: '6',
    addressdetails: '0',
    'accept-language': 'fr',
  });
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { 'User-Agent': 'KinshasaLabel/1.0 (https://www.kinshasalabel.com; contact@kinshasalabel.com)' },
      next: { revalidate: 86400 },
    });
    if (!r.ok) return NextResponse.json({ results: [], error: `OpenStreetMap indisponible (${r.status}).` });
    const data = (await r.json()) as any[];
    const results = (Array.isArray(data) ? data : [])
      .map((d) => ({ name: d.name || '', label: d.display_name || '', type: d.type || '', lat: Number(d.lat), lng: Number(d.lon), osm: `${d.osm_type || ''}/${d.osm_id || ''}` }))
      .filter((d) => Number.isFinite(d.lat) && Number.isFinite(d.lng) && inKinshasa(d.lat, d.lng));
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [], error: 'OpenStreetMap ne répond pas. Réessaie dans un instant.' });
  }
}
