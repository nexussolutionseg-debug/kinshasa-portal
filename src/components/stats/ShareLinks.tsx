// Backoffice → Statistiques → « Liens partenaires » (2026-11-01, v2).
// Every read-only link to the dashboard, in one list the team fully controls:
// create, copy, send, rename, change what it shows, extend or shorten,
// deactivate / reactivate, delete — and see how often each one is opened.
// Links live in the `stats_links` table (team-only).
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Link = {
  id: string;
  token: string;
  name: string;
  note: string | null;
  view: 'partenaire' | 'complet';
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
  created_email: string | null;
  view_count: number;
  last_viewed_at: string | null;
};

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.kinshasalabel.com').replace(/\/$/, '');
const linkUrl = (t: string) => `${SITE}/stats/${t}`;
const VIEW_LABEL = { partenaire: 'Vue partenaire', complet: 'Tout (associés)' } as const;
const dShort = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const dTime = (d: string) => new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const toInputDate = (d: string) => new Date(d).toISOString().slice(0, 10);
const addMonths = (base: Date, m: number) => { const d = new Date(base); d.setMonth(d.getMonth() + m); return d; };

function newToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function status(l: Link): { label: string; cls: string; active: boolean } {
  if (l.revoked_at) return { label: 'Désactivé', cls: 'bg-brand-line text-brand-ink', active: false };
  if (new Date(l.expires_at) <= new Date()) return { label: 'Expiré', cls: 'bg-brand-yellow-soft text-brand-ink', active: false };
  const soon = new Date(l.expires_at).getTime() - Date.now() < 7 * 86400000;
  return { label: soon ? 'Actif · expire bientôt' : 'Actif', cls: soon ? 'bg-brand-yellow-soft text-brand-ink' : 'bg-[#E3F6EA] text-[#0F5F31]', active: true };
}

