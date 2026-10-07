'use client';

import { useState } from 'react';
import { SiteHeader } from '../../components/SiteHeader';
import { SiteTicker } from '../../components/SiteTicker';
import { SiteFooter } from '../../components/SiteFooter';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';

const inputClass =
  'w-full box-border px-3.5 py-2.5 bg-brand-bg border border-brand-line text-brand-ink rounded-lg text-sm placeholder:text-brand-muted focus:outline-none focus:border-brand-red';
const labelClass = 'block text-[11px] text-brand-muted uppercase font-bold mb-1.5';

export default function BecomePartnerPage() {
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    const { error } = await supabase.from('partner_inquiries').insert([
      {
        company_name: companyName.trim(),
        contact_name: contactName.trim() || null,
        email: email.trim(),
        phone: phone.trim() || null,
        message: message.trim() || null,
      },
    ]);

    if (error) {
      setStatus('error');
      setErrorMsg(error.message);
      return;
    }
    setStatus('success');
  };

  return (
    <main className="min-h-screen bg-brand-bg text-brand-ink flex flex-col">
      <SiteHeader below={<SiteTicker />} />

      <div className="max-w-[640px] mx-auto px-4 md:px-6 py-14 md:py-20 flex-1 w-full">
        <h1 className="font-display text-3xl md:text-4xl font-semibold text-brand-ink mb-3 text-center">
          Devenir partenaire
        </h1>
        <p className="text-base text-brand-ink/70 leading-relaxed mb-10 text-center">
          Commerce, institution, média ou investisseur : parlons de comment Kinshasa Label peut
          accompagner votre visibilité ou votre projet à Kinshasa.
        </p>

        {status === 'success' ? (
          <div className="bg-brand-surface border border-brand-red/40 rounded-xl p-6 text-center">
            <p className="text-brand-red-dark font-semibold m-0">Merci pour votre message !</p>
            <p className="text-sm text-brand-ink/70 mt-2 mb-0">
              Notre équipe vous recontactera très prochainement à l&apos;adresse indiquée.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-brand-surface border border-brand-line rounded-2xl p-6 flex flex-col gap-4">
            <div>
              <label className={labelClass}>Nom de l&apos;entreprise / organisation *</label>
              <input required value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputClass} placeholder="ex: Nexus Solutions" />
            </div>
            <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
              <div>
                <label className={labelClass}>Nom du contact</label>
                <input value={contactName} onChange={(e) => setContactName(e.target.value)} className={inputClass} placeholder="ex: Jean Kalala" />
              </div>
              <div>
                <label className={labelClass}>Téléphone</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="+243 ..." />
              </div>
            </div>
            <div>
              <label className={labelClass}>E-mail *</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="votre@email.com" />
            </div>
            <div>
              <label className={labelClass}>Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className={inputClass}
                placeholder="Parlez-nous de votre projet ou de votre besoin..."
              />
            </div>
            {status === 'error' && <p className="text-sm text-brand-danger m-0">{errorMsg}</p>}
            <Button type="submit" variant="primary" size="lg" fullWidth disabled={status === 'loading'}>
              {status === 'loading' ? 'Envoi...' : 'Envoyer la demande →'}
            </Button>
          </form>
        )}
      </div>

      <SiteFooter />
    </main>
  );
}
