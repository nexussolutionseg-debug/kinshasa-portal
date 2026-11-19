'use client';

// « Deviens partenaire » (2026-11-19): the 3 packs with prices, a pack
// choice in the form, a WhatsApp button, and the visitor's source (utm_*)
// sent with the request so the team knows which post brought each partner.
// Links from social posts: /devenir-partenaire?pack=site&utm_source=instagram&...
import { useEffect, useRef, useState } from 'react';
import { SiteHeader } from '../../components/SiteHeader';
import { SiteTicker } from '../../components/SiteTicker';
import { SiteFooter } from '../../components/SiteFooter';
import { Button } from '../../components/Button';
import { PACK_OFFERS, PACK_CHOICE_LABEL } from '../../lib/partners';

const inputClass =
  'w-full box-border px-3.5 py-2.5 bg-brand-bg border border-brand-line text-brand-ink rounded-lg text-[16px] md:text-sm placeholder:text-brand-muted focus:outline-none focus:border-brand-red';
const labelClass = 'block text-[11px] text-brand-muted uppercase font-bold mb-1.5';

// Set NEXT_PUBLIC_PARTNER_WHATSAPP in Vercel (digits, e.g. 243812345678) to show the WhatsApp button.
const WA = (process.env.NEXT_PUBLIC_PARTNER_WHATSAPP || '').replace(/\D/g, '');
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const;
const SRC_KEY = 'kl_partner_src';

/** utm_* of this visit, else the first ones seen in this browser session. */
function readSource(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const q = new URLSearchParams(window.location.search);
    UTM_KEYS.forEach((k) => {
      const v = q.get(k);
      if (v) out[k] = v.slice(0, 80);
    });
    if (Object.keys(out).length) {
      sessionStorage.setItem(SRC_KEY, JSON.stringify(out));
      return out;
    }
    const saved = sessionStorage.getItem(SRC_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    /* storage blocked: no source */
  }
  return out;
}

