// Kin Stats data (2026-11-01).
//   GET /api/stats?days=28                       + Authorization: Bearer <team session> → full view
//   GET /api/stats?start=2026-10-01&end=2026-10-31 (custom dates, same access rules)
//   GET /api/stats?days=28&share=<link>          partner link (Backoffice → Statistiques) → the link's view
// share=demo → sample data, ONLY while Google Analytics isn't connected.
import { NextResponse } from 'next/server';
import { gaConfigured, makeRange } from '../../../lib/ga4';
import { buildKinStats } from '../../../lib/kinStats';
import { openStatsLink } from '../../../lib/statsLinks';
import { bearer, isTeamToken } from '../../../lib/statsAuth';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams;
  const range = makeRange({ days: Number(q.get('days')), start: q.get('start'), end: q.get('end') });
  const noStore = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' };
  const share = q.get('share');

  if (share === 'demo') {
    if (gaConfigured()) return NextResponse.json({ ok: false, reason: 'link-invalid' }, { status: 403, headers: noStore });
    const data = await buildKinStats({ range, view: 'partenaire', partner: 'Démo', userToken: null, demo: true });
    return NextResponse.json({ ok: true, expires: null, ...data }, { headers: noStore });
  }
  if (share) {
    const link = await openStatsLink(share, false);
    if (!link) return NextResponse.json({ ok: false, reason: 'link-invalid' }, { status: 403, headers: noStore });
    const data = await buildKinStats({ range, view: link.view, partner: link.name, userToken: null, demo: false });
    return NextResponse.json({ ok: true, expires: link.expires, ...data }, { headers: noStore });
  }

  const token = bearer(req);
  if (!(await isTeamToken(token))) return NextResponse.json({ ok: false, reason: 'team-only' }, { status: 401, headers: noStore });
  const data = await buildKinStats({ range, view: 'complet', partner: null, userToken: token, demo: q.get('demo') === '1' });
  return NextResponse.json({ ok: true, expires: null, ...data }, { headers: noStore });
}
