import { createClient } from '@supabase/supabase-js';

// Browser + shared Supabase client (public anon key; row-level security
// decides what each visitor or team member may read or write).
//
// Vercel PREVIEW builds have no Supabase key (only Production does). That's
// a safety feature — previews can never write to the live database — so a
// missing key must not crash the build: the client is then created with a
// placeholder key, every request is refused by Supabase, and pages fall
// back to their empty states. See README → "How a change goes live".
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wsadnbdgqanmjhfhjyhx.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** False on builds without database credentials (e.g. Vercel previews). */
export const hasDatabase = Boolean(supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey || 'no-database-key-in-this-environment', {
  auth: hasDatabase ? undefined : { persistSession: false, autoRefreshToken: false },
});
