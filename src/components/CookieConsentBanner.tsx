// Site-wide cookie consent banner. Google Analytics (unlike Vercel Web
// Analytics, which is cookieless and always on) sets cookies and requires
// a consent signal for EEA/UK visitors under Google's own policies — so
// the <GoogleAnalytics> script is only ever mounted once someone actively
// accepts. Declining, or simply not answering, means the GA script is
// never fetched by the browser at all: no script, no cookie, nothing to
// dispute.
//
// The choice persists indefinitely (localStorage, see src/lib/consent.ts)
// rather than resetting every session, and can be changed later via the
// "Gérer les cookies" link in the footer, which fires a reset event this
// component listens for.
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GoogleAnalytics } from '@next/third-parties/google';
import { Button } from './Button';
import {
  GA_MEASUREMENT_ID,
  COOKIE_CONSENT_RESET_EVENT,
  readStoredConsent,
  storeConsent,
  type ConsentValue,
} from '../lib/consent';

export function CookieConsentBanner() {
  const [consent, setConsent] = useState<ConsentValue>('unknown');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setConsent(readStoredConsent());
    setHydrated(true);

    const onReset = () => setConsent('unknown');
    window.addEventListener(COOKIE_CONSENT_RESET_EVENT, onReset);
    return () => window.removeEventListener(COOKIE_CONSENT_RESET_EVENT, onReset);
  }, []);

  const choose = (value: 'granted' | 'denied') => {
    storeConsent(value);
    setConsent(value);
  };

  return (
    <>
      {consent === 'granted' && <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />}

      {hydrated && consent === 'unknown' && (
        <div
          role="region"
          aria-label="Cookies"
          className="fixed inset-x-3 bottom-3 md:inset-x-0 md:bottom-0 z-[55] rounded-2xl md:rounded-none border border-brand-line bg-white shadow-lift px-4 py-3.5 md:px-6 md:py-4 mb-[env(safe-area-inset-bottom)]"
        >
          <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
            <p className="text-sm text-brand-ink/80 m-0 flex-1 leading-snug">
              <span className="md:hidden">
                🍪 Nous mesurons l&apos;audience avec Google Analytics, si vous l&apos;acceptez.{' '}
              </span>
              <span className="hidden md:inline">
                Nous utilisons Google Analytics pour comprendre comment ce site est utilisé (pages visitées,
                provenance des visiteurs). Vous pouvez accepter ou refuser ce suivi ; votre choix reste modifiable à
                tout moment depuis le pied de page.{' '}
              </span>
              <Link href="/politique-de-confidentialite" className="text-brand-red-dark no-underline hover:text-brand-red font-semibold">
                En savoir plus
              </Link>
            </p>
            <div className="grid grid-cols-2 md:flex gap-2.5 shrink-0">
              <Button type="button" variant="secondary" size="md" onClick={() => choose('denied')}>
                Refuser
              </Button>
              <Button type="button" variant="primary" size="md" onClick={() => choose('granted')}>
                Accepter
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
