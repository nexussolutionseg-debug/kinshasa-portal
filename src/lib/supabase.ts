import { createClient } from '@supabase/supabase-js';

// Was hardcoded to a single project's URL, silently ignoring
// NEXT_PUBLIC_SUPABASE_URL entirely — so setting that env var in Vercel
// never actually did anything, only the (mismatched) anon key changed.
// Falls back to the same URL as before so existing deployments that only
// set the anon key keep working unchanged.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wsadnbdgqanmjhfhjyhx.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
