// Prospects (Backoffice → Prospects, 2026-11-10): restaurants, hotels and
// other businesses to sign up as KINSHASA LABEL partners. Same idea as the
// Nexus Hub lead flow: one list with a status, a next action and a date,
// quick call / WhatsApp buttons, and one click to put the business on the
// map. A lead "on the map" becomes a place (with its own page) using the
// lead's own position (OpenStreetMap / GPS), not a Google Maps point.
import { canonicalCommune, communeKey } from './communes';
import { parsePosition } from './geo';
import type { CategoryId } from './categories';

export const LEAD_STATUSES = [
  { id: 'nouveau', label: 'Nouveau', color: '#6B7C95' },
  { id: 'contacte', label: 'Contacté', color: '#1A82F5' },
  { id: 'interesse', label: 'Intéressé', color: '#B98A00' },
  { id: 'proposition', label: 'Proposition envoyée', color: '#7B3FE4' },
  { id: 'partenaire', label: 'Partenaire', color: '#0E8A4B' },
  { id: 'refuse', label: 'Pas intéressé', color: '#A60E1D' },
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number]['id'];

export const LEAD_KINDS = [
  { id: 'restauration', label: 'Restaurant / bar', vertical: 'kin_food', type: 'Restaurant' },
  { id: 'hebergement', label: 'Hôtel / hébergement', vertical: 'kin_places', type: 'Hôtel' },
  { id: 'sortie', label: 'Sortie / culture', vertical: 'kin_culture', type: 'Lieu culturel' },
  { id: 'commerce', label: 'Commerce / style', vertical: 'kin_style', type: 'Boutique' },
  { id: 'autre', label: 'Autre', vertical: 'kin_places', type: null },
] as const;
export type LeadKind = (typeof LEAD_KINDS)[number]['id'];

export const LEAD_PACKS = [
  { id: 'page', label: 'Pack Page' },
  { id: 'site', label: 'Pack Site' },
  { id: 'site_reseaux', label: 'Pack Site + Réseaux' },
] as const;

export const statusOf = (id: string | null | undefined) => LEAD_STATUSES.find((s) => s.id === id) || LEAD_STATUSES[0];
export const kindOf = (id: string | null | undefined) => LEAD_KINDS.find((k) => k.id === id) || LEAD_KINDS[4];

export const norm = (s: string) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/** Same business = same name + commune (accents, spaces and case ignored). */
export const leadKey = (name: string, commune: string | null | undefined) => `${communeKey(commune || '')}|${norm(name)}`;

export function toKind(v: string): LeadKind | null {
  const n = norm(v);
  if (!n) return null;
  if (/restau|resto|bar|food|cafe|grill|snack|lounge|nganda|boulang|patiss|pizz|fastfood/.test(n)) return 'restauration';
  if (/hebergement|hotel|appart|residence|lodge|guest|auberge|motel|hostel|flat/.test(n)) return 'hebergement';
  if (/sortie|culture|club|discotheque|cinema|galerie|musee|salle|theatre|concert/.test(n)) return 'sortie';
  if (/commerce|boutique|shop|style|mode|salon|beaute|coiff|magasin/.test(n)) return 'commerce';
  if (/autre|other/.test(n)) return 'autre';
  return null;
}

export function toStatus(v: string): LeadStatus | null {
  const n = norm(v);
  if (!n) return null;
  if (/partenaire|signe|client|gagne/.test(n)) return 'partenaire';
  if (/propos|devis|offre|envoye/.test(n)) return 'proposition';
  if (/refus|pasinteresse|perdu|^non$/.test(n)) return 'refuse';
  if (/interesse|chaud|rdv|rendezvous/.test(n)) return 'interesse';
  if (/contact|appele|relance|message/.test(n)) return 'contacte';
  if (/nouveau|afaire|acontacter|new/.test(n)) return 'nouveau';
  return null;
}

export function toPack(v: string): string | null {
  const n = norm(v);
  if (!n) return null;
  if (n.includes('reseau') || n.includes('social') || n.includes('full') || n.includes('premium')) return 'site_reseaux';
  if (n.includes('site') || n.includes('website')) return 'site';
  if (n.includes('page') || n.includes('onepage')) return 'page';
  return null;
}

