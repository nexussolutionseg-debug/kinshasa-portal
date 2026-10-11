// "Don't nag" rules for the two things that interrupt a visitor: the
// cookie (Google Analytics) bar and the newsletter invitation (2026-10-11).
//
//  - At most ONE prompt per visit. The cookie bar goes first; the
//    newsletter invitation never appears in a visit where the bar showed.
//  - Cookie bar: shown on a visitor's first visit. If they ignore it, it
//    comes back on ONE more visit, then never again (Google Analytics simply
//    stays off; "Gérer les cookies" in the footer still opens it).
//  - Newsletter invitation: never on a first visit, never to someone who
//    subscribed (popup, footer form, or arriving from one of our emails),
//    and only after real interest (scroll / time on page). After "Plus tard"
//    it rests 14 days, then 45 days; after the third time, never again.
//
// Everything is remembered in the visitor's own browser (localStorage), so
// a different phone or browser counts as a new visitor, as on any site
// without accounts. Storage blocked (private mode on some browsers): we
// keep the invitation hidden rather than repeat ourselves.

const VISIT_KEY = 'kin_visit'; // sessionStorage: this tab's visit is counted
const VISITS_KEY = 'kin_visits'; // localStorage: number of visits
const BANNER_SEEN_KEY = 'kin_cookie_banner_visits'; // localStorage: visits where the bar showed
const BANNER_THIS_VISIT = 'kin_cookie_banner_this_visit'; // sessionStorage
const POPUP_KEY = 'kin_newsletter_popup'; // localStorage: {shown, last}
const POPUP_THIS_VISIT = 'kin_newsletter_popup_shown'; // sessionStorage
export const SUBSCRIBED_KEY = 'kin_newsletter_subscribed'; // localStorage

export const COOKIE_BANNER_MAX_VISITS = 2;
const POPUP_REST_DAYS = [14, 45]; // after 1st and 2nd "Plus tard"
const POPUP_MAX_SHOWS = 3;
const DAY = 86_400_000;

function ls() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
function ss() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}
const num = (v: string | null) => (v && /^\d+$/.test(v) ? Number(v) : 0);

/** Counts this visit once (a visit = one browser session) and returns the visit number. */
export function registerVisit(): number {
  const l = ls();
  const s = ss();
  if (!l || !s) return 0;
  try {
    if (s.getItem(VISIT_KEY) !== '1') {
      s.setItem(VISIT_KEY, '1');
      l.setItem(VISITS_KEY, String(num(l.getItem(VISITS_KEY)) + 1));
    }
    return num(l.getItem(VISITS_KEY));
  } catch {
    return 0;
  }
}

/** Should the cookie bar show on this visit (consent not answered yet)? Records it if so. */
export function claimCookieBanner(): boolean {
  const l = ls();
  const s = ss();
  if (!l || !s) return true; // can't remember anything: ask (GA stays off unless accepted)
  try {
    if (s.getItem(BANNER_THIS_VISIT) === '1') return true;
    const seen = num(l.getItem(BANNER_SEEN_KEY));
    if (seen >= COOKIE_BANNER_MAX_VISITS) return false;
    l.setItem(BANNER_SEEN_KEY, String(seen + 1));
    s.setItem(BANNER_THIS_VISIT, '1');
    return true;
  } catch {
    return true;
  }
}

/** "Gérer les cookies": the visitor asked, so the bar may show again. */
export function allowCookieBannerAgain() {
  const s = ss();
  try {
    s?.setItem(BANNER_THIS_VISIT, '1');
  } catch {
    /* ignore */
  }
}

export function cookieBannerShownThisVisit(): boolean {
  try {
    return ss()?.getItem(BANNER_THIS_VISIT) === '1';
  } catch {
    return false;
  }
}

export function markSubscribed() {
  try {
    ls()?.setItem(SUBSCRIBED_KEY, '1');
  } catch {
    /* ignore */
  }
}

/** Visitors arriving from one of our emails are subscribers. */
export function noteArrivalFromEmail() {
  try {
    const p = new URLSearchParams(window.location.search);
    if (p.get('utm_medium') === 'email' || p.get('utm_source') === 'newsletter') markSubscribed();
  } catch {
    /* ignore */
  }
}

/** May the newsletter invitation be considered on this visit? (Engagement is checked by the caller.) */
export function newsletterPopupAllowed(visit: number, now = Date.now()): boolean {
  const l = ls();
  const s = ss();
  if (!l || !s) return false;
  try {
    if (l.getItem(SUBSCRIBED_KEY) === '1') return false;
    if (s.getItem(POPUP_THIS_VISIT) === '1') return false;
    if (visit < 2) return false; // never on a first visit
    if (cookieBannerShownThisVisit()) return false; // one prompt per visit
    const state = JSON.parse(l.getItem(POPUP_KEY) || '{}') as { shown?: number; last?: number };
    const shown = state.shown || 0;
    if (shown >= POPUP_MAX_SHOWS) return false;
    if (shown > 0) {
      const rest = POPUP_REST_DAYS[Math.min(shown, POPUP_REST_DAYS.length) - 1] * DAY;
      if (now - (state.last || 0) < rest) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function recordNewsletterPopupShown(now = Date.now()) {
  const l = ls();
  try {
    ss()?.setItem(POPUP_THIS_VISIT, '1');
    const state = JSON.parse(l?.getItem(POPUP_KEY) || '{}') as { shown?: number };
    l?.setItem(POPUP_KEY, JSON.stringify({ shown: (state.shown || 0) + 1, last: now }));
  } catch {
    /* ignore */
  }
}

/** Subscribe through our server (which also sends the welcome email). */
export async function subscribeEmail(email: string, source: 'popup' | 'footer'): Promise<'ok' | 'invalid' | 'error'> {
  try {
    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, source, website: '' }),
    });
    if (res.status === 400) return 'invalid';
    if (!res.ok) return 'error';
    markSubscribed();
    return 'ok';
  } catch {
    return 'error';
  }
}
