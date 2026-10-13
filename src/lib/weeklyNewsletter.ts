// "Le meilleur de Kin" — the weekly newsletter, built automatically from the
// site's own content (2026-10-13). No copywriting needed each week:
//   - upcoming events (next 10 days),
//   - new places (last 14 days), topped up with a rotating pick of
//     well-rated places so every issue has addresses,
//   - the top Kin Actualité headlines (Kinshasa only, no politics).
// If there is nothing worth sending (no events, no places, no news) the
// issue is skipped rather than sent empty.
import { categoryOf, getAverageRating } from './categories';
import { communeHref } from './communes';
import type { NewsItem } from './news';

const SITE = 'https://www.kinshasalabel.com';
const DAY = 86_400_000;

export type Issue = {
  skip: boolean;
  subject: string;
  preview: string;
  html: string;
  counts: { events: number; places: number; news: number };
};

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const utm = (path: string, content: string, campaign: string) =>
  `${SITE}${path}${path.includes('?') ? '&' : '?'}utm_source=newsletter&utm_medium=email&utm_campaign=${campaign}&utm_content=${content}`;
const isoWeek = (d: Date) => {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  return Math.ceil(((t.getTime() - Date.UTC(t.getUTCFullYear(), 0, 1)) / DAY + 1) / 7);
};
const frDate = (iso: string) => {
  const s = new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export function pickContent(places: any[], events: any[], news: NewsItem[], now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const in10 = new Date(now.getTime() + 10 * DAY).toISOString().slice(0, 10);
  const ev = events
    .filter((e) => e.event_date && e.event_date >= today && e.event_date <= in10)
    .sort((a, b) => a.event_date.localeCompare(b.event_date))
    .slice(0, 4);

  const visible = places.filter((p) => p.published !== false && p.name);
  const fresh = visible
    .filter((p) => p.created_at && now.getTime() - Date.parse(p.created_at) < 14 * DAY)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const pool = visible
    .filter((p) => !fresh.includes(p) && (p.image_url || getAverageRating(p) !== null))
    .sort((a, b) => (getAverageRating(b) ?? 0) - (getAverageRating(a) ?? 0) || a.id - b.id);
  const picks = [...fresh.slice(0, 3)];
  for (let i = 0; picks.length < 3 && pool.length && i < pool.length; i++) {
    picks.push(pool.at((isoWeek(now) * 3 + i) % pool.length));
  }
  const pl = [...new Set(picks)].filter(Boolean).slice(0, 3);
  const nw = news.slice(0, 3);
  return { events: ev, places: pl, news: nw, freshCount: Math.min(fresh.length, 3) };
}

export function buildIssue(places: any[], events: any[], news: NewsItem[], now = new Date()): Issue {
  const c = pickContent(places, events, news, now);
  const counts = { events: c.events.length, places: c.places.length, news: c.news.length };
  const campaign = `newsletter-s${isoWeek(now)}-${now.getUTCFullYear()}`;
  const skip = counts.events + counts.places + counts.news === 0;

  const lead = c.events[0]?.title || c.places[0]?.name || c.news[0]?.title || 'Kinshasa';
  const subject = c.events.length
    ? `Ce week-end à Kin : ${c.events[0].title}${c.events.length > 1 ? ` et ${c.events.length - 1} autre${c.events.length > 2 ? 's' : ''} sortie${c.events.length > 2 ? 's' : ''}` : ''}`
    : c.freshCount
      ? `Nouvelles adresses à Kin : ${c.places[0].name}`
      : `Le meilleur de Kin cette semaine : ${lead}`;
  const preview = [
    c.events.length && `${c.events.length} sortie${c.events.length > 1 ? 's' : ''}`,
    c.places.length && `${c.places.length} adresse${c.places.length > 1 ? 's' : ''}`,
    c.news.length && `l'essentiel de l'actu`,
  ]
    .filter(Boolean)
    .join(', ');

  const font = "'Outfit','Segoe UI',Arial,Helvetica,sans-serif";
  const body = "'Segoe UI',Arial,Helvetica,sans-serif";
  const h2 = (t: string, color: string) =>
    `<tr><td style="padding:26px 32px 10px 32px"><p style="margin:0;font-family:${font};font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${color}">${t}</p></td></tr>`;

  const eventsHtml = c.events
    .map(
      (e, i) => `<tr><td style="padding:0 32px 14px 32px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #DCE5F3;border-radius:14px"><tr><td style="padding:14px 16px">
      <p style="margin:0;font-family:${body};font-size:13px;color:#7B3FE4;font-weight:700">${esc(frDate(e.event_date))} · ${esc(e.commune)}</p>
      <p style="margin:4px 0 0 0;font-family:${font};font-size:18px;line-height:24px;font-weight:800;color:#0B2545">${esc(e.title)}</p>
      ${e.description ? `<p style="margin:6px 0 0 0;font-family:${body};font-size:15px;line-height:22px;color:#4A5A72">${esc(String(e.description).slice(0, 160))}${String(e.description).length > 160 ? '…' : ''}</p>` : ''}
      <p style="margin:8px 0 0 0"><a href="${e.url && /^https:\/\//.test(e.url) ? esc(e.url) : utm('/weekend', `event-${i + 1}`, campaign)}" style="font-family:${font};font-size:14px;font-weight:700;color:#0E5FC9;text-decoration:none">Voir le détail →</a></p>
    </td></tr></table></td></tr>`
    )
    .join('');

  const placesHtml = c.places
    .map((p, i) => {
      const cat = categoryOf(p.vertical);
      const avg = getAverageRating(p);
      const img = p.image_url && /^https:\/\//.test(p.image_url) ? p.image_url : null;
      return `<tr><td style="padding:0 32px 14px 32px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #DCE5F3;border-radius:14px;overflow:hidden">
      ${img ? `<tr><td><img src="${esc(img)}" width="536" alt="${esc(p.name)}" style="display:block;width:100%;max-width:536px;height:auto;border:0"></td></tr>` : ''}
      <tr><td style="padding:14px 16px">
        <p style="margin:0;font-family:${body};font-size:13px;color:${cat.color || '#D21C2E'};font-weight:700">${esc(cat.label)} · ${esc(p.commune)}${avg !== null ? ` · ★ ${avg.toFixed(1)}` : ''}</p>
        <p style="margin:4px 0 0 0;font-family:${font};font-size:18px;line-height:24px;font-weight:800;color:#0B2545">${esc(p.name)}</p>
        ${p.description ? `<p style="margin:6px 0 0 0;font-family:${body};font-size:15px;line-height:22px;color:#4A5A72">${esc(String(p.description).slice(0, 150))}${String(p.description).length > 150 ? '…' : ''}</p>` : ''}
        <p style="margin:8px 0 0 0"><a href="${utm(communeHref(p.commune), `place-${i + 1}`, campaign)}" style="font-family:${font};font-size:14px;font-weight:700;color:#0E5FC9;text-decoration:none">Voir l'adresse →</a></p>
      </td></tr></table></td></tr>`;
    })
    .join('');

  const newsHtml = c.news
    .map(
      (n) => `<tr><td style="padding:0 32px 12px 32px"><p style="margin:0;font-family:${body};font-size:13px;color:#5E6E86">${esc(n.sourceName)}${n.commune ? ` · ${esc(n.commune)}` : ''}</p>
      <p style="margin:2px 0 0 0;font-family:${font};font-size:16px;line-height:22px;font-weight:700"><a href="${esc(n.link)}" style="color:#0B2545;text-decoration:none">${esc(n.title)}</a></p></td></tr>`
    )
    .join('');

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#F5F8FE">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F8FE"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;border-radius:20px;overflow:hidden;border:1px solid #DCE5F3">
  <tr><td style="font-size:0;line-height:0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="6" style="background:#1A82F5;width:33%"></td><td height="6" style="background:#FCD933;width:34%"></td><td height="6" style="background:#D21C2E;width:33%"></td></tr></table></td></tr>
  <tr><td style="padding:24px 32px 6px 32px"><a href="${utm('/', 'logo', campaign)}"><img src="${SITE}/email/kinshasa-label-lockup.png" width="220" alt="Kinshasa Label · Vis Kin autrement" style="display:block;width:220px;max-width:65%;height:auto;border:0"></a></td></tr>
  <tr><td style="padding:14px 32px 0 32px"><h1 style="margin:0;font-family:${font};font-size:26px;line-height:32px;font-weight:800;color:#0B2545">Le meilleur de Kin <span style="color:#D21C2E">cette semaine</span></h1>
  <p style="margin:8px 0 0 0;font-family:${body};font-size:15px;line-height:22px;color:#4A5A72">Mbote ! Voici nos choix pour bien vivre Kin ces prochains jours.</p></td></tr>
  ${c.events.length ? h2('Ce week-end', '#7B3FE4') + eventsHtml : ''}
  ${c.places.length ? h2(c.freshCount ? 'Nouvelles adresses' : 'Nos adresses de la semaine', '#D21C2E') + placesHtml : ''}
  ${c.news.length ? h2("L'essentiel de l'actu", '#0E5FC9') + newsHtml : ''}
  <tr><td style="padding:18px 32px 26px 32px"><a href="${utm('/', 'cta-carte', campaign)}#explorer" style="display:inline-block;background:#D21C2E;color:#FFFFFF;font-family:${font};font-weight:700;font-size:15px;text-decoration:none;padding:12px 22px;border-radius:999px">Explore Kin sur la carte</a>
  <p style="margin:16px 0 0 0;font-family:${body};font-size:14px;line-height:21px;color:#4A5A72">Une adresse à nous recommander ? Réponds à cet e-mail.<br>Un ami aimerait recevoir cette lettre ? Transfère-la-lui, l'inscription est sur <a href="${utm('/', 'parrainage', campaign)}" style="color:#0E5FC9">kinshasalabel.com</a>.</p></td></tr>
  <tr><td style="padding:16px 32px 22px 32px;background:#F5F8FE;border-top:1px solid #DCE5F3"><p style="margin:0;font-family:${body};font-size:12px;line-height:18px;color:#5E6E86">Kinshasa Label · Vis Kin autrement · <a href="https://www.instagram.com/kinshasalabel" style="color:#0E5FC9;text-decoration:none">Instagram</a><br>Tu reçois cet e-mail car tu es inscrit(e) à la newsletter. <a href="{{ unsubscribe }}" style="color:#5E6E86">Se désinscrire</a></p></td></tr>
</table></td></tr></table></body></html>`;

  return { skip, subject: subject.slice(0, 120), preview, html, counts };
}


/** Next Thursday 09:00 UTC (10:00 in Kinshasa), at least 2 hours ahead. */
export function nextThursday(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 9, 0, 0));
  while (d.getUTCDay() !== 4 || d.getTime() - now.getTime() < 2 * 3600_000) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