/** "31/12/2026", "2026-12-31" or an Excel date → "2026-12-31". */
export function toDate(v: string): string | null {
  const s = String(v || '').trim();
  if (!s) return null;
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/.exec(s);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

const FIELDS: Record<string, string[]> = {
  commune: ['commune'],
  name: ['nom', 'name', 'etablissement', 'lieu', 'entreprise', 'business', 'nomdeletablissement'],
  kind: ['type', 'kind', 'categorie', 'secteur', 'activite'],
  // 'Sous-type' is matched by place_type below
  place_type: ['soustype', 'typedelieu', 'typedetablissement', 'genre'],
  cuisine: ['cuisine', 'specialite'],
  address: ['adresse', 'address', 'adressezone', 'zone', 'repere'],
  position: ['position', 'gps', 'coordonnees', 'pluscode', 'positiongpsoupluscode', 'positiongpsouliendecarte'],
  lat: ['latitude', 'lat'],
  lng: ['longitude', 'lng', 'lon'],
  maps: ['liengooglemaps', 'googlemaps', 'maps', 'lienmaps', 'carte'],
  phone: ['telephone', 'tel', 'phone', 'contact', 'whatsapp'],
  email: ['email', 'mail', 'courriel'],
  website: ['siteweb', 'website', 'site', 'web'],
  facebook: ['facebook', 'fb'],
  instagram: ['instagram', 'insta', 'ig'],
  status: ['statut', 'status', 'etape'],
  pack: ['offreproposee', 'offre', 'pack', 'formule'],
  next_action: ['prochaineaction', 'action', 'nextaction'],
  next_date: ['datederelance', 'relance', 'date', 'nextdate', 'prochainedate'],
  owner: ['responsable', 'owner', 'assigne', 'commercial'],
  notes: ['notes', 'note', 'commentaire', 'commentaires', 'remarques'],
  source: ['source'],
};

export type LeadDraft = {
  name: string;
  commune: string | null;
  kind: LeadKind;
  place_type: string | null;
  cuisine: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  facebook: string | null;
  instagram: string | null;
  status: LeadStatus;
  pack: string | null;
  next_action: string | null;
  next_date: string | null;
  owner: string | null;
  notes: string | null;
  source: string | null;
};

export type LeadImportRow = { line: number; lead: LeadDraft | null; problems: string[] };

/** A spreadsheet (first row = column names) → leads, with problems in plain French. */
export function mapLeadRows(table: string[][]): { rows: LeadImportRow[]; missing: string[] } {
  if (!table.length) return { rows: [], missing: ['Nom'] };
  const header = table[0].map(norm);
  const col: Record<string, number> = {};
  header.forEach((h, i) => {
    const f = Object.entries(FIELDS).find(([, al]) => al.includes(h))?.[0];
    if (f && col[f] === undefined) col[f] = i;
  });
  if (col.name === undefined) return { rows: [], missing: ['Nom'] };
  const get = (r: string[], f: string) => (col[f] !== undefined ? String(r[col[f]] ?? '').trim() : '');
  const clean = (v: string) => v.replace(/\s+/g, ' ').trim() || null;
  const rows = table.slice(1).map((r, i): LeadImportRow => {
    const problems: string[] = [];
    const name = (get(r, 'name') || '').replace(/\s+/g, ' ').slice(0, 160);
    if (!name) return { line: i + 2, lead: null, problems: ['Nom manquant'] };
    const communeRaw = get(r, 'commune');
    const commune = canonicalCommune(communeRaw);
    if (communeRaw && !commune) problems.push(`Commune inconnue : « ${communeRaw} »`);
    const kindRaw = get(r, 'kind');
    const kind = toKind(kindRaw) || toKind(get(r, 'cuisine') ? 'restaurant' : '') || 'autre';
    const pos =
      (get(r, 'lat') && get(r, 'lng') ? parsePosition(`${get(r, 'lat')}, ${get(r, 'lng')}`) : null) ||
      parsePosition(get(r, 'position')) ||
      parsePosition(get(r, 'maps'));
    if (!pos) problems.push('Sans position');
    return {
      line: i + 2,
      problems,
      lead: {
        name,
        commune,
        kind,
        place_type: clean(get(r, 'place_type')) || (kindRaw && !toKind(kindRaw) ? clean(kindRaw) : null),
        cuisine: clean(get(r, 'cuisine')),
        address: clean(get(r, 'address')),
        lat: pos?.lat ?? null,
        lng: pos?.lng ?? null,
        phone: clean(get(r, 'phone')),
        email: clean(get(r, 'email')),
        website: clean(get(r, 'website')),
        facebook: clean(get(r, 'facebook')),
        instagram: clean(get(r, 'instagram')),
        status: toStatus(get(r, 'status')) || 'nouveau',
        pack: toPack(get(r, 'pack')),
        next_action: clean(get(r, 'next_action')),
        next_date: toDate(get(r, 'next_date')),
        owner: clean(get(r, 'owner')),
        notes: clean(get(r, 'notes')),
        source: clean(get(r, 'source')) || 'Import fichier',
      },
    };
  });
  return { rows, missing: [] };
}

/** In a workbook, the first tab with a name column (skips "Mode d'emploi"). */
export function pickLeadSheet(sheets: { sheet: string; data: unknown[][] }[]): string[][] {
  const tables = sheets.map((s) => s.data.map((r) => r.map((c) => (c == null ? '' : c instanceof Date ? c.toISOString().slice(0, 10) : String(c)))).filter((r) => r.some((c) => c.trim() !== '')));
  return tables.find((t) => t.length > 1 && mapLeadRows(t.slice(0, 1)).missing.length === 0) || tables[0] || [];
}

/** The place row created when a lead goes on the map. */
export function leadToPlace(lead: any, withPageFields: boolean) {
  const k = kindOf(lead.kind);
  const type = lead.place_type || (lead.cuisine && k.id === 'restauration' ? `Restaurant · ${lead.cuisine}`.slice(0, 60) : k.type);
  const commune = canonicalCommune(lead.commune) || lead.commune || 'Gombe';
  const where = lead.address ? ` — ${lead.address}` : '';
  return {
    name: String(lead.name).trim(),
    commune,
    vertical: k.vertical as CategoryId,
    place_type: type || null,
    address: lead.address || null,
    description: `${type || 'Adresse'} à ${commune}${where}.`,
    phone: lead.phone || null,
    lat: lead.lat ?? null,
    lng: lead.lng ?? null,
    published: true,
    is_label_recommended: true,
    verification: lead.status === 'partenaire' ? 'Partenaire' : 'Prospect',
    ...(withPageFields ? { website: lead.website || null, instagram: lead.instagram || null, facebook: lead.facebook || null } : {}),
  };
}

/** Is this lead due for a follow-up (date today or past, not closed)? */
export function isDue(lead: { next_date?: string | null; status?: string }, today: string): boolean {
  return !!lead.next_date && lead.next_date <= today && lead.status !== 'partenaire' && lead.status !== 'refuse';
}

/** Ready-to-send WhatsApp opening message for a prospect. */
export function pitchText(lead: { name: string; kind?: string }): string {
  const what = lead.kind === 'hebergement' ? 'votre établissement' : lead.kind === 'restauration' ? 'votre restaurant' : 'votre adresse';
  return `Bonjour ${lead.name}, je vous contacte de la part de KINSHASA LABEL (www.kinshasalabel.com), le guide des bonnes adresses de Kinshasa. Nous aimerions présenter ${what} sur notre site et sur Instagram @kinshasalabel. Puis-je vous envoyer notre offre partenaires ?`;
}

/** Prefix of kl_leads.source for leads that came from the daily scan; the hub id follows it. */
export const SCAN_SOURCE = 'Scan quotidien';

/** One row of the daily scan (Nexus Hub kin_leads.data) → a kl_leads row. */
export function scanToLead(row: any): (LeadDraft & { created_at: string }) | null {
  const name = String(row?.business || row?.name || '').replace(/\s+/g, ' ').trim().slice(0, 160);
  if (!name || !row?.id || String(row.id).startsWith('kin_test')) return null;
  const s = (v: any) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 500) : null);
  const n = (v: any) => (v === null || v === undefined || v === '' ? null : Number(v));
  const lat = n(row.lat);
  const lng = n(row.lng);
  const okPos = lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng) && lat > -5.2 && lat < -3.9 && lng > 15 && lng < 16.6;
  const kind = (LEAD_KINDS.some((k) => k.id === row.kind) ? row.kind : toKind(String(row.kind || row.niche || ''))) || 'autre';
  const created = Number(row.createdAt);
  return {
    name,
    commune: canonicalCommune(row.commune) || null,
    kind: kind as LeadKind,
    place_type: s(row.place_type),
    cuisine: s(row.cuisine),
    address: s(row.address || row.area),
    lat: okPos ? lat : null,
    lng: okPos ? lng : null,
    phone: s(row.phone),
    email: s(row.email),
    website: s(row.website),
    facebook: s(row.facebook),
    instagram: s(row.instagram),
    status: 'nouveau',
    pack: null,
    next_action: 'Premier contact',
    next_date: null,
    owner: null,
    notes: s(row.notes),
    source: `${SCAN_SOURCE} · ${String(row.id).slice(0, 60)}`,
    created_at: new Date(Number.isFinite(created) && created > 0 ? created : Date.now()).toISOString(),
  };
}

