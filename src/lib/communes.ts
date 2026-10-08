// Commune names are written many ways ("N'Djili", "Ndjili", "Mont-Ngafula",
// "Mont Ngafula", "N'sele"…). Compare them by a simple key so places always
// land on the right commune page and map, however they were typed.

export const COMMUNE_NAMES = [
  'Bandalungwa', 'Barumbu', 'Bumbu', 'Gombe', 'Kalamu', 'Kasa-Vubu', 'Kimbanseke', 'Kinshasa',
  'Kintambo', 'Kisenso', 'Lemba', 'Limete', 'Lingwala', 'Makala', 'Maluku', 'Masina', 'Matete',
  'Mont-Ngafula', "N'djili", "N'sele", 'Ngaba', 'Ngaliema', 'Ngiri-Ngiri', 'Selembao',
];

export function communeKey(s: string | null | undefined): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

export function sameCommune(a: string | null | undefined, b: string | null | undefined): boolean {
  const ka = communeKey(a);
  return !!ka && ka === communeKey(b);
}

function inRing(lng: number, lat: number, ring: number[][]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Which commune a point falls in, using the map's commune outlines (pass communes.json). */
export function communeAt(lat: number, lng: number, geo: { features: any[] }): string | null {
  for (const f of geo.features) {
    const g = f.geometry;
    const polys: number[][][][] = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
    if (polys.some((p) => inRing(lng, lat, p[0]) && !p.slice(1).some((h) => inRing(lng, lat, h)))) return f.properties.name;
  }
  return null;
}

/** Official spelling for whatever was typed, or null if it isn't one of the 24 communes. */
export function canonicalCommune(input: string | null | undefined): string | null {
  const k = communeKey(input);
  if (!k) return null;
  return COMMUNE_NAMES.find((c) => communeKey(c) === k) || null;
}

/** Clean address part for a commune: "Mont-Ngafula" → "mont-ngafula", "N'djili" → "ndjili". */
export function communeSlug(name: string): string {
  return (canonicalCommune(name) || name)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const communeHref = (name: string) => `/commune/${communeSlug(name)}`;
