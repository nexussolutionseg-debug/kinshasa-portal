// Turning what people paste into coordinates (2026-10-07):
//   * Google "plus codes" — full ("6G2Q+M79J…") or short ("M79J+6H",
//     "Camp Riche, J89V+RVM") — short ones are resolved around Kinshasa.
//   * "lat, lng" pairs ("-4.3217, 15.3125").
//   * Google Maps links that contain "@lat,lng" or "q=lat,lng" / "!3dlat!4dlng".
// Everything is checked to fall inside greater Kinshasa so a typo can't
// drop a pin in the ocean.

const ALPHABET = '23456789CFGHJMPQRVWX';
const KIN_REF = { lat: -4.33, lng: 15.31 };

export function inKinshasa(lat: number, lng: number) {
  return lat > -5.2 && lat < -3.9 && lng > 15.0 && lng < 16.6;
}

function encodePrefix(lat: number, lng: number): string {
  // 10-digit code (pairs only), enough to supply missing leading digits.
  let la = Math.min(Math.max(lat, -90), 90 - 1e-9) + 90;
  let lo = ((((lng + 180) % 360) + 360) % 360);
  let out = '';
  let res = 20;
  for (let i = 0; i < 5; i++) {
    const dl = Math.floor(la / res);
    const dg = Math.floor(lo / res);
    la -= dl * res;
    lo -= dg * res;
    out += ALPHABET[dl] + ALPHABET[dg];
    if (i === 3) out += '+';
    res /= 20;
  }
  return out;
}

function decodeFull(code: string): { lat: number; lng: number } | null {
  const clean = code.replace('+', '').toUpperCase();
  if (clean.length < 8) return null;
  let lat = -90;
  let lng = -180;
  let res = 20;
  const pairs = Math.min(clean.length, 10);
  for (let i = 0; i < pairs; i += 2) {
    const a = ALPHABET.indexOf(clean[i]);
    const b = ALPHABET.indexOf(clean[i + 1]);
    if (a < 0 || b < 0) return null;
    lat += a * res;
    lng += b * res;
    if (i + 2 < pairs) res /= 20;
  }
  let latRes = res;
  let lngRes = res;
  for (let i = 10; i < clean.length; i++) {
    const d = ALPHABET.indexOf(clean[i]);
    if (d < 0) return null;
    latRes /= 5;
    lngRes /= 4;
    lat += Math.floor(d / 4) * latRes;
    lng += (d % 4) * lngRes;
  }
  return { lat: lat + latRes / 2, lng: lng + lngRes / 2 };
}

/** Resolves a full or short plus code. Short codes are taken as near Kinshasa. */
export function decodePlusCode(input: string): { lat: number; lng: number } | null {
  const m = input.toUpperCase().match(/([23456789CFGHJMPQRVWX]{2,8})\+([23456789CFGHJMPQRVWX]{2,7})?/);
  if (!m) return null;
  const head = m[1];
  const tail = m[2] || '';
  if (head.length % 2 !== 0) return null;
  if (head.length === 8) return decodeFull(head + '+' + tail);

  // Short code: borrow the missing leading digits from Kinshasa's own code,
  // then pick whichever neighbouring cell is closest to Kinshasa.
  const pad = 8 - head.length;
  const resolution = Math.pow(20, 2 - pad / 2);
  const ref = encodePrefix(KIN_REF.lat, KIN_REF.lng).replace('+', '').slice(0, pad);
  const c = decodeFull(ref + head + '+' + tail);
  if (!c) return null;
  let { lat, lng } = c;
  const half = resolution / 2;
  if (KIN_REF.lat + half < lat && lat - resolution >= -90) lat -= resolution;
  else if (KIN_REF.lat - half > lat && lat + resolution <= 90) lat += resolution;
  if (KIN_REF.lng + half < lng) lng -= resolution;
  else if (KIN_REF.lng - half > lng) lng += resolution;
  return { lat, lng };
}

/** Any of: plus code, "lat, lng", Google Maps link. Returns null if not understood or outside Kinshasa. */
export function parsePosition(input: string | null | undefined): { lat: number; lng: number } | null {
  if (!input) return null;
  const s = String(input).trim();
  if (!s) return null;
  const tries: RegExp[] = [
    /@(-?\d+\.\d+),\s*(-?\d+\.\d+)/,
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    /[?&](?:q|query|ll|center)=(-?\d+\.\d+)(?:,|%2C)\s*(-?\d+\.\d+)/i,
    /^(-?\d{1,2}[.,]\d+)\s*[,; ]\s*(-?\d{1,3}[.,]\d+)$/,
  ];
  for (const re of tries) {
    const m = s.match(re);
    if (m) {
      const lat = parseFloat(m[1].replace(',', '.'));
      const lng = parseFloat(m[2].replace(',', '.'));
      if (inKinshasa(lat, lng)) return { lat, lng };
    }
  }
  const pc = decodePlusCode(s);
  if (pc && inKinshasa(pc.lat, pc.lng)) return pc;
  return null;
}
