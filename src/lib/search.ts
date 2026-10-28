// Site search (2026-10-28): places, upcoming events, team articles, live
// Kin Actualité headlines and the 24 communes. Accent- and case-insensitive;
// every word typed must match ("poulet gombe" finds chicken places in Gombe).
import { categoryOf } from './categories';
import { COMMUNE_NAMES } from './communes';

export const norm = (s: unknown) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export function matcher(q: string) {
  const words = norm(q).split(' ').filter((w) => w.length >= 2);
  return (...fields: unknown[]) => {
    if (!words.length) return false;
    const hay = ` ${norm(fields.join(' '))} `;
    return words.every((w) => hay.includes(w));
  };
}

export function searchAll(q: string, data: { places: any[]; events: any[]; articles: any[]; headlines: any[] }, today = new Date().toISOString().slice(0, 10)) {
  const m = matcher(q);
  const places = data.places
    .filter((p) => m(p.name, p.commune, p.description, p.address, categoryOf(p.vertical).label, p.budget))
    .slice(0, 30);
  const events = data.events
    .filter((e) => e.event_date && e.event_date >= today && m(e.title, e.commune, e.description, e.category))
    .slice(0, 12);
  const articles = data.articles.filter((a) => m(a.title, a.body, a.commune, a.source_note)).slice(0, 12);
  const headlines = data.headlines.filter((h) => m(h.title, h.teaser, h.commune, h.sourceName)).slice(0, 12);
  const communes = COMMUNE_NAMES.filter((c) => m(c));
  return { places, events, articles, headlines, communes, total: places.length + events.length + articles.length + headlines.length + communes.length };
}
