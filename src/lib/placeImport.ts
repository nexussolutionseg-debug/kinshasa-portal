// Backoffice → Lieux → Importer (2026-10-07).
// Reads a CSV (comma, semicolon or tab; UTF-8 or Windows Excel encoding) or
// an Excel sheet, recognises French / English column names, and turns every
// row into a place ready to insert — with problems spelled out in plain
// French so the team can fix the file before importing.
import { canonicalCommune, communeKey, communeAt, sameCommune } from './communes';
import { parsePosition } from './geo';
import type { CategoryId } from './categories';

export type ImportedPlace = {
  name: string;
  commune: string;
  vertical: CategoryId;
  place_type: string | null;
  address: string | null;
  description: string;
  budget: string | null;
  phone: string | null;
  google_rating: number | null;
  google_reviews: number | null;
  google_maps_url: string | null;
  image_url: string | null;
  lat: number | null;
  lng: number | null;
  published: boolean;
  verification: string | null;
};

export type ImportRow = {
  line: number;
  place: ImportedPlace | null;
  errors: string[];
  warnings: string[];
};

// ---------- template ---------------------------------------------------------

export const TEMPLATE_HEADERS = [
  'Commune', 'Établissement', 'Catégorie', 'Type', 'Adresse / zone', 'Position (GPS ou plus code)',
  'Description', 'Budget', 'Téléphone', 'Note Google', 'Avis Google', 'Lien Google Maps', 'Photo (lien)',
  'Statut de vérification', 'Publié',
];

export const TEMPLATE_EXAMPLES: string[][] = [
  ['Limete', 'Hôtel Stella', 'Kin Places', 'Hôtel', '54 Debonhomme, boulevard Lumumba', '-4.3561, 15.3392',
    'Hôtel confortable sur le boulevard Lumumba, piscine et restaurant.', '$$', '+243 900 002 999', '4,0', '85',
    'https://maps.app.goo.gl/…', '', 'Identifié', 'oui'],
  ['Bandalungwa', 'Appartements meublés Kaïla', 'Kin Places', 'Appartement meublé', 'M7F9+27Q', 'M7F9+27Q',
    '', '', '', '5,0', '2', '', '', 'À vérifier', 'non'],
];

export const TEMPLATE_HELP = [
  'Obligatoire : Commune et Établissement. Tout le reste est facultatif.',
  'Catégorie : Kin Places, Kin Food, Kin Culture, Kin Style ou Kin Sécurité (vide = Kin Places).',
  'Position : « -4.3217, 15.3125 », un plus code (« M79J+6H ») ou un lien Google Maps. Sans position, le lieu apparaît sur sa commune mais sans épingle sur la carte.',
  'Publié : oui / non. Vide = visible si le statut est « Identifié », « Candidat fort » ou « … explicitement … », sinon masqué.',
  'Budget : $, $$ ou $$$. Note Google : 0 à 5 (ex. 4,3). Avis Google : nombre d’avis Google.',
  'Un lieu déjà présent (même nom, commune et adresse) est ignoré, sauf si vous cochez « Mettre à jour les lieux existants ».',
];

export function templateCsv(): string {
  const esc = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [TEMPLATE_HEADERS, ...TEMPLATE_EXAMPLES].map((r) => r.map(esc).join(';'));
  // BOM so Excel opens accents correctly; ";" is what French Excel expects.
  return '﻿' + lines.join('\r\n') + '\r\n';
}

// ---------- reading files ------------------------------------------------------

export function decodeText(buf: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf).replace(/^﻿/, '');
  } catch {
    return new TextDecoder('windows-1252').decode(buf);
  }
}

export function parseCsv(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] || '';
  const counts = { ';': 0, ',': 0, '\t': 0 } as Record<string, number>;
  let q = false;
  for (const ch of firstLine) {
    if (ch === '"') q = !q;
    else if (!q && ch in counts) counts[ch]++;
  }
  const delim = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][1] > 0
    ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
    : ',';

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else inQ = false;
      } else cell += ch;
    } else if (ch === '"' && cell === '') inQ = true;
    else if (ch === delim) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

