// Newsletter sign-up (popup + footer form), 2026-10-11.
//
//  1. Saves the address in Supabase (public.subscribers), as before.
//  2. If it's a NEW subscriber and Brevo is configured, adds the contact to
//     the Brevo list (for the weekly newsletter) and sends the welcome email
//     (src/lib/welcomeEmail.ts). An address already subscribed never gets a
//     second welcome email, so this can't be used to spam someone.
//
// Brevo settings (Vercel → Project → Settings → Environment Variables,
// Production only):
//   BREVO_API_KEY        required to send anything (Brevo → SMTP & API → API keys)
//   BREVO_LIST_ID        optional, the number of the "Newsletter" list
//   BREVO_SENDER_EMAIL   optional, default contact@kinshasalabel.com (must be
//                        a verified sender / authenticated domain in Brevo)
//   BREVO_SENDER_NAME    optional, default "Kinshasa Label"
// Without BREVO_API_KEY the sign-up works exactly as before (saved only).
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { WELCOME_SUBJECT, welcomeEmailHtml, welcomeEmailText } from '../../../lib/welcomeEmail';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;
const BREVO = 'https://api.brevo.com/v3';

// Light per-instance rate limit: 5 sign-ups per address per 10 minutes.
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 600_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > 5;
}

async function brevo(path: string, body: unknown, key: string) {
  const res = await fetch(`${BREVO}${path}`, {
    method: 'POST',
    headers: { 'api-key': key, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok && res.status !== 204) throw new Error(`Brevo ${path}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
}

export async function POST(req: Request) {
  let data: { email?: unknown; source?: unknown; website?: unknown };
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
  // "website" is a hidden field: people leave it empty, bots fill it.
  if (typeof data.website === 'string' && data.website) return NextResponse.json({ ok: true });
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) return NextResponse.json({ ok: false }, { status: 400 });

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  if (limited(ip)) return NextResponse.json({ ok: false }, { status: 429 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return NextResponse.json({ ok: false }, { status: 503 });
  const db = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });

  const { error } = await db.from('subscribers').insert([{ email }]);
  if (error && error.code !== '23505') {
    console.error('subscribe: insert failed', error.code, error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  const isNew = !error;

  const key = process.env.BREVO_API_KEY;
  let welcome = false;
  if (isNew && key) {
    const listId = Number(process.env.BREVO_LIST_ID);
    const tasks: Promise<void>[] = [
      brevo(
        '/smtp/email',
        {
          sender: { name: process.env.BREVO_SENDER_NAME || 'Kinshasa Label', email: process.env.BREVO_SENDER_EMAIL || 'contact@kinshasalabel.com' },
          replyTo: { email: process.env.BREVO_SENDER_EMAIL || 'contact@kinshasalabel.com', name: 'Kinshasa Label' },
          to: [{ email }],
          subject: WELCOME_SUBJECT,
          htmlContent: welcomeEmailHtml(),
          textContent: welcomeEmailText(),
          tags: ['bienvenue'],
        },
        key
      ),
    ];
    if (listId > 0) {
      tasks.push(brevo('/contacts', { email, listIds: [listId], updateEnabled: true }, key));
    }
    const results = await Promise.allSettled(tasks);
    welcome = results[0].status === 'fulfilled';
    for (const r of results) if (r.status === 'rejected') console.error('subscribe:', String(r.reason));
  }

  return NextResponse.json({ ok: true, welcome });
}
