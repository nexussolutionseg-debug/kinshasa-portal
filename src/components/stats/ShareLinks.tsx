// Backoffice → Statistiques → « Partager avec un partenaire ».
// Creates a read-only link (no login) to the dashboard, valid 1–12 months.
'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export function ShareLinks() {
  const [name, setName] = useState('');
  const [view, setView] = useState<'partenaire' | 'complet'>('partenaire');
  const [months, setMonths] = useState(3);
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<{ url: string; expires: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setLink(null);
    setCopied(false);
    try {
      const { data: s } = await supabase.auth.getSession();
      const res = await fetch('/api/stats/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.session?.access_token || ''}` },
        body: JSON.stringify({ name, view, months }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.reason === 'not-configured' ? 'Connecte d’abord Google Analytics (voir docs/kin-stats.md).' : 'Réservé aux comptes de l’équipe.');
      setLink({ url: json.url, expires: json.expires });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!link) return;
    try { await navigator.clipboard.writeText(link.url); setCopied(true); } catch { /* select manually */ }
  };

  const input = 'w-full min-h-11 px-3 py-2.5 bg-brand-bg border border-brand-line text-brand-ink rounded-xl text-[16px] md:text-sm focus:outline-none focus:border-brand-blue';
  const whatsapp = link ? `https://wa.me/?text=${encodeURIComponent(`Les statistiques de Kinshasa Label : ${link.url}`)}` : '';

  return (
    <section className="rounded-2xl border-2 border-dashed border-brand-blue/50 bg-white p-4 md:p-5">
      <h3 className="font-display text-lg font-extrabold text-brand-ink m-0">Partager avec un partenaire</h3>
      <p className="text-sm text-brand-muted m-0 mt-1">
        Crée un lien en lecture seule, sans mot de passe. Le partenaire voit ce tableau de bord, toujours à jour, jusqu’à la date d’expiration.
      </p>
      <form onSubmit={create} className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto] md:items-end mt-4">
        <label className="block">
          <span className="block text-xs font-bold text-brand-ink/70 mb-1.5">Pour qui ?</span>
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="ex. Hôtel du Fleuve" maxLength={60} required />
        </label>
        <label className="block">
          <span className="block text-xs font-bold text-brand-ink/70 mb-1.5">Ce qu’il voit</span>
          <select className={input} value={view} onChange={(e) => setView(e.target.value as 'partenaire' | 'complet')}>
            <option value="partenaire">Vue partenaire</option>
            <option value="complet">Tout (associés)</option>
          </select>
        </label>
        <label className="block">
          <span className="block text-xs font-bold text-brand-ink/70 mb-1.5">Valable</span>
          <select className={input} value={months} onChange={(e) => setMonths(Number(e.target.value))}>
            {[1, 3, 6, 12].map((m) => <option key={m} value={m}>{m} mois</option>)}
          </select>
        </label>
        <button type="submit" disabled={busy} className="min-h-11 px-5 rounded-xl bg-brand-blue text-white font-bold border-0 cursor-pointer disabled:opacity-60">
          {busy ? 'Création…' : 'Créer le lien'}
        </button>
      </form>
      <p className="text-xs text-brand-muted m-0 mt-2">
        Vue partenaire : audience, pages, communes, sources (sans les noms de campagnes ni le nombre d’abonnés). « Tout » ajoute ces deux éléments.
      </p>
      {error && <p className="text-sm font-semibold text-brand-red-dark m-0 mt-3">{error}</p>}
      {link && (
        <div className="mt-4 rounded-xl bg-brand-blue-soft p-3">
          <input readOnly value={link.url} onFocus={(e) => e.currentTarget.select()} className={`${input} bg-white text-xs`} aria-label="Lien partenaire" />
          <div className="flex flex-wrap gap-2 mt-2 items-center">
            <button type="button" onClick={copy} className="h-9 px-4 rounded-full bg-brand-ink text-white text-sm font-bold border-0 cursor-pointer">{copied ? 'Copié ✓' : 'Copier'}</button>
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="h-9 px-4 inline-flex items-center rounded-full bg-white border border-brand-line text-sm font-bold text-brand-ink no-underline">Envoyer sur WhatsApp</a>
            <a href={link.url} target="_blank" rel="noopener noreferrer" className="h-9 px-4 inline-flex items-center rounded-full bg-white border border-brand-line text-sm font-bold text-brand-ink no-underline">Ouvrir</a>
            <span className="text-xs text-brand-muted">Expire le {new Date(link.expires).toLocaleDateString('fr-FR', { dateStyle: 'long' })}</span>
          </div>
        </div>
      )}
    </section>
  );
}