// ---------- import template (2026-11-10) -----------------------------------------
export const LEAD_TEMPLATE_HEADERS = [
  'Nom', 'Commune', 'Type', 'Sous-type', 'Cuisine', 'Adresse', 'Position (GPS ou lien de carte)', 'Téléphone', 'E-mail',
  'Site web', 'Instagram', 'Facebook', 'Statut', 'Offre proposée', 'Prochaine action', 'Date de relance', 'Responsable', 'Notes',
];

export const LEAD_TEMPLATE_EXAMPLES: string[][] = [
  ['Chez Ntemba', 'Kalamu', 'Restaurant', 'Restaurant-terrasse', 'congolaise', 'Av. Kanda-Kanda, Matonge', '-4.3301, 15.3102', '+243 81 234 5678', '',
    '', '@chez.ntemba', '', 'Nouveau', '', 'Premier contact', '15/11/2026', 'Cherif', 'Exemple : à supprimer'],
  ['Hôtel Exemple', 'Gombe', 'Hôtel', 'Hôtel 4 étoiles', '', 'Bd du 30 Juin', '', '', 'contact@exemple.cd',
    'www.exemple.cd', '', 'facebook.com/hotelexemple', 'Contacté', 'Pack Site', 'Envoyer l’offre', '20/11/2026', '', 'Exemple : à supprimer'],
];

