// Kin Stats partner links (2026-11-01).
// A partner link is a signed token: who it's for, which view, when it
// expires. Nothing is stored in the database — the signature is the proof.
// To cut off EVERY partner link at once, change STATS_SHARE_SECRET in Vercel
// (or, if it isn't set, rotate the GA service-account key).
import { createHash, createHmac, timingSafeEqual } from 'crypto';

export type StatsView = 'complet' | 'partenaire';
export type SharePayload = { n: string; v: StatsView; e: number; i: number }; // name, view, expires (unix s), issued

function secret(): string | null {
  if (process.env.STATS_SHARE_SECRET) return process.env.STATS_SHARE_SECRET;
  const base = process.env.GA4_SERVICE_ACCOUNT_JSON || process.env.GA4_PRIVATE_KEY;
  return base ? createHash('sha256').update(`kin-stats|${base}`).digest('hex') : null;
}

const b64url = (b: Buffer | string) => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const fromB64url = (s: string) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

export function signShare(p: SharePayload): string | null {
  const s = secret();
  if (!s) return null;
  const body = b64url(JSON.stringify(p));
  const sig = b64url(createHmac('sha256', s).update(body).digest()).slice(0, 32);
  return `${body}.${sig}`;
}

export function verifyShare(token: string | null | undefined): SharePayload | null {
  const s = secret();
  if (!s || !token || token.length > 600) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = b64url(createHmac('sha256', s).update(body).digest()).slice(0, 32);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(fromB64url(body).toString('utf8')) as SharePayload;
    if (!p || typeof p.e !== 'number' || p.e * 1000 < Date.now()) return null;
    if (p.v !== 'complet' && p.v !== 'partenaire') return null;
    return p;
  } catch {
    return null;
  }
}
