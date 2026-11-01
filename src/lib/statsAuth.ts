// Who may read Kin Stats: a signed-in team account (kl_admins), checked by
// asking Supabase with the visitor's own session token — the same rule the
// database already uses for every backoffice write.
import { createClient } from '@supabase/supabase-js';

export async function isTeamToken(token: string | null): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !key) return false;
  try {
    const sb = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: user } = await sb.auth.getUser(token);
    if (!user?.user) return false;
    const { data, error } = await sb.rpc('is_kl_admin');
    return !error && data === true;
  } catch {
    return false;
  }
}

export function bearer(req: Request): string | null {
  const h = req.headers.get('authorization') || '';
  return h.startsWith('Bearer ') ? h.slice(7).trim() || null : null;
}
