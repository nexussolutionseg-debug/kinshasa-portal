// Server-side reads (pages rendered on the server so Google and link
// previews see the real content). Uses the public anon key: row-level
// security applies exactly as for a visitor, so hidden places never leak.
// Every helper returns an empty list instead of throwing, so a database
// hiccup never breaks a page — the browser refreshes the data anyway.
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function client() {
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function safe<T>(fn: () => PromiseLike<{ data: T | null; error: unknown }>, fallback: T): Promise<T> {
  try {
    const timeout = new Promise<{ data: null; error: string }>((r) => setTimeout(() => r({ data: null, error: 'timeout' }), 6000));
    const { data, error } = await Promise.race([fn(), timeout]);
    return error || data == null ? fallback : data;
  } catch {
    return fallback;
  }
}

export async function serverPlaces(filter?: { vertical?: string }): Promise<any[]> {
  const sb = client();
  if (!sb) return [];
  const rows = await safe<any[]>(() => {
    let q = sb.from('places').select('*').order('created_at', { ascending: false });
    if (filter?.vertical) q = q.eq('vertical', filter.vertical);
    return q;
  }, []);
  return rows.filter((p) => p.published !== false);
}

export async function serverEvents(): Promise<any[]> {
  const sb = client();
  if (!sb) return [];
  return safe<any[]>(() => sb.from('events').select('*').order('event_date', { ascending: true }), []);
}

export async function serverBanners(): Promise<any[]> {
  const sb = client();
  if (!sb) return [];
  return safe<any[]>(() => sb.from('banners').select('*').eq('active', true), []);
}

export async function serverSettingsRaw(): Promise<unknown> {
  const sb = client();
  if (!sb) return null;
  const row = await safe<any>(() => sb.from('site_settings').select('data').eq('id', 1).maybeSingle(), null);
  return row?.data ?? null;
}
