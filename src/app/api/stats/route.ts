// Kin Stats data (2026-11-01).
//   GET /api/stats?days=28                 + Authorization: Bearer <team session>  → full view
//   GET /api/stats?days=28&share=<token>   partner link                            → the link's view
// Add &demo=1 to see sample data while Google Analytics isn't connected yet.
import { NextResponse } from 'next/server';
import { RANGES, gaConfigured, type RangeDays } from '../../../lib/ga4';
import { buildKinStats } from '../../../lib/kinStats';
import { verifyShare } from '../../../lib/statsShare';
import { bearer, isTeamToken } from '../../../lib/statsAuth';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const asked = Number(url.searchParams.get('days'));
  const days = (RANGES as readonly number[]).includes(asked) ? (asked as RangeDays) : 28;
  const demo = url.searchParams.get('demo') === '1';
  const noStore = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' };

  const share = url.searchParams.get('share');
  // /stats/demo: sample data, ONLY while Google Analytics isn't connected
  // (e.g. on Vercel previews) so the design can be reviewed without a login.
  if (share === 'demo') {
    if (gaConfigured()) return NextResponse.json({ ok: false, reason: 'link-invalid' }, { status: 403, headers: noStore });
    const data = await buildKinStats({ days, view: 'partenaire', partner: 'Démo', userToken: null, demo: true });
    return NextResponse.json({ ok: true, expires: null, ...data }, { headers: noStore });
  }
  if (share) {
    const p = verifyShare(share);
    if (!p) return NextResponse.json({ ok: false, reason: 'link-invalid' }, { status: 403, headers: noStore });
    const data = await buildKinStats({ days, view: p.v, partner: p.n, userToken: null, demo });
    return NextResponse.json({ ok: true, expires: new Date(p.e * 1000).toISOString(), ...data }, { headers: noStore });
  }

  const token = bearer(req);
  if (!(await isTeamToken(token))) return NextResponse.json({ ok: false, reason: 'team-only' }, { status: 401, headers: noStore });
  const data = await buildKinStats({ days, view: 'complet', partner: null, userToken: token, demo });
  return NextResponse.json({ ok: true, expires: null, ...data }, { headers: noStore });
}
