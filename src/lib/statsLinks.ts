// Kin Stats partner links (2026-11-01, v2): every link is a row in the
// `stats_links` table, so the team can list, rename, extend, revoke or
// delete each one from Backoffice → Statistiques. Visitors can't read that
// table; the partner page asks the database through stats_link_open(),
// which only answers for a link that exists, isn't revoked and hasn't
// expired (and counts the visit). See supabase/pending/20261101120000_*.sql.
import { createClient } from '@supabase/supabase-js';

export type StatsView = 'complet' | 'partenaire';
export type OpenLink = { id: string; name: string; view: StatsView; expires: string };

export const LINK_TOKEN_RE = /^[A-Za-z0-9_-]{32,64}$/;

export async function openStatsLink(token: string | null | undefined, countVisit: boolean): Promise<OpenLink | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !token || !LINK_TOKEN_RE.test(token)) return null;
  try {
    const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await sb.rpc('stats_link_open', { p_token: token, p_count: countVisit });
    const row = Array.isArray(data) ? data[0] : null;
    if (error || !row) return null;
    return { id: row.link_id, name: row.name, view: row.view === 'complet' ? 'complet' : 'partenaire', expires: row.expires_at };
  } catch {
    return null;
  }
}
