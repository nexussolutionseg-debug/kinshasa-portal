// Indicative general road-congestion level per commune — NOT live traffic
// data. There is no free, no-API-key-billing traffic data source
// available (Google's traffic layer needs the same billing-enabled key
// the rest of this app deliberately avoids), so this is a coarse,
// clearly-labeled approximation rather than a measured dataset.
//
// Levels are based on well-documented chokepoints and population density:
// Boulevard du 30 Juin (Gombe), Boulevard Lumumba through Limete/Masina,
// the historic city-center market corridor (Kinshasa commune, Barumbu,
// Lingwala), and Kasa-Vubu/Kalamu's Rond-Point Victoire area — all named
// in Radio Okapi's 2025 reporting on Kinshasa's worst bouchons — with the
// larger, lower-density outer communes assumed lighter.
//
// Shared between the homepage's map-coloring "Kin Traffic" tab and each
// commune page's summary badge, so the two never drift apart.
export type TrafficLevel = 'heavy' | 'moderate' | 'light';

export const TRAFFIC_LEVELS: Record<string, TrafficLevel> = {
  Gombe: 'heavy',
  Kinshasa: 'heavy',
  Limete: 'heavy',
  Kalamu: 'heavy',
  'Kasa-Vubu': 'heavy',
  Lingwala: 'heavy',
  Barumbu: 'heavy',
  Bandalungwa: 'moderate',
  Kintambo: 'moderate',
  Ngaliema: 'moderate',
  Masina: 'moderate',
  Ndjili: 'moderate',
  "N'djili": 'moderate',
  Matete: 'moderate',
  'Ngiri-Ngiri': 'moderate',
  Makala: 'moderate',
  Bumbu: 'moderate',
  Selembao: 'moderate',
  Ngaba: 'moderate',
  Kisenso: 'moderate',
  Lemba: 'moderate',
  Kimbanseke: 'moderate',
  Maluku: 'light',
  Nsele: 'light',
  "N'sele": 'light',
  'Mont Ngafula': 'light',
  'Mont-Ngafula': 'light',
};

export const TRAFFIC_COLORS: Record<TrafficLevel, string> = {
  heavy: '#C4453A',
  moderate: '#C8992E',
  light: '#2F6B45',
};

export const TRAFFIC_LABELS: Record<TrafficLevel, string> = {
  heavy: 'Dense',
  moderate: 'Modéré',
  light: 'Fluide',
};

export const DEFAULT_COMMUNE_COLOR = '#14294A';

// MapLibre expression that colors a commune shape by its traffic level,
// matched on the commune's `name` property (the homepage's overview map
// only — falls back to the default navy used everywhere else).
export const TRAFFIC_FILL_EXPRESSION: any[] = [
  'match',
  ['get', 'name'],
  ...Object.entries(TRAFFIC_LEVELS).flatMap(([name, level]) => [name, TRAFFIC_COLORS[level]]),
  DEFAULT_COMMUNE_COLOR,
];

// Best-effort lookup for a single commune name (handles the couple of
// spelling variants used across communes.json vs. COMMUNE_DETAILS, e.g.
// "Ndjili" vs "N'djili").
export function getTrafficLevel(communeName: string): TrafficLevel | null {
  return TRAFFIC_LEVELS[communeName] ?? null;
}
