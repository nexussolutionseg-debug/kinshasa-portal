// Daily lead scan → Prospects (2026-11-10).
// The scheduled task « Kinshasa Label Daily Lead Scan » (5 verified
// restaurants / hotels a day, from Google results, Facebook, Instagram,
// TripAdvisor, Booking/Airbnb, news and OpenStreetMap) saves its finds in
// the agency's Nexus Hub (table kin_leads). This route, for signed-in team
// accounts only, reads the new ones through kin_leads_export(); the
// backoffice then adds them to kl_leads with the team member's own session.
// Setting (Vercel → Environment Variables, Production): KIN_LEADS_KEY.
import { NextResponse } from 'next/server';
import { isTeamToken, bearer } from '../../../../lib/statsAuth';

export const dynamic = 'force-dynamic';

// Nexus Hub's public (publishable) address and key: safe to ship, the
// export only answers with KIN_LEADS_KEY, which stays on the server.
const HUB_URL = process.env.NEXUS_HUB_URL || 'https://gqffecgufgxmaraotcba.supabase.co';
const HUB_KEY = process.env.NEXUS_HUB_ANON_KEY || 'sb_publishable_dYMHEgxh7aD3-QBpbeFP8A_aRq5vpaD';

export async function GET(req: Request) {
  const noStore = { 'Cache-Control': 'private, no-store' };
  if (!(await isTeamToken(bearer(req)))) return NextResponse.json({ ok: false, reason: 'team-only' }, { status: 401, headers: noStore });
  const key = process.env.KIN_LEADS_KEY;
  if (!key) return NextResponse.json({ ok: false, reason: 'not-configured' }, { headers: noStore });
  const since = Math.max(0, Number(new URL(req.url).searchParams.get('since')) || 0);
  try {
    const r = await fetch(`${HUB_URL}/rest/v1/rpc/kin_leads_export`, {
      method: 'POST',
      headers: { apikey: HUB_KEY, Authorization: `Bearer ${HUB_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_key: key, p_since: since }),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    const data = await r.json().catch(() => null);
    if (!r.ok || data === null) return NextResponse.json({ ok: false, reason: 'hub-refused' }, { headers: noStore });
    return NextResponse.json({ ok: true, leads: Array.isArray(data) ? data : [] }, { headers: noStore });
  } catch {
    return NextResponse.json({ ok: false, reason: 'hub-unreachable' }, { headers: noStore });
  }
}
