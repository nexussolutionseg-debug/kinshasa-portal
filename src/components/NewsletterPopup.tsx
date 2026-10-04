// Newsletter invitation (homepage). Mobile-first rework (2026-10-04) after
// client feedback that it "wasn't made for mobile":
//
//  - It no longer appears 2.5 s after load. It waits until the visitor has
//    answered the cookie banner (never two overlays at once) AND has either
//    scrolled ~45% of the page or spent 25 s on it — i.e. they're engaged.
//  - On phones it's a bottom sheet (thumb-reachable, slides up), a centered
//    card from md up.
//  - No autoFocus: focusing the field on open popped the phone keyboard
//    immediately, and with a 14px field iOS auto-zoomed the whole page.
//    Inputs are now 16px (also enforced globally in globals.css).
//  - Big 44px close button, Escape closes, body scroll locked while open.
//
// Still once per browser session (sessionStorage), and never again for a
// browser that has subscribed (localStorage). The footer form remains the
// permanent way to subscribe.
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { readStoredConsent } from '../lib/consent';
import { IconClose } from './icons';

const SESSION_KEY = 'kin_newsletter_popup_shown';
const SUBSCRIBED_KEY = 'kin_newsletter_subscribed';
const MIN_TIME_MS = 25_000;
const SCROLL_RATIO = 0.45;

export function NewsletterPopup() {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    try {
      if (localStorage.getItem(SUBSCRIBED_KEY) === '1' || sessionStorage.getItem(SESSION_KEY) === '1') return;
    } catch {
      return;
    }

    let shown = false;
    const start = Date.now();
    const maybeShow = () => {
      if (shown) return;
      if (readStoredConsent() === 'unknown') return; // cookie banner still up
      const doc = document.documentElement;
      const scrolled = (window.scrollY + window.innerHeight) / Math.max(doc.scrollHeight, 1);
      if (scrolled < SCROLL_RATIO && Date.now() - start < MIN_TIME_MS) return;
      shown = true;
      try {
        sessionStorage.setItem(SESSION_KEY, '1');
      } catch {
        /* ignore */
      }
      setVisible(true);
      cleanup();
    };
    const timer = window.setInterval(maybeShow, 1000);
    window.addEventListener('scroll', maybeShow, { passive: true });
    const cleanup = () => {
      window.clearInterval(timer);
      window.removeEventListener('scroll', maybeShow);
    };
    return cleanup;
  }, []);

  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setVisible(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [visible]);

  const close = () => setVisible(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setStatus('loading');
    setErrorMsg('');
    const { error } = await supabase.from('subscribers').insert([{ email: trimmed }]);
    if (error && error.code !== '23505') {
      // 23505 = already subscribed, which is a success from the visitor's side
      setStatus('error');
      setErrorMsg('Une erreur est survenue, réessayez plus tard.');
      return;
    }
    setStatus('success');
    try {
      localStorage.setItem(SUBSCRIBED_KEY, '1');
    } catch {
      /* ignore */
    }
    setTimeout(close, 2200);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-brand-ink/55 backdrop-blur-[2px]"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-labelledby="newsletter-title"
    >
      <div
        className="relative w-full md:max-w-md bg-white rounded-t-[28px] md:rounded-3xl shadow-lift overflow-hidden animate-pop-in pb-[env(safe-area-inset-bottom)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* drag-handle look on phones */}
        <div className="md:hidden flex justify-center pt-2.5">
          <span className="w-10 h-1.5 rounded-full bg-brand-line" />
        </div>
        <div className="h-1.5 w-full hidden md:flex" aria-hidden="true">
          <span className="flex-1 bg-brand-blue" />
          <span className="flex-1 bg-brand-yellow" />
          <span className="flex-1 bg-brand-red" />
        </div>

        <button
          type="button"
          aria-label="Fermer"
          onClick={close}
          className="absolute top-3 right-3 inline-flex items-center justify-center w-11 h-11 rounded-full text-brand-muted hover:text-brand-ink hover:bg-brand-bg cursor-pointer"
        >
          <IconClose size={20} />
        </button>

        <div className="px-6 pt-4 md:pt-7 pb-6">
          <div className="flex items-center gap-3 pr-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" width={48} height={48} className="shrink-0" />
            <h3 id="newsletter-title" className="font-display text-2xl font-extrabold text-brand-ink m-0 leading-tight">
              Le meilleur de Kin, chaque semaine
            </h3>
          </div>
          <p className="text-[15px] text-brand-ink/70 mt-3 mb-5 leading-relaxed">
            Nouvelles adresses, sorties du week-end et actualité de Kinshasa — directement dans votre boîte mail.
          </p>

          {status === 'success' ? (
            <p className="text-base text-brand-blue-deep font-bold m-0 bg-brand-blue-soft rounded-2xl px-4 py-3">
              Merci ! Vous êtes bien inscrit(e) 🎉
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <label htmlFor="newsletter-email" className="sr-only">
                Adresse e-mail
              </label>
              <input
                id="newsletter-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="w-full h-12 px-4 bg-brand-bg border-2 border-brand-line text-brand-ink rounded-2xl text-base placeholder:text-brand-muted focus:outline-none focus:border-brand-blue"
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full h-12 rounded-full bg-brand-red text-white font-bold text-base cursor-pointer hover:bg-brand-red-dark disabled:opacity-60"
              >
                {status === 'loading' ? 'Envoi…' : "Je m'abonne"}
              </button>
              <button type="button" onClick={close} className="w-full h-10 text-sm font-semibold text-brand-muted cursor-pointer hover:text-brand-ink">
                Plus tard
              </button>
            </form>
          )}
          {status === 'error' && <p className="text-sm text-brand-danger mt-2 mb-0">{errorMsg}</p>}
        </div>
      </div>
    </div>
  );
}
