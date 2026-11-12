// « Deviens partenaire » form (2026-11-12). Saves the request in
// partner_inquiries (as before) and e-mails it to the team through Brevo,
// with the partner's address as reply-to, so nobody has to open Supabase.
// The backoffice also turns every request into a lead in Prospects
// (badge « Demande du site »).
// Settings: BREVO_API_KEY (already set); optional PARTNER_NOTIFY_EMAIL
// (default: BREVO_SENDER_EMAIL, else contact@kinshasalabel.com).
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;

const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 600_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > 5;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, (m) => (m.includes('\n') ? '\n' : ' ')).trim().slice(0, max) : '');

export async function POST(req: Request) {
  let data: Record<string, unknown>;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Requête invalide.' }, { status: 400 });
  }
  if (typeof data.website === 'string' && data.website) return NextResponse.json({ ok: true }); // honeypot
  const company = str(data.company_name, 200);
  const contact = str(data.contact_name, 200);
  const email = str(data.email, 254).toLowerCase();
  const phone = str(data.phone, 40);
  const message = str(data.message, 4000);
  if (!company || !EMAIL_RE.test(email)) return NextResponse.json({ ok: false, error: 'Nom de l’entreprise et e-mail valides requis.' }, { status: 400 });

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  if (limited(ip)) return NextResponse.json({ ok: false, error: 'Trop de demandes. Réessaie dans quelques minutes.' }, { status: 429 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return NextResponse.json({ ok: false, error: 'Service indisponible.' }, { status: 503 });
  const db = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await db.from('partner_inquiries').insert([
    { company_name: company, contact_name: contact || null, email, phone: phone || null, message: message || null },
  ]);
  if (error) {
    console.error('partner: insert failed', error.code, error.message);
    return NextResponse.json({ ok: false, error: 'Envoi impossible pour le moment. Écris-nous à contact@kinshasalabel.com.' }, { status: 500 });
  }

  // Notify the team (best effort: the request is already saved).
  const key = process.env.BREVO_API_KEY;
  if (key) {
    const sender = process.env.BREVO_SENDER_EMAIL || 'contact@kinshasalabel.com';
    const to = process.env.PARTNER_NOTIFY_EMAIL || sender;
    const rows: [string, string][] = [
      ['Entreprise', company],
      ['Contact', contact || '—'],
      ['E-mail', email],
      ['Téléphone', phone || '—'],
    ];
    const html = `<div style="font-family:Arial,sans-serif;color:#0B2545;max-width:560px">
<h2 style="margin:0 0 12px">Nouvelle demande « Deviens partenaire »</h2>
<table style="border-collapse:collapse;width:100%">${rows.map(([k, v]) => `<tr><td style="padding:6px 8px;color:#6B7C95;width:120px">${k}</td><td style="padding:6px 8px"><b>${esc(v)}</b></td></tr>`).join('')}</table>
<p style="white-space:pre-line;background:#F5F8FE;padding:12px;border-radius:8px">${esc(message || '(pas de message)')}</p>
<p>Elle est aussi dans le backoffice : <a href="https://www.kinshasalabel.com/backoffice?s=leads">Prospects</a> (badge « Demande du site »). Répondre à cet e-mail écrit directement au partenaire.</p></div>`;
    const text = `Nouvelle demande « Deviens partenaire »\n\n${rows.map(([k, v]) => `${k} : ${v}`).join('\n')}\n\n${message || '(pas de message)'}\n\nBackoffice → Prospects : https://www.kinshasalabel.com/backoffice?s=leads`;
    try {
      const r = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': key, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          sender: { name: process.env.BREVO_SENDER_NAME || 'Kinshasa Label', email: sender },
          to: [{ email: to, name: 'Équipe Kinshasa Label' }],
          replyTo: { email, name: contact || company },
          subject: `Demande partenaire : ${company}`,
          htmlContent: html,
          textContent: text,
          tags: ['demande-partenaire'],
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) console.error('partner: brevo', r.status, (await r.text()).slice(0, 200));
    } catch (e) {
      console.error('partner: brevo', String(e));
    }
  }
  return NextResponse.json({ ok: true });
}
