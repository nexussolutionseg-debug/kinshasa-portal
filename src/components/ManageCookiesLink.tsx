// Small client-only link used in the footer so a visitor can change their
// earlier cookie choice at any time — clears the stored consent and tells
// the CookieConsentBanner (mounted in the root layout) to show itself
// again, without a full page reload.
'use client';

import { resetConsent } from '../lib/consent';

export function ManageCookiesLink() {
  return (
    <button
      type="button"
      onClick={resetConsent}
      className="text-sm text-brand-ink/70 hover:text-brand-red transition-colors bg-transparent border-0 p-0 text-left cursor-pointer font-normal"
    >
      Gérer les cookies
    </button>
  );
}
