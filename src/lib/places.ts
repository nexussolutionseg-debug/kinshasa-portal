// Place pages (2026-11-10): every place has its own address,
// /lieu/<id>-<name-slug>. The id is what counts; a wrong or old slug
// redirects to the right one, so renaming a place never breaks links.

/** "Chez Ntemba – Matonge" → "chez-ntemba-matonge" */
export function placeSlug(name: string | null | undefined): string {
  return (
    String(name || 'lieu')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/['’]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
      .replace(/-+$/g, '') || 'lieu'
  );
}

export const placeHref = (p: { id: number | string; name?: string | null }) => `/lieu/${p.id}-${placeSlug(p.name)}`;

/** "42-chez-ntemba" → 42 */
export function placeIdFromParam(param: string): number | null {
  const m = /^(\d{1,12})(?:-|$)/.exec(param || '');
  return m ? Number(m[1]) : null;
}

const digits = (v: string | null | undefined) => String(v || '').replace(/[^\d+]/g, '');

/** Phone number as an international DRC number without "+" (for wa.me), or null. */
export function intlDigits(v: string | null | undefined): string | null {
  let d = digits(v).replace(/^\+/, '');
  if (!d) return null;
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0') && d.length === 10) d = `243${d.slice(1)}`; // 081 234 5678 → 243812345678
  if (d.length === 9 && /^[89]/.test(d)) d = `243${d}`; // 812345678 → 243812345678
  return d.length >= 9 && d.length <= 15 ? d : null;
}

export function telHref(phone: string | null | undefined): string | null {
  const d = intlDigits(phone);
  return d ? `tel:+${d}` : null;
}

/** WhatsApp link: the place's WhatsApp number, else its phone. */
export function whatsappHref(p: { whatsapp?: string | null; phone?: string | null; name?: string | null }): string | null {
  const d = intlDigits(p.whatsapp) || intlDigits(p.phone);
  if (!d) return null;
  const text = `Bonjour, je vous ai trouvé sur KINSHASA LABEL${p.name ? ` (${p.name})` : ''}.`;
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
}

/** Directions from the place's own map point (OpenStreetMap-based); Google link only as a fallback. */
export function directionsHref(p: { lat?: number | null; lng?: number | null; google_maps_url?: string | null }): string | null {
  if (p.lat != null && p.lng != null) return `https://www.google.com/maps/dir/?api=1&destination=${Number(p.lat)},${Number(p.lng)}`;
  return p.google_maps_url && /^https:\/\//.test(p.google_maps_url) ? p.google_maps_url : null;
}

export function osmHref(p: { lat?: number | null; lng?: number | null }): string | null {
  return p.lat != null && p.lng != null ? `https://www.openstreetmap.org/?mlat=${Number(p.lat)}&mlon=${Number(p.lng)}#map=18/${Number(p.lat)}/${Number(p.lng)}` : null;
}

/** "@chez.ntemba", "instagram.com/chez.ntemba" or a full URL → https URL. */
export function socialHref(kind: 'instagram' | 'facebook', v: string | null | undefined): string | null {
  const s = String(v || '').trim();
  if (!s) return null;
  if (/^https:\/\//i.test(s)) return s;
  const host = kind === 'instagram' ? 'instagram.com' : 'facebook.com';
  const handle = s.replace(/^@/, '').replace(new RegExp(`^(https?://)?(www\\.)?${host.replace('.', '\\.')}/`, 'i'), '').replace(/[/?#].*$/, '');
  return /^[A-Za-z0-9._-]{1,80}$/.test(handle) ? `https://www.${host}/${handle}` : null;
}

export function websiteHref(v: string | null | undefined): string | null {
  const s = String(v || '').trim();
  if (!s) return null;
  const url = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(url);
    return /\./.test(u.hostname) ? u.toString() : null;
  } catch {
    return null;
  }
}
