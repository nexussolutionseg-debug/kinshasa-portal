// Compact email-capture form embedded in the site footer. Stores addresses
// straight into Supabase (public.subscribers, insert-only for the anon
// client) — no email-sending service is connected yet, so this is purely
// a list to export later once one is chosen.
'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from './Button';
import { IconMail } from './icons';

export function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setStatus('loading');
    setErrorMsg('');
    const { error } = await supabase.from('subscribers').insert([{ email: trimmed }]);

    if (error) {
      // Postgres unique_violation on the email column — already subscribed.
      if (error.code === '23505') {
        setStatus('success');
        setEmail('');
      } else {
        setStatus('error');
        setErrorMsg("Une erreur est survenue, réessaie plus tard.");
      }
      return;
    }

    setStatus('success');
    setEmail('');
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
      <div className="max-w-sm">
        <h3 className="font-display text-lg font-semibold text-brand-ink m-0 flex items-center gap-2">
          <IconMail size={18} /> Reste informé
        </h3>
        <p className="text-sm text-brand-ink/60 mt-1.5 mb-0">
          Reçois les nouveautés, sorties du week-end et actualités de Kinshasa.
        </p>
      </div>

      {status === 'success' ? (
        <p className="text-sm text-brand-red-dark font-medium m-0">
          Merci ! Tu es bien inscrit(e).
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5 flex-1 max-w-md">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ton@email.com"
            className="flex-1 min-w-0 box-border px-3.5 py-2.5 bg-brand-bg border border-brand-line text-brand-ink rounded-lg text-sm placeholder:text-brand-muted focus:outline-none focus:border-brand-red"
          />
          <Button type="submit" variant="primary" size="md" disabled={status === 'loading'}>
            {status === 'loading' ? 'Envoi...' : "Je m'abonne"}
          </Button>
        </form>
      )}
      {status === 'error' && <p className="text-xs text-brand-danger m-0">{errorMsg}</p>}
    </div>
  );
}
