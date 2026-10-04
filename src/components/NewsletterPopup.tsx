// One-time newsletter popup for the homepage. Shows itself once per browser
// session (sessionStorage flag) a couple of seconds after the page loads,
// and never again in that session whether the visitor subscribes, closes
// it, or ignores it. Also skipped entirely for a visitor who has already
// subscribed on this browser before (localStorage flag), so returning
// subscribers aren't nagged again in future sessions either. The footer's
// always-present NewsletterSignup form (src/components/NewsletterSignup.tsx)
// stays the permanent, non-intrusive way to subscribe for anyone who
// dismissed the popup or arrives after it would have shown.
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from './Button';
import { IconMail, IconClose } from './icons';

const SESSION_KEY = 'kin_newsletter_popup_shown';
const SUBSCRIBED_KEY = 'kin_newsletter_subscribed';
const SHOW_DELAY_MS = 2500;

export function NewsletterPopup() {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    try {
      const alreadySubscribed = localStorage.getItem(SUBSCRIBED_KEY) === '1';
      const shownThisSession = sessionStorage.getItem(SESSION_KEY) === '1';
      if (alreadySubscribed || shownThisSession) return;
    } catch (e) {
      // If storage is unavailable for some reason, fail quiet and simply
      // don't show the popup rather than risk showing it on every load.
      return;
    }

    const timer = setTimeout(() => {
      try {
        sessionStorage.setItem(SESSION_KEY, '1');
      } catch (e) {
        // ignore
      }
      setVisible(true);
    }, SHOW_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  const close = () => setVisible(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setStatus('loading');
    setErrorMsg('');
    const { error } = await supabase.from('subscribers').insert([{ email: trimmed }]);

    if (error && error.code !== '23505') {
      // Anything other than "already subscribed" (unique_violation) is a
      // real error — unique_violation just means they were already on the
      // list, which we still treat as a success from the visitor's side.
      setStatus('error');
      setErrorMsg("Une erreur est survenue, réessayez plus tard.");
      return;
    }

    setStatus('success');
    try {
      localStorage.setItem(SUBSCRIBED_KEY, '1');
    } catch (e) {
      // ignore
    }
    setTimeout(close, 1800);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={close}
    >
      <div
        className="relative w-full max-w-md bg-brand-surface border border-brand-line rounded-2xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Fermer"
          onClick={close}
          className="absolute top-3 right-3 inline-flex items-center justify-center w-8 h-8 text-brand-muted hover:text-brand-ink"
        >
          <IconClose size={18} />
        </button>

        <h3 className="font-display text-xl font-semibold text-brand-ink m-0 flex items-center gap-2 pr-6">
          <IconMail size={20} /> Restez informé
        </h3>
        <p className="text-sm text-brand-ink/60 mt-2 mb-5">
          Recevez les nouveautés, sorties du week-end et actualités de Kinshasa directement par
          e-mail.
        </p>

        {status === 'success' ? (
          <p className="text-sm text-brand-red-dark font-medium m-0">
            Merci ! Vous êtes bien inscrit(e).
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              className="w-full box-border px-3.5 py-2.5 bg-brand-bg border border-brand-line text-brand-ink rounded-lg text-sm placeholder:text-brand-muted focus:outline-none focus:border-brand-red"
            />
            <Button type="submit" variant="primary" size="md" fullWidth disabled={status === 'loading'}>
              {status === 'loading' ? 'Envoi...' : "S'abonner"}
            </Button>
          </form>
        )}
        {status === 'error' && <p className="text-xs text-brand-danger mt-2 m-0">{errorMsg}</p>}
      </div>
    </div>
  );
}
