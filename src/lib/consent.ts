// Shared cookie-consent state. Kept as a tiny standalone module (rather
// than inline in the banner component) so other parts of the site — the
// footer's "Gérer les cookies" link, in particular — can read/reset the
// same value without importing the banner component itself.
//
// The stored value is intentionally NOT scoped to a browser session like
// the newsletter popup: a consent choice should stick until the person
// deliberately changes it, not reappear on every new visit.

export const COOKIE_CONSENT_KEY = 'kin_cookie_consent';
export const COOKIE_CONSENT_RESET_EVENT = 'kin-cookie-consent-reset';

export const GA_MEASUREMENT_ID = 'G-RV9MFJSSNX';

export type ConsentValue = 'unknown' | 'granted' | 'denied';

export function readStoredConsent(): ConsentValue {
  try {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (stored === 'granted' || stored === 'denied') return stored;
  } catch (e) {
    // Storage unavailable — fail safe by treating it as "not yet decided"
    // rather than silently granting tracking.
  }
  return 'unknown';
}

export function storeConsent(value: 'granted' | 'denied') {
  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, value);
  } catch (e) {
    // ignore
  }
}

// Clears the stored choice and tells any mounted CookieConsentBanner to
// re-show itself, so a visitor can change their mind later (used by the
// footer's "Gérer les cookies" link).
export function resetConsent() {
  try {
    localStorage.removeItem(COOKIE_CONSENT_KEY);
  } catch (e) {
    // ignore
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(COOKIE_CONSENT_RESET_EVENT));
  }
}