export async function readImportFile(file: File): Promise<string[][]> {
  if (/\.xlsx$/i.test(file.name)) {
    const { default: readXlsxFile } = await import('read-excel-file/browser');
    return pickSheet((await readXlsxFile(file)) as { sheet: string; data: unknown[][] }[]);
  }
  if (/\.xls$/i.test(file.name)) throw new Error('Ancien format Excel (.xls) : enregistrez le fichier en .xlsx ou en CSV.');
  return parseCsv(decodeText(await file.arrayBuffer()));
}

/** In a workbook with several tabs, use the first one that has Commune + name columns. */
export function pickSheet(sheets: { sheet: string; data: unknown[][] }[]): string[][] {
  const tables = sheets.map((s) =>
    s.data.map((r) => r.map((c) => (c === null || c === undefined ? '' : String(c)))).filter((r) => r.some((c) => c.trim() !== ''))
  );
  return tables.find((t) => t.length && mapRows(t.slice(0, 1)).missingColumns.length === 0) || tables[0] || [];
}

// ---------- mapping rows -------------------------------------------------------

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

const FIELDS: Record<string, string[]> = {
  commune: ['commune'],
  name: ['etablissement', 'nom', 'name', 'lieu', 'nomdulieu', 'nomdeletablissement'],
  category: ['categorie', 'verticale', 'category', 'rubrique'],
  type: ['type', 'typedelieu', 'typedetablissement'],
  address: ['adressezone', 'adresse', 'address', 'repere', 'adresserepere', 'zone'],
  position: ['positiongpsoupluscode', 'position', 'gps', 'pluscode', 'coordonnees', 'coordonneesgps'],
  lat: ['latitude', 'lat'],
  lng: ['longitude', 'lng', 'lon', 'long'],
  description: ['description', 'descriptif'],
  budget: ['budget', 'prix', 'gammedeprix'],
  phone: ['telephone', 'tel', 'phone', 'contact', 'whatsapp'],
  rating: ['notegoogle', 'note', 'rating', 'googlerating'],
  reviews: ['avisgoogle', 'avis', 'nombredavis', 'nbavis', 'reviews'],
  maps: ['liengooglemaps', 'googlemaps', 'maps', 'lienmaps'],
  photo: ['photolien', 'photo', 'image', 'photourl', 'imageurl'],
  status: ['statutdeverification', 'statut', 'verification', 'status'],
  published: ['publie', 'visible', 'published', 'enligne'],
};

const CATEGORY_WORDS: [CategoryId, string[]][] = [
  ['kin_food', ['food', 'restaurant', 'resto', 'manger', 'bar', 'maquis']],
  ['kin_culture', ['culture', 'musique', 'art', 'musee']],
  ['kin_style', ['style', 'mode', 'beaute', 'sape']],
  ['kin_securite', ['securite', 'police', 'commissariat']],
  ['kin_places', ['places', 'place', 'lieu', 'lieux', 'hebergement', 'hotel', 'decouvrir']],
];

function toCategory(v: string): CategoryId | null {
  const n = norm(v);
  if (!n) return 'kin_places';
  if (/^kin(food|places|culture|style|securite)$/.test(n)) return n.replace('kin', 'kin_') as CategoryId;
  for (const [id, words] of CATEGORY_WORDS) if (words.some((w) => n.includes(w))) return id;
  return null;
}

function toRating(v: string): number | null {
  const m = v.replace(',', '.').match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return n >= 0 && n <= 5 ? Math.round(n * 10) / 10 : null;
}

function toInt(v: string): number | null {
  const m = v.replace(/[\s .]/g, '').match(/^\d+/);
  return m ? parseInt(m[0], 10) : null;
}

function toBool(v: string): boolean | null {
  const n = norm(v);
  if (!n) return null;
  if (['oui', 'yes', 'true', '1', 'vrai', 'visible', 'publie', 'enligne', 'x'].includes(n)) return true;
  if (['non', 'no', 'false', '0', 'faux', 'masque', 'cache', 'brouillon'].includes(n)) return false;
  return null;
}

/** Status words the team uses for "checked, OK to show". */
export function statusMeansVerified(status: string): boolean {
  const n = norm(status);
  if (!n) return true;
  return n === 'identifie' || n === 'verifie' || n.includes('candidatfort') || n.includes('explicitement');
}

function cleanUrl(v: string): string | null {
  const s = v.trim();
  return /^https:\/\//i.test(s) && !s.includes('…') ? s : null;
}