export default function BecomePartnerPage() {
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [pack, setPack] = useState('');
  const [source, setSource] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSource(readSource());
    const p = new URLSearchParams(window.location.search).get('pack');
    if (p && PACK_CHOICE_LABEL[p]) setPack(p);
  }, []);

  const choose = (id: string) => {
    setPack(id);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const waHref = WA
    ? `https://wa.me/${WA}?text=${encodeURIComponent(
        `Bonjour Kinshasa Label, je veux devenir partenaire${pack && pack !== 'inconnu' ? ` (${PACK_CHOICE_LABEL[pack]})` : ''}.`,
      )}`
    : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    // Saved + e-mailed to the team by /api/partner (2026-11-12).
    const hp = (e.currentTarget as HTMLFormElement).querySelector<HTMLInputElement>('input[name="website"]')?.value || '';
    try {
      const r = await fetch('/api/partner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_name: companyName, contact_name: contactName, email, phone, message, pack, source, website: hp }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) {
        setStatus('error');
        setErrorMsg(j.error || 'Envoi impossible pour le moment.');
        return;
      }
      setStatus('success');
    } catch {
      setStatus('error');
      setErrorMsg('Pas de connexion. Réessaie dans un instant.');
    }
  };

  return (
    <main className="min-h-screen bg-brand-bg text-brand-ink flex flex-col">
      <SiteHeader below={<SiteTicker />} />

      <section className="max-w-[1100px] mx-auto px-4 md:px-6 pt-14 md:pt-20 pb-6 w-full">
        <h1 className="font-display text-3xl md:text-4xl font-semibold text-brand-ink mb-3 text-center">Deviens partenaire</h1>
        <p className="text-base text-brand-ink/70 leading-relaxed mb-10 text-center max-w-[640px] mx-auto">
          Restaurant, hôtel, bar, lieu ou commerce : fais connaître ton adresse auprès des Kinois qui cherchent où sortir, manger et dormir, commune par commune.
        </p>

        <div className="grid gap-4 md:grid-cols-3">
          {PACK_OFFERS.map((o) => {
            const active = pack === o.id;
            return (
              <div
                key={o.id}
                className={`relative bg-brand-surface rounded-2xl p-6 flex flex-col border ${active ? 'border-brand-red ring-2 ring-brand-red/30' : o.popular ? 'border-brand-blue' : 'border-brand-line'}`}
              >
                {o.popular && (
                  <span className="absolute -top-3 left-6 bg-brand-blue text-white text-[11px] font-bold uppercase px-3 py-1 rounded-full">Le plus choisi</span>
                )}
                <h2 className="font-display text-xl font-semibold m-0">{o.name}</h2>
                <p className="text-sm text-brand-ink/70 mt-1 mb-4">{o.tagline}</p>
                <p className="m-0">
                  <span className="font-display text-3xl font-bold">{o.monthly} $</span>
                  <span className="text-sm text-brand-ink/70"> / mois</span>
                </p>
                <p className="text-xs text-brand-muted mt-1 mb-4">+ {o.setup} $ de mise en place, une seule fois</p>
                <ul className="list-none p-0 m-0 mb-6 flex flex-col gap-2 text-sm flex-1">
                  {o.perks.map((perk) => (
                    <li key={perk} className="flex gap-2">
                      <span className="text-brand-red font-bold" aria-hidden="true">✓</span>
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
                <Button type="button" variant={active || o.popular ? 'primary' : 'secondary'} size="md" fullWidth onClick={() => choose(o.id)}>
                  {active ? 'Pack choisi ✓' : `Choisir le ${o.name}`}
                </Button>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-brand-muted text-center mt-4">Prix en dollars américains. Sans engagement de durée sauf accord écrit.</p>
      </section>

      <div ref={formRef} className="max-w-[640px] mx-auto px-4 md:px-6 pt-8 pb-14 md:pb-20 flex-1 w-full scroll-mt-24">
        <h2 className="font-display text-2xl font-semibold text-center mb-2">Parlons de ton lieu</h2>
        <p className="text-sm text-brand-ink/70 text-center mb-6">Notre équipe te rappelle sous 24 h ouvrées.</p>

        {waHref && status !== 'success' && (
          <div className="mb-6 text-center">
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#25D366] text-white font-bold px-6 py-3 rounded-full no-underline hover:brightness-95"
            >
              Écris-nous sur WhatsApp
            </a>
            <p className="text-xs text-brand-muted mt-3 mb-0">ou remplis le formulaire</p>
          </div>
        )}

        {status === 'success' ? (
          <div className="bg-brand-surface border border-brand-red/40 rounded-xl p-6 text-center">
            <p className="text-brand-red-dark font-semibold m-0">Merci pour ton message !</p>
            <p className="text-sm text-brand-ink/70 mt-2 mb-0">Notre équipe te recontacte très vite.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="relative bg-brand-surface border border-brand-line rounded-2xl p-6 flex flex-col gap-4">
            {/* Honeypot: hidden from people, bots fill it. */}
            <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] w-px h-px opacity-0" />
            <div>
              <label className={labelClass} htmlFor="pf-pack">Pack qui t’intéresse</label>
              <select id="pf-pack" value={pack} onChange={(e) => setPack(e.target.value)} className={inputClass}>
                <option value="">Choisis un pack</option>
                {PACK_OFFERS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} · {o.monthly} $ / mois
                  </option>
                ))}
                <option value="inconnu">Je ne sais pas encore</option>
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="pf-company">Nom du lieu / de l&apos;entreprise *</label>
              <input id="pf-company" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputClass} placeholder="ex: Restaurant Chez Mama" />
            </div>
            <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
              <div>
                <label className={labelClass} htmlFor="pf-contact">Nom du contact</label>
                <input id="pf-contact" value={contactName} onChange={(e) => setContactName(e.target.value)} className={inputClass} placeholder="ex: Jean Kalala" />
              </div>
              <div>
                <label className={labelClass} htmlFor="pf-phone">Téléphone / WhatsApp</label>
                <input id="pf-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="+243 ..." />
              </div>
            </div>
            <div>
              <label className={labelClass} htmlFor="pf-email">E-mail *</label>
              <input id="pf-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="ton@email.com" />
            </div>
            <div>
              <label className={labelClass} htmlFor="pf-message">Message</label>
              <textarea
                id="pf-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className={inputClass}
                placeholder="Ta commune, ton type de lieu, tes questions..."
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