export const LEAD_TEMPLATE_HELP = [
  'Une ligne par établissement. Seule la colonne « Nom » est obligatoire.',
  'Type : Restaurant, Bar, Café, Hôtel, Appartement, Sortie, Commerce ou Autre.',
  'Position : « -4.3217, 15.3125 », un plus code (M79J+6H) ou un lien de carte. Vide = à placer plus tard.',
  'Statut : Nouveau, Contacté, Intéressé, Proposition envoyée, Partenaire ou Pas intéressé (vide = Nouveau).',
  'Offre proposée : Pack Page, Pack Site ou Pack Site + Réseaux. Date de relance : JJ/MM/AAAA.',
  'Supprimez les 2 lignes d’exemple avant l’import. Un établissement déjà présent (même nom et commune) est ignoré.',
];

/** CSV template (";" + BOM so French Excel opens it with accents). */
export function leadTemplateCsv(): string {
  const esc = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [LEAD_TEMPLATE_HEADERS, ...LEAD_TEMPLATE_EXAMPLES].map((r) => r.map(esc).join(';'));
  return '\ufeff' + lines.join('\r\n') + '\r\n';
}

/** Prefix of kl_leads.source for « Deviens partenaire » requests; the request id follows it. */
export const FORM_SOURCE = 'Demande du site';

/** One « Deviens partenaire » request (partner_inquiries) → a kl_leads row: a warm lead to call back. */
export function inquiryToLead(q: any, today: string) {
  const name = String(q?.company_name || '').replace(/\s+/g, ' ').trim().slice(0, 160);
  if (!name || q?.id == null) return null;
  const who = q.contact_name ? `Contact : ${String(q.contact_name).trim()}. ` : '';
  const msg = q.message ? `Message : ${String(q.message).trim()}` : 'Pas de message.';
  return {
    name,
    commune: null,
    kind: 'autre',
    phone: q.phone || null,
    email: q.email || null,
    status: 'interesse',
    next_action: 'Rappeler : demande reçue via « Deviens partenaire »',
    next_date: today,
    notes: `${who}${msg}`.slice(0, 2000),
    source: `${FORM_SOURCE} · ${q.id}`,
    created_at: q.created_at || new Date().toISOString(),
  };
}
