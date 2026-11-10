// Partner report (2026-11-10): /rapport/<link>, one private link per partner
// (Backoffice → Lieux → Modifier → Rapport partenaire). Data comes from the
// database function place_report(), which only answers for an existing link.
import { createClient } from '@supabase/supabase-js';

export const REPORT_TOKEN_RE = /^[A-Za-z0-9_-]{32,64}$/;

export type PlaceReport = {
  place: { id: number; name: string; commune: string; vertical: string; place_type: string | null; pack: string | null; since: string | null; until: string | null; rating_sum: number; rating_count: number };
  from: string;
  to: string;
  totals: Record<string, number>;
  daily: { day: string; kind: string; n: number }[];
  reviews: { count: number; written: number; avg: number | null };
  events: { id: number; title: string; date: string }[];
};

/** "2026-11" → first and last day; anything else → the current month in Kinshasa. */
export function monthRange(mois: string | null | undefined, now = Date.now()): { key: string; from: string; to: string } {
  const m = /^(\d{4})-(\d{2})$/.exec(mois || '');
  const d = new Date(now + 3600000);
  const y = m ? Number(m[1]) : d.getUTCFullYear();
  const mo = m ? Number(m[2]) : d.getUTCMonth() + 1;
  const safeMo = mo >= 1 && mo <= 12 ? mo : d.getUTCMonth() + 1;
  const last = new Date(Date.UTC(y, safeMo, 0)).getUTCDate();
  const key = `${y}-${String(safeMo).padStart(2, '0')}`;
  return { key, from: `${key}-01`, to: `${key}-${String(last).padStart(2, '0')}` };
}

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export async function loadPlaceReport(token: string, from: string, to: string, count: boolean): Promise<PlaceReport | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !REPORT_TOKEN_RE.test(token)) return null;
  try {
    const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await sb.rpc('place_report', { p_token: token, p_from: from, p_to: to, p_count: count });
    if (error || !data || !data.place) return null;
    return data as PlaceReport;
  } catch {
    return null;
  }
}

/** A new random link token (browser or server). */
export function newReportToken(): string {
  const bytes = new Uint8Array(30);
  crypto.getRandomValues(bytes);
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