export function ShareLinks() {
  const [links, setLinks] = useState<Link[] | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'tous' | 'actifs' | 'inactifs'>('tous');
  const [editing, setEditing] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // New link form
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [view, setView] = useState<'partenaire' | 'complet'>('partenaire');
  const [months, setMonths] = useState(3);
  const [busy, setBusy] = useState(false);
  const [fresh, setFresh] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('stats_links').select('*').order('created_at', { ascending: false });
    if (error) {
      if (/stats_links|does not exist|schema cache/i.test(error.message)) setMissing(true);
      else setError(error.message);
      setLinks([]);
      return;
    }
    setMissing(false);
    setLinks(data as Link[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const token = newToken();
    const { data, error } = await supabase
      .from('stats_links')
      .insert({ token, name: name.trim().slice(0, 60), note: note.trim() || null, view, expires_at: addMonths(new Date(), months).toISOString() })
      .select()
      .single();
    setBusy(false);
    if (error) { setError(error.message); return; }
    setName(''); setNote('');
    setFresh(data.id);
    load();
  };

  const update = async (id: string, patch: Partial<Link>) => {
    setError(null);
    const { error } = await supabase.from('stats_links').update(patch).eq('id', id);
    if (error) setError(error.message); else load();
  };
  const remove = async (l: Link) => {
    if (!confirm(`Supprimer définitivement le lien de « ${l.name} » ? Il ne fonctionnera plus.`)) return;
    const { error } = await supabase.from('stats_links').delete().eq('id', l.id);
    if (error) setError(error.message); else load();
  };
  const copy = async (l: Link) => {
    try { await navigator.clipboard.writeText(linkUrl(l.token)); setCopied(l.id); setTimeout(() => setCopied(null), 2000); } catch { /* ignore */ }
  };

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (links || []).filter((l) => {
      const st = status(l);
      if (filter === 'actifs' && !st.active) return false;
      if (filter === 'inactifs' && st.active) return false;
      return !s || l.name.toLowerCase().includes(s) || (l.note || '').toLowerCase().includes(s);
    });
  }, [links, q, filter]);

  const input = 'w-full min-h-11 px-3 py-2.5 bg-brand-bg border border-brand-line text-brand-ink rounded-xl text-[16px] md:text-sm focus:outline-none focus:border-brand-blue';
  const pill = 'h-9 px-3.5 inline-flex items-center rounded-full text-xs font-bold border cursor-pointer no-underline';

  return (
    <section className="rounded-2xl border border-brand-line bg-white p-4 md:p-5 shadow-card" id="liens-partenaires">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-xl font-extrabold text-brand-ink m-0">Liens partenaires</h3>
        {links && !missing && (
          <span className="text-xs text-brand-muted">{links.filter((l) => status(l).active).length} actif(s) · {links.length} au total</span>
        )}
      </div>
      <p className="text-sm text-brand-muted m-0 mt-1">
        Un lien par partenaire, en lecture seule et sans mot de passe. Tu gardes la main sur chacun : le désactiver le coupe immédiatement.
      </p>

      {missing && (
        <div className="mt-4 rounded-xl bg-brand-yellow-soft border border-brand-yellow p-3 text-sm">
          <b>Une mise à jour de la base est nécessaire</b> avant de créer des liens : lancer
          <code className="mx-1">supabase/pending/20261101120000_stats_links_news_gallery.sql</code> dans Supabase → SQL Editor.
        </div>
      )}

      {!missing && (
        <form onSubmit={create} className="mt-4 grid gap-3 md:grid-cols-[1.3fr_1fr_auto_auto_auto] md:items-end rounded-xl bg-brand-blue-soft/60 p-3">
          <label className="block">
            <span className="block text-xs font-bold text-brand-ink/70 mb-1.5">Pour qui ?</span>
            <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="ex. Hôtel du Fleuve" maxLength={60} required />
          </label>
          <label className="block">
            <span className="block text-xs font-bold text-brand-ink/70 mb-1.5">Note interne (optionnel)</span>
            <input className={input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="ex. contrat sponsor Q4" maxLength={300} />
          </label>
          <label className="block">
            <span className="block text-xs font-bold text-brand-ink/70 mb-1.5">Ce qu’il voit</span>
            <select className={input} value={view} onChange={(e) => setView(e.target.value as Link['view'])}>
              <option value="partenaire">{VIEW_LABEL.partenaire}</option>
              <option value="complet">{VIEW_LABEL.complet}</option>
            </select>
          </label>
          <label className="block">
            <span className="block text-xs font-bold text-brand-ink/70 mb-1.5">Valable</span>
            <select className={input} value={months} onChange={(e) => setMonths(Number(e.target.value))}>
              {[1, 3, 6, 12, 24].map((m) => <option key={m} value={m}>{m} mois</option>)}
            </select>
          </label>
          <button type="submit" disabled={busy} className="min-h-11 px-5 rounded-xl bg-brand-blue text-white font-bold border-0 cursor-pointer disabled:opacity-60">
            {busy ? 'Création…' : '+ Créer le lien'}
          </button>
        </form>
      )}
      <p className="text-xs text-brand-muted m-0 mt-2">
        Vue partenaire : audience, pages, communes, sources, clics (sans noms de campagnes ni nombre d’abonnés). « Tout » ajoute ces deux éléments.
      </p>
      {error && <p className="text-sm font-semibold text-brand-red-dark m-0 mt-3">{error}</p>}

      {links && links.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2 items-center mt-5">
            <input className={`${input} md:max-w-xs`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un partenaire…" aria-label="Rechercher un lien" />
            {(['tous', 'actifs', 'inactifs'] as const).map((f) => (
              <button key={f} type="button" onClick={() => setFilter(f)}
                className={`${pill} ${filter === f ? 'bg-brand-ink text-white border-brand-ink' : 'bg-white text-brand-ink border-brand-line'}`}>
                {f === 'tous' ? 'Tous' : f === 'actifs' ? 'Actifs' : 'Expirés / désactivés'}
              </button>
            ))}
          </div>

          <ul className="list-none m-0 p-0 mt-3 space-y-3">
            {shown.map((l) => {
              const st = status(l);
              const isEditing = editing === l.id;
              const wa = `https://wa.me/?text=${encodeURIComponent(`Les statistiques de Kinshasa Label : ${linkUrl(l.token)}`)}`;
              return (
                <li key={l.id} className={`rounded-xl border p-3 md:p-4 ${fresh === l.id ? 'border-brand-blue bg-brand-blue-soft/40' : 'border-brand-line'}`}>
                  <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
                    <div className="min-w-0 flex-1">
                      <p className="m-0 font-bold text-brand-ink">{l.name} <span className={`ml-1 align-middle text-[11px] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span></p>
                      <p className="m-0 text-xs text-brand-muted mt-0.5">
                        {VIEW_LABEL[l.view]} · {st.active ? 'expire' : l.revoked_at ? 'désactivé le' : 'a expiré'} le {dShort(l.revoked_at || l.expires_at)}
                        {' · '}créé le {dShort(l.created_at)}{l.created_email ? ` par ${l.created_email}` : ''}
                      </p>
                      {l.note && <p className="m-0 text-xs text-brand-ink/70 mt-0.5">Note : {l.note}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="m-0 font-display text-xl font-extrabold tabular-nums">{l.view_count}</p>
                      <p className="m-0 text-[11px] text-brand-muted">ouverture{l.view_count > 1 ? 's' : ''}{l.last_viewed_at ? ` · dernière ${dTime(l.last_viewed_at)}` : ''}</p>
                    </div>
                  </div>

                  {st.active && (
                    <input readOnly value={linkUrl(l.token)} onFocus={(e) => e.currentTarget.select()} aria-label={`Lien de ${l.name}`}
                      className={`${input} mt-3 bg-white text-xs`} />
                  )}

                  <div className="flex flex-wrap gap-2 mt-3">
                    {st.active && (
                      <>
                        <button type="button" onClick={() => copy(l)} className={`${pill} bg-brand-ink text-white border-brand-ink`}>{copied === l.id ? 'Copié ✓' : 'Copier le lien'}</button>
                        <a href={wa} target="_blank" rel="noopener noreferrer" className={`${pill} bg-white text-brand-ink border-brand-line`}>WhatsApp</a>
                        <a href={`/stats/${l.token}`} target="_blank" rel="noopener noreferrer" className={`${pill} bg-white text-brand-ink border-brand-line`}>Ouvrir</a>
                      </>
                    )}
                    <button type="button" onClick={() => setEditing(isEditing ? null : l.id)} className={`${pill} bg-white text-brand-ink border-brand-line`}>{isEditing ? 'Fermer' : 'Modifier'}</button>
                    {l.revoked_at ? (
                      <button type="button" onClick={() => update(l.id, { revoked_at: null })} className={`${pill} bg-white text-brand-blue-deep border-brand-blue`}>Réactiver</button>
                    ) : (
                      <button type="button" onClick={() => update(l.id, { revoked_at: new Date().toISOString() })} className={`${pill} bg-white text-brand-red-dark border-brand-red/40`}>Désactiver</button>
                    )}
                    <button type="button" onClick={() => remove(l)} className={`${pill} bg-white text-brand-red-dark border-brand-line`}>Supprimer</button>
                  </div>

                  {isEditing && <EditLink link={l} input={input} onSave={(patch) => { update(l.id, patch); setEditing(null); }} />}
                </li>
              );
            })}
            {!shown.length && <li className="text-sm text-brand-muted">Aucun lien ne correspond.</li>}
          </ul>
        </>
      )}
    </section>
  );
}

function EditLink({ link, input, onSave }: { link: Link; input: string; onSave: (p: Partial<Link>) => void }) {
  const [name, setName] = useState(link.name);
  const [note, setNote] = useState(link.note || '');
  const [view, setView] = useState(link.view);
  const [exp, setExp] = useState(toInputDate(link.expires_at));
  const base = new Date(Math.max(Date.now(), new Date(link.expires_at).getTime()));
  return (
    <form
      className="mt-3 grid gap-3 md:grid-cols-2 rounded-xl bg-brand-bg p-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ name: name.trim().slice(0, 60) || link.name, note: note.trim() || null, view, expires_at: new Date(`${exp}T23:59:59`).toISOString() });
      }}
    >
      <label className="block">
        <span className="block text-xs font-bold text-brand-ink/70 mb-1.5">Nom</span>
        <input className={input} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required />
      </label>
      <label className="block">
        <span className="block text-xs font-bold text-brand-ink/70 mb-1.5">Ce qu’il voit</span>
        <select className={input} value={view} onChange={(e) => setView(e.target.value as Link['view'])}>
          <option value="partenaire">{VIEW_LABEL.partenaire}</option>
          <option value="complet">{VIEW_LABEL.complet}</option>
        </select>
      </label>
      <label className="block">
        <span className="block text-xs font-bold text-brand-ink/70 mb-1.5">Note interne</span>
        <input className={input} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
      </label>
      <label className="block">
        <span className="block text-xs font-bold text-brand-ink/70 mb-1.5">Valable jusqu’au</span>
        <input type="date" className={input} value={exp} min={toInputDate(new Date().toISOString())} onChange={(e) => setExp(e.target.value)} required />
        <span className="flex gap-2 mt-2">
          {[1, 3, 6, 12].map((m) => (
            <button key={m} type="button" onClick={() => setExp(toInputDate(addMonths(base, m).toISOString()))}
              className="h-8 px-3 rounded-full text-xs font-bold border border-brand-line bg-white cursor-pointer">+{m} mois</button>
          ))}
        </span>
      </label>
      <div className="md:col-span-2 flex gap-2">
        <button type="submit" className="min-h-11 px-5 rounded-xl bg-brand-blue text-white font-bold border-0 cursor-pointer">Enregistrer</button>
        <span className="text-xs text-brand-muted self-center">Le lien reste le même : le partenaire n’a rien à changer.</span>
      </div>
    </form>
  );
}