function defaultDescription(type: string | null, commune: string, address: string | null) {
  const what = type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Adresse';
  const where = address && !/^[23456789CFGHJMPQRVWX]{4,8}\+/i.test(address) ? ` — ${address}` : '';
  return `${what} à ${commune}${where}.`;
}

export function mapRows(table: string[][], geo?: { features: any[] }): { rows: ImportRow[]; missingColumns: string[]; unknownColumns: string[] } {
  if (!table.length) return { rows: [], missingColumns: ['Commune', 'Établissement'], unknownColumns: [] };
  const header = table[0].map(norm);
  const col: Record<string, number> = {};
  const unknownColumns: string[] = [];
  header.forEach((h, i) => {
    const field = Object.entries(FIELDS).find(([, aliases]) => aliases.includes(h))?.[0];
    if (field && col[field] === undefined) col[field] = i;
    else if (h) unknownColumns.push(table[0][i]);
  });
  const missingColumns = [!('commune' in col) && 'Commune', !('name' in col) && 'Établissement'].filter(Boolean) as string[];
  if (missingColumns.length) return { rows: [], missingColumns, unknownColumns };

  const get = (r: string[], f: string) => (col[f] !== undefined ? String(r[col[f]] ?? '').trim() : '');

  const rows = table.slice(1).map((r, i): ImportRow => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const name = get(r, 'name').replace(/\s+/g, ' ');
    const communeRaw = get(r, 'commune');
    const commune = canonicalCommune(communeRaw);
    if (!name) errors.push('Nom manquant');
    if (!commune) errors.push(communeRaw ? `Commune inconnue : « ${communeRaw} »` : 'Commune manquante');
    const vertical = toCategory(get(r, 'category'));
    if (!vertical) errors.push(`Catégorie inconnue : « ${get(r, 'category')} »`);
    if (errors.length) return { line: i + 2, place: null, errors, warnings };

    const type = get(r, 'type') || null;
    const address = get(r, 'address') || null;
    const status = get(r, 'status');
    const latS = get(r, 'lat');
    const lngS = get(r, 'lng');
    const pos =
      (latS && lngS ? parsePosition(`${latS}, ${lngS}`) : null) ||
      parsePosition(get(r, 'position')) ||
      parsePosition(get(r, 'maps')) ||
      parsePosition(address);
    if (!pos) warnings.push('Sans position : pas d’épingle sur la carte');
    else if (geo) {
      const at = communeAt(pos.lat, pos.lng, geo);
      if (at && !sameCommune(at, commune)) warnings.push(`La position tombe à ${at}, pas à ${commune} : à vérifier`);
    }
    const budgetRaw = get(r, 'budget').replace(/€/g, '$');
    const budget = /^\${1,3}$/.test(budgetRaw) ? budgetRaw : null;
    if (budgetRaw && !budget) warnings.push(`Budget ignoré : « ${budgetRaw} » (utilisez $, $$ ou $$$)`);
    const ratingRaw = get(r, 'rating');
    const google_rating = ratingRaw ? toRating(ratingRaw) : null;
    if (ratingRaw && google_rating === null) warnings.push(`Note ignorée : « ${ratingRaw} »`);
    const pubRaw = get(r, 'published');
    const pub = toBool(pubRaw);
    const published = pub ?? statusMeansVerified(status);
    const photoRaw = get(r, 'photo');
    const image_url = cleanUrl(photoRaw);
    if (photoRaw && !image_url) warnings.push('Photo ignorée : le lien doit commencer par https://');

    return {
      line: i + 2,
      errors,
      warnings,
      place: {
        name: name.slice(0, 160),
        commune: commune!,
        vertical: vertical!,
        place_type: type,
        address,
        description: get(r, 'description') || defaultDescription(type, commune!, address),
        budget,
        phone: get(r, 'phone') || null,
        google_rating,
        google_reviews: get(r, 'reviews') ? toInt(get(r, 'reviews')) : null,
        google_maps_url: cleanUrl(get(r, 'maps')),
        image_url,
        lat: pos?.lat ?? null,
        lng: pos?.lng ?? null,
        published,
        verification: status || null,
      },
    };
  });
  return { rows, missingColumns, unknownColumns };
}

/** Same place = same name + commune + address (two "Résidence" rows at different addresses are kept). */
export const placeKey = (name: string, commune: string, address?: string | null) =>
  `${communeKey(commune)}|${norm(name || '')}|${norm(address || '')}`;
