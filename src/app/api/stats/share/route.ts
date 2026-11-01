// Create a Kin Stats partner link (team only).
// POST { name: "Hôtel X", view: "partenaire" | "complet", months: 1..12 }
import { NextResponse } from 'next/server';
import { signShare, type StatsView } from '../../../../lib/statsShare';
import { bearer, isTeamToken } from '../../../../lib/statsAuth';
import { SITE_URL } from '../../../../lib/utm';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!(await isTeamToken(bearer(req)))) return NextResponse.json({ ok: false, reason: 'team-only' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = String(body?.name || '').trim().replace(/\s+/g, ' ').slice(0, 60) || 'Partenaire';
  const view: StatsView = body?.view === 'complet' ? 'complet' : 'partenaire';
  const months = Math.min(12, Math.max(1, Math.round(Number(body?.months) || 3)));
  const now = Math.floor(Date.now() / 1000);
  const token = signShare({ n: name, v: view, e: now + months * 31 * 86400, i: now });
  if (!token) return NextResponse.json({ ok: false, reason: 'not-configured' }, { status: 503 });
  const base = (process.env.NEXT_PUBLIC_SITE_URL || SITE_URL).replace(/\/$/, '');
  return NextResponse.json({ ok: true, url: `${base}/stats/${token}`, expires: new Date((now + months * 31 * 86400) * 1000).toISOString() });
}
