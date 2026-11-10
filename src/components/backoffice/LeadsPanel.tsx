// Backoffice → Prospects (2026-11-10). The restaurant & hotel lead flow:
//   * Liste: counts per status, « À relancer », search and filters; each lead
//     has call / WhatsApp (ready-made message) buttons, an inline status, and
//     « Mettre sur la carte ».
//   * Ajouter / Modifier: contacts, position (GPS, plus code, map link, or a
//     search on OpenStreetMap), status, offer, next action and date.
//   * Importer: the lead spreadsheet (.xlsx or CSV), duplicates skipped.
// « Mettre sur la carte » creates the place (with its own page) from the
// lead's own position — or links the lead to the place if it already
// exists. Moving a lead to « Partenaire » does it automatically.
// Data: table kl_leads, team accounts only
// (supabase/pending/20261110140000_place_pages_leads.sql).
'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { COMMUNE_NAMES } from '../../lib/communes';
import { parsePosition } from '../../lib/geo';
import { decodeText, parseCsv } from '../../lib/placeImport';
import { placeHref, telHref, whatsappHref, socialHref } from '../../lib/places';
import {
  LEAD_STATUSES, LEAD_KINDS, LEAD_PACKS, statusOf, kindOf, leadKey, mapLeadRows, pickLeadSheet,
  leadToPlace, isDue, pitchText, scanToLead, SCAN_SOURCE, type LeadImportRow,
} from '../../lib/leads';
import { kinshasaToday } from '../../lib/news';
import { Button } from '../Button';
import { IconEdit, IconExternalLink, IconPhone, IconPin, IconPlus, IconSearch, IconTrash } from '../icons';

type Lead = Record<string, any>;
type Tab = 'list' | 'form' | 'import';

const input = 'w-full h-11 px-3 bg-white border border-brand-line text-brand-ink rounded-xl text-[16px] md:text-sm placeholder:text-brand-muted focus:outline-none focus:border-brand-blue';
const label = 'block text-xs font-bold text-brand-ink/70 mb-1.5';
const chip = (on: boolean) =>
  `shrink-0 h-10 px-4 rounded-full text-sm font-bold border-2 cursor-pointer ${on ? 'bg-brand-ink text-white border-brand-ink' : 'bg-white border-brand-line text-brand-ink'}`;
const missingTable = (e: any) => /kl_leads|42P01|PGRST205|does not exist|schema cache/i.test(`${e?.message} ${e?.code}`);
const SQL_FILE = 'supabase/pending/20261110140000_place_pages_leads.sql';

function download(text: string, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export function LeadsPanel({ places, reloadPlaces }: { places: any[]; reloadPlaces: () => Promise<void> | void }) {
  const [tab, setTab] = useState<Tab>('list');
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [noTable, setNoTable] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const say = (ok: boolean, text: string) => {
    setMsg({ ok, text });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const load = async (): Promise<Lead[] | null> => {
    const { data, error } = await supabase.from('kl_leads').select('*').order('updated_at', { ascending: false }).limit(2000);
    if (error) {
      setNoTable(missingTable(error));
      setLeads([]);
      if (!missingTable(error)) say(false, error.message);
      return null;
    }
    setNoTable(false);
    setLeads(data || []);
    return data || [];
  };

  // Daily lead scan (2026-11-10): new finds are pulled in each time Prospects opens.
  const [scan, setScan] = useState<{ busy: boolean; text: string }>({ busy: false, text: '' });
  const syncScan = async (current: Lead[], manual = false) => {
    setScan({ busy: true, text: '' });
    try {
      const scanned = current.filter((l) => String(l.source || '').startsWith(SCAN_SOURCE));
      // Ask only for finds newer than the last one we have (a day of margin; duplicates are skipped below).
      const since = scanned.reduce((m, l) => Math.max(m, Date.parse(l.created_at) || 0), 0);
      const { data: sess } = await supabase.auth.getSession();
      const r = await fetch(`/api/leads/inbox?since=${Math.max(0, since - 86400000)}`, { headers: { Authorization: `Bearer ${sess.session?.access_token || ''}` } });
      const j = await r.json();
      if (!j.ok) {
        setScan({ busy: false, text: j.reason === 'not-configured' ? 'Scan quotidien : ajoutez KIN_LEADS_KEY dans Vercel pour le relier.' : manual ? 'Scan quotidien indisponible pour le moment.' : '' });
        return;
      }
      const knownSources = new Set(current.map((l) => String(l.source || '')));
      const knownKeys = new Set([...current.map((l) => leadKey(l.name, l.commune)), ...places.map((p) => leadKey(p.name, p.commune))]);
      const fresh: any[] = [];
      for (const row of j.leads || []) {
        const lead = scanToLead(row);
        if (!lead || knownSources.has(lead.source || '')) continue;
        const k = leadKey(lead.name, lead.commune);
        if (knownKeys.has(k)) continue;
        knownKeys.add(k);
        fresh.push(lead);
      }
      if (fresh.length) {
        const { error } = await supabase.from('kl_leads').insert(fresh);
        if (error) throw error;
        await load();
      }
      setScan({ busy: false, text: fresh.length ? `${fresh.length} nouveau(x) prospect(s) du scan quotidien.` : manual ? 'Aucun nouveau prospect du scan pour l’instant.' : '' });
    } catch (e: any) {
      setScan({ busy: false, text: `Scan quotidien : ${e.message || 'erreur'}` });
    }
  };

  useEffect(() => {
    load().then((ls) => {
      if (ls) syncScan(ls);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const placesHavePageFields = places.some((p) => 'website' in p);
  const placesHavePacks = places.some((p) => 'partner_pack' in p);
  // A signed partner's pack goes onto the place (partner packs, 2026-11-10).
  const packFields = (lead: Lead) =>
    placesHavePacks && lead.status === 'partenaire' && lead.pack ? { partner_pack: lead.pack, partner_since: kinshasaToday() } : {};

  /** Create the place from the lead (or link the existing one) and remember it on the lead. */
  const putOnMap = async (lead: Lead, quiet = false): Promise<boolean> => {
    if (lead.place_id) return true;
    const key = leadKey(lead.name, lead.commune);
    const existing = places.find((p) => leadKey(p.name, p.commune) === key);
    let placeId: number | null = existing?.id ?? null;
    if (existing) {
      const upd = {
        ...((existing.lat == null || existing.lng == null) && lead.lat != null && lead.lng != null ? { lat: lead.lat, lng: lead.lng } : {}),
        ...(!existing.partner_pack ? packFields(lead) : {}),
      };
      if (Object.keys(upd).length) await supabase.from('places').update(upd).eq('id', existing.id);
    } else {
      if ((lead.lat == null || lead.lng == null) && !quiet && !confirm(`« ${lead.name} » n’a pas de position : il apparaîtra sur sa commune, sans épingle sur la carte. Continuer ?`)) return false;
      const { data, error } = await supabase.from('places').insert([{ ...leadToPlace(lead, placesHavePageFields), ...packFields(lead) }]).select('id').single();
      if (error) {
        say(false, `Impossible de créer le lieu : ${error.message}`);
        return false;
      }
      placeId = data?.id ?? null;
    }
    if (placeId) await supabase.from('kl_leads').update({ place_id: placeId }).eq('id', lead.id);
    await Promise.all([load(), reloadPlaces()]);
    if (!quiet || !existing) say(true, existing ? `« ${lead.name} » était déjà sur le site : prospect relié à sa page.` : `« ${lead.name} » est sur la carte, avec sa page.`);
    return true;
  };

  const setStatus = async (lead: Lead, status: string) => {
    const { error } = await supabase.from('kl_leads').update({ status }).eq('id', lead.id);
    if (error) return say(false, error.message);
    setLeads((ls) => (ls || []).map((l) => (l.id === lead.id ? { ...l, status } : l)));
    if (status === 'partenaire' && !lead.place_id) await putOnMap({ ...lead, status }, true);
    else if (status === 'partenaire' && lead.place_id && lead.pack) {
      const pl = places.find((p) => p.id === lead.place_id);
      if (pl && !pl.partner_pack && placesHavePacks) {
        await supabase.from('places').update(packFields({ ...lead, status })).eq('id', lead.place_id);
        await reloadPlaces();
      }
    }
  };

  const remove = async (lead: Lead) => {
    if (!confirm(`Supprimer le prospect « ${lead.name} » ? (Le lieu sur la carte, s’il existe, reste.)`)) return;
    const { error } = await supabase.from('kl_leads').delete().eq('id', lead.id);
    if (error) return say(false, error.message);
    say(true, `« ${lead.name} » supprimé.`);
    load();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {([
          ['list', `Liste${leads ? ` (${leads.length})` : ''}`],
          ['form', editing ? 'Modifier' : 'Ajouter'],
          ['import', 'Importer'],
        ] as [Tab, string][]).map(([t, l]) => (
          <button key={t} type="button" className={chip(tab === t)} onClick={() => { setMsg(null); if (t !== 'form') setEditing(null); setTab(t); }}>
            {l}
          </button>
        ))}
      </div>

      {msg && (
        <p className={`m-0 rounded-2xl px-4 py-3 text-sm font-semibold ${msg.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>{msg.text}</p>
      )}
      {(scan.text || leads) && !noTable && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-brand-bg px-4 py-2.5 text-sm">
          <span className="font-semibold">{scan.busy ? 'Scan quotidien : vérification…' : scan.text || 'Scan quotidien : 5 restaurants et hôtels vérifiés chaque matin.'}</span>
          <button type="button" disabled={scan.busy} onClick={() => leads && syncScan(leads, true)} className="h-9 px-4 rounded-full border-2 border-brand-line bg-white font-bold cursor-pointer">
            Récupérer le scan
          </button>
        </div>
      )}
      {noTable && (
        <p className="m-0 rounded-2xl px-4 py-3 text-sm bg-yellow-50 text-yellow-900">
          Les prospects ont besoin d’une nouvelle table. Lancez le fichier <code>{SQL_FILE}</code> dans Supabase (SQL Editor), puis rechargez la page.
        </p>
      )}

      {tab === 'list' && leads && (
        <LeadList
          leads={leads}
          onEdit={(l) => { setEditing(l); setMsg(null); setTab('form'); }}
          onStatus={setStatus}
          onMap={(l) => putOnMap(l)}
          onDelete={remove}
        />
      )}
      {tab === 'form' && (
        <LeadForm
          key={editing?.id || 'new'}
          lead={editing}
          leads={leads || []}
          say={say}
          onDone={async (text, saved) => {
            await load();
            setEditing(null);
            setTab('list');
            say(true, text);
            if (saved && saved.status === 'partenaire' && !saved.place_id) await putOnMap(saved, true);
          }}
          onCancel={() => { setEditing(null); setTab('list'); }}
        />
      )}
      {tab === 'import' && (
        <LeadImport leads={leads || []} say={say} onDone={async (text) => { await load(); setTab('list'); say(true, text); }} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
function LeadList({
  leads, onEdit, onStatus, onMap, onDelete,
}: {
  leads: Lead[];
  onEdit: (l: Lead) => void;
  onStatus: (l: Lead, s: string) => void;
  onMap: (l: Lead) => void;
  onDelete: (l: Lead) => void;
}) {
  const today = kinshasaToday();
  const [status, setStatusFilter] = useState<string>('all');
  const [kind, setKind] = useState('all');
  const [commune, setCommune] = useState('all');
  const [q, setQ] = useState('');
  const [shown, setShown] = useState(40);

  const counts = useMemo(() => {
    const c: Record<string, number> = { due: 0 };
    for (const l of leads) {
      c[l.status] = (c[l.status] || 0) + 1;
      if (isDue(l, today)) c.due++;
    }
    return c;
  }, [leads, today]);

  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return leads
      .filter((l) => (status === 'all' ? true : status === 'due' ? isDue(l, today) : l.status === status))
      .filter((l) => kind === 'all' || l.kind === kind)
      .filter((l) => commune === 'all' || l.commune === commune)
      .filter((l) => !n || [l.name, l.address, l.phone, l.notes, l.owner, l.cuisine].some((v) => String(v || '').toLowerCase().includes(n)))
      .sort((a, b) => (status === 'due' ? String(a.next_date).localeCompare(String(b.next_date)) : 0));
  }, [leads, status, kind, commune, q, today]);

  const exportCsv = () => {
    const cols = ['name', 'commune', 'kind', 'place_type', 'cuisine', 'address', 'lat', 'lng', 'phone', 'email', 'website', 'instagram', 'facebook', 'status', 'pack', 'next_action', 'next_date', 'owner', 'notes'];
    const head = ['Nom', 'Commune', 'Type', 'Sous-type', 'Cuisine', 'Adresse', 'Latitude', 'Longitude', 'Téléphone', 'E-mail', 'Site web', 'Instagram', 'Facebook', 'Statut', 'Offre proposée', 'Prochaine action', 'Date de relance', 'Responsable', 'Notes'];
    const esc = (v: any) => {
      const s = v == null ? '' : String(v);
      return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = list.map((l) => cols.map((c) => esc(c === 'status' ? statusOf(l.status).label : c === 'kind' ? kindOf(l.kind).label : c === 'pack' ? LEAD_PACKS.find((p) => p.id === l.pack)?.label || '' : l[c])).join(';'));
    download([head.join(';'), ...rows].join('\r\n'), `prospects-kinshasa-label-${today}.csv`);
  };

  if (!leads.length)
    return <p className="text-sm text-brand-muted m-0">Aucun prospect pour l’instant. Ajoutez-en un, ou importez le fichier des leads (onglet Importer).</p>;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button type="button" className={chip(status === 'all')} onClick={() => setStatusFilter('all')}>Tous ({leads.length})</button>
        <button type="button" className={chip(status === 'due')} onClick={() => setStatusFilter('due')}>À relancer ({counts.due})</button>
        {LEAD_STATUSES.map((s) => (
          <button key={s.id} type="button" className={chip(status === s.id)} onClick={() => setStatusFilter(s.id)}>
            {s.label} ({counts[s.id] || 0})
          </button>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <label className="relative">
          <span className="sr-only">Rechercher</span>
          <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, téléphone, note…" className={`${input} pl-9`} />
        </label>
        <select value={kind} onChange={(e) => setKind(e.target.value)} className={input} aria-label="Type">
          <option value="all">Tous types</option>
          {LEAD_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
        </select>
        <select value={commune} onChange={(e) => setCommune(e.target.value)} className={input} aria-label="Commune">
          <option value="all">Toutes communes</option>
          {COMMUNE_NAMES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <Button variant="secondary" onClick={exportCsv}>Exporter ({list.length})</Button>
      </div>

      <ul className="list-none p-0 m-0 flex flex-col gap-3">
        {list.slice(0, shown).map((l) => {
          const st = statusOf(l.status);
          const tel = telHref(l.phone);
          const wa = whatsappHref({ phone: l.phone, name: null });
          const waPitch = wa ? `${wa.split('?')[0]}?text=${encodeURIComponent(pitchText(l as any))}` : null;
          const ig = socialHref('instagram', l.instagram);
          const due = isDue(l, today);
          return (
            <li key={l.id} className="bg-white border border-brand-line rounded-2xl p-3.5 md:p-4 flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-[11px] font-extrabold uppercase tracking-wide text-brand-muted">{kindOf(l.kind).label}</span>
                    {l.commune && <span className="text-xs font-semibold text-brand-blue-deep inline-flex items-center gap-1"><IconPin size={11} /> {l.commune}</span>}
                    {String(l.source || '').startsWith(SCAN_SOURCE) && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand-blue-soft text-brand-blue-deep">Scan quotidien</span>}
                    {l.lat == null && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand-yellow-soft text-brand-ink">Sans position</span>}
                    {l.pack && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand-bg border border-brand-line">{LEAD_PACKS.find((p) => p.id === l.pack)?.label}</span>}
                  </div>
                  <h3 className="font-display text-lg font-bold text-brand-ink m-0 break-words">{l.name}</h3>
                  {(l.address || l.cuisine) && <p className="text-sm text-brand-muted m-0">{[l.cuisine, l.address].filter(Boolean).join(' · ')}</p>}
                  {(l.next_action || l.next_date) && (
                    <p className={`text-sm m-0 mt-1 font-semibold ${due ? 'text-brand-red-dark' : 'text-brand-ink/80'}`}>
                      → {l.next_action || 'Relancer'}{l.next_date ? ` · ${new Date(`${l.next_date}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}` : ''}{due ? ' (à faire)' : ''}
                      {l.owner ? <span className="text-brand-muted font-normal"> · {l.owner}</span> : null}
                    </p>
                  )}
                  {l.notes && <p className="text-xs text-brand-muted m-0 mt-1 line-clamp-2">{l.notes}</p>}
                </div>
                <select
                  value={l.status}
                  onChange={(e) => onStatus(l, e.target.value)}
                  aria-label={`Statut de ${l.name}`}
                  className="h-10 px-3 rounded-full text-sm font-bold border-2 bg-white shrink-0"
                  style={{ borderColor: st.color, color: st.color }}
                >
                  {LEAD_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                {waPitch && <a href={waPitch} target="_blank" rel="noopener noreferrer" className="inline-flex items-center h-10 px-4 rounded-xl bg-[#25D366] text-white text-sm font-bold no-underline">WhatsApp</a>}
                {tel && <a href={tel} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border border-brand-line text-sm font-bold text-brand-ink no-underline"><IconPhone size={13} /> Appeler</a>}
                {ig && <a href={ig} target="_blank" rel="noopener noreferrer" className="inline-flex items-center h-10 px-4 rounded-xl border border-brand-line text-sm font-bold text-brand-ink no-underline">Instagram</a>}
                {l.place_id ? (
                  <a href={placeHref({ id: l.place_id, name: l.name })} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-brand-blue-soft text-brand-blue-deep text-sm font-bold no-underline">
                    Sur la carte ✓ <IconExternalLink size={13} />
                  </a>
                ) : (
                  <button type="button" onClick={() => onMap(l)} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-brand-ink text-white text-sm font-bold cursor-pointer">
                    <IconPin size={13} /> Mettre sur la carte
                  </button>
                )}
                <button type="button" onClick={() => onEdit(l)} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border border-brand-line text-sm font-bold cursor-pointer hover:border-brand-blue">
                  <IconEdit size={13} /> Modifier
                </button>
                <button type="button" onClick={() => onDelete(l)} aria-label={`Supprimer ${l.name}`} className="h-10 w-10 rounded-xl border border-brand-line inline-flex items-center justify-center text-brand-danger cursor-pointer">
                  <IconTrash size={14} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {list.length === 0 && <p className="text-sm text-brand-muted m-0">Aucun prospect ne correspond à ces filtres.</p>}
      {list.length > shown && (
        <div className="text-center">
          <Button variant="secondary" onClick={() => setShown((n) => n + 60)}>Afficher plus ({list.length - shown})</Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
const EMPTY = {
  name: '', commune: 'Gombe', kind: 'restauration', place_type: '', cuisine: '', address: '', position: '',
  phone: '', email: '', website: '', instagram: '', facebook: '', status: 'nouveau', pack: '',
  next_action: '', next_date: '', owner: '', notes: '', source: '',
};
type Form = typeof EMPTY;

function LeadForm({
  lead, leads, say, onDone, onCancel,
}: {
  lead: Lead | null;
  leads: Lead[];
  say: (ok: boolean, t: string) => void;
  onDone: (text: string, saved: Lead | null) => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState<Form>(() =>
    lead
      ? Object.fromEntries(
          Object.keys(EMPTY).map((k) => [
            k,
            k === 'position'
              ? lead.lat != null && lead.lng != null ? `${Number(lead.lat).toFixed(6)}, ${Number(lead.lng).toFixed(6)}` : ''
              : lead[k] == null ? (EMPTY as any)[k] : String(lead[k]),
          ])
        ) as Form
      : EMPTY
  );
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const [saving, setSaving] = useState(false);
  const [osm, setOsm] = useState<{ busy: boolean; results: any[]; error: string }>({ busy: false, results: [], error: '' });
  const pos = parsePosition(f.position);

  const searchOsm = async () => {
    if (f.name.trim().length < 2) return setOsm({ busy: false, results: [], error: 'Tapez d’abord le nom.' });
    setOsm({ busy: true, results: [], error: '' });
    const { data } = await supabase.auth.getSession();
    try {
      const r = await fetch(`/api/osm-search?${new URLSearchParams({ q: f.name.trim(), commune: f.commune })}`, {
        headers: { Authorization: `Bearer ${data.session?.access_token || ''}` },
      });
      const j = await r.json();
      setOsm({ busy: false, results: j.results || [], error: j.error || (j.results?.length ? '' : 'Rien trouvé sur OpenStreetMap. Collez une position GPS ou un lien de carte.') });
    } catch {
      setOsm({ busy: false, results: [], error: 'Recherche impossible pour le moment.' });
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.position.trim() && !pos) return say(false, 'Position non reconnue. Collez « -4.3217, 15.3125 », un plus code (M79J+6H) ou un lien de carte, ou laissez vide.');
    const key = leadKey(f.name, f.commune);
    const dup = leads.find((l) => l.id !== lead?.id && leadKey(l.name, l.commune) === key);
    if (dup) return say(false, `« ${dup.name} » (${dup.commune}) est déjà dans les prospects.`);
    const t = (v: string) => v.trim() || null;
    const payload = {
      name: f.name.trim(), commune: f.commune || null, kind: f.kind, place_type: t(f.place_type), cuisine: t(f.cuisine),
      address: t(f.address), lat: pos?.lat ?? null, lng: pos?.lng ?? null, phone: t(f.phone), email: t(f.email),
      website: t(f.website), instagram: t(f.instagram), facebook: t(f.facebook), status: f.status, pack: f.pack || null,
      next_action: t(f.next_action), next_date: f.next_date || null, owner: t(f.owner), notes: t(f.notes),
      ...(lead ? {} : { source: t(f.source) || 'Ajout manuel' }),
    };
    setSaving(true);
    const res = lead
      ? await supabase.from('kl_leads').update(payload).eq('id', lead.id).select('*').single()
      : await supabase.from('kl_leads').insert([payload]).select('*').single();
    setSaving(false);
    if (res.error) return say(false, missingTable(res.error) ? `Lancez d’abord ${SQL_FILE} dans Supabase.` : res.error.message);
    onDone(lead ? `« ${payload.name} » mis à jour.` : `« ${payload.name} » ajouté aux prospects.`, res.data);
  };

  return (
    <form onSubmit={save} className="bg-white rounded-3xl border border-brand-line p-4 md:p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl md:text-2xl font-extrabold m-0 break-words min-w-0">{lead ? `Modifier : ${lead.name}` : 'Nouveau prospect'}</h2>
        <Button type="button" variant="ghost" onClick={onCancel}>Annuler</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={label} htmlFor="ld-name">Nom de l’établissement *</label>
          <input id="ld-name" required value={f.name} onChange={(e) => set('name', e.target.value)} className={input} placeholder="ex : Chez Ntemba" />
        </div>
        <div>
          <label className={label} htmlFor="ld-commune">Commune</label>
          <select id="ld-commune" value={f.commune} onChange={(e) => set('commune', e.target.value)} className={input}>
            {COMMUNE_NAMES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="ld-kind">Type</label>
          <select id="ld-kind" value={f.kind} onChange={(e) => set('kind', e.target.value)} className={input}>
            {LEAD_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="ld-ptype">Précision (sur la page)</label>
          <input id="ld-ptype" value={f.place_type} onChange={(e) => set('place_type', e.target.value)} className={input} placeholder="ex : Lounge-bar, Flat-hôtel" />
        </div>
        <div>
          <label className={label} htmlFor="ld-cuisine">Cuisine</label>
          <input id="ld-cuisine" value={f.cuisine} onChange={(e) => set('cuisine', e.target.value)} className={input} placeholder="ex : congolaise, libanaise" />
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="ld-addr">Adresse / repère</label>
          <input id="ld-addr" value={f.address} onChange={(e) => set('address', e.target.value)} className={input} />
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="ld-pos">Position sur la carte</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input id="ld-pos" value={f.position} onChange={(e) => set('position', e.target.value)} className={input} placeholder="-4.3217, 15.3125 · plus code · lien de carte" />
            <Button type="button" variant="secondary" onClick={searchOsm} disabled={osm.busy}>
              {osm.busy ? 'Recherche…' : 'Chercher sur OpenStreetMap'}
            </Button>
          </div>
          {pos && (
            <p className="text-[11px] text-brand-muted mt-1 mb-0">
              Position reconnue : {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)} ·{' '}
              <a href={`https://www.openstreetmap.org/?mlat=${pos.lat}&mlon=${pos.lng}#map=18/${pos.lat}/${pos.lng}`} target="_blank" rel="noopener noreferrer">vérifier sur la carte ↗</a>
            </p>
          )}
          {osm.error && <p className="text-xs text-brand-red-dark mt-1 mb-0">{osm.error}</p>}
          {osm.results.length > 0 && (
            <ul className="list-none p-0 m-0 mt-2 flex flex-col gap-1.5">
              {osm.results.map((r) => (
                <li key={r.osm}>
                  <button
                    type="button"
                    onClick={() => {
                      setF((x) => ({ ...x, position: `${r.lat.toFixed(6)}, ${r.lng.toFixed(6)}`, address: x.address || r.label.split(',').slice(1, 3).join(',').trim() }));
                      setOsm({ busy: false, results: [], error: '' });
                    }}
                    className="w-full text-left bg-brand-bg hover:bg-brand-blue-soft rounded-xl px-3 py-2 text-sm cursor-pointer"
                  >
                    <strong>{r.name || r.label.split(',')[0]}</strong> <span className="text-brand-muted">· {r.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <label className={label} htmlFor="ld-phone">Téléphone / WhatsApp</label>
          <input id="ld-phone" type="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} className={input} placeholder="+243 …" />
        </div>
        <div>
          <label className={label} htmlFor="ld-mail">E-mail</label>
          <input id="ld-mail" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} className={input} />
        </div>
        <div>
          <label className={label} htmlFor="ld-ig">Instagram</label>
          <input id="ld-ig" value={f.instagram} onChange={(e) => set('instagram', e.target.value)} className={input} placeholder="@nomdulieu" />
        </div>
        <div>
          <label className={label} htmlFor="ld-fb">Facebook</label>
          <input id="ld-fb" value={f.facebook} onChange={(e) => set('facebook', e.target.value)} className={input} />
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="ld-web">Site web</label>
          <input id="ld-web" value={f.website} onChange={(e) => set('website', e.target.value)} className={input} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 border-t border-brand-line pt-4">
        <div>
          <label className={label} htmlFor="ld-status">Statut</label>
          <select id="ld-status" value={f.status} onChange={(e) => set('status', e.target.value)} className={input}>
            {LEAD_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          {f.status === 'partenaire' && !lead?.place_id && <p className="text-[11px] text-brand-muted mt-1 mb-0">En « Partenaire », le lieu est mis sur la carte automatiquement.</p>}
        </div>
        <div>
          <label className={label} htmlFor="ld-pack">Offre proposée</label>
          <select id="ld-pack" value={f.pack} onChange={(e) => set('pack', e.target.value)} className={input}>
            <option value="">Pas encore</option>
            {LEAD_PACKS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="ld-next">Prochaine action</label>
          <input id="ld-next" value={f.next_action} onChange={(e) => set('next_action', e.target.value)} className={input} placeholder="ex : Rappeler, Envoyer l’offre" />
        </div>
        <div>
          <label className={label} htmlFor="ld-date">Date de relance</label>
          <input id="ld-date" type="date" value={f.next_date} onChange={(e) => set('next_date', e.target.value)} className={input} />
        </div>
        <div>
          <label className={label} htmlFor="ld-owner">Responsable</label>
          <input id="ld-owner" value={f.owner} onChange={(e) => set('owner', e.target.value)} className={input} placeholder="ex : Cherif" />
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="ld-notes">Notes</label>
          <textarea id="ld-notes" rows={3} value={f.notes} onChange={(e) => set('notes', e.target.value)} className={`${input} h-auto py-2.5 resize-y`} />
        </div>
      </div>

      <Button type="submit" variant="primary" size="lg" fullWidth disabled={saving}>
        {saving ? 'Enregistrement…' : lead ? 'Enregistrer' : 'Ajouter le prospect'}
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
function LeadImport({ leads, say, onDone }: { leads: Lead[]; say: (ok: boolean, t: string) => void; onDone: (t: string) => void }) {
  const [rows, setRows] = useState<LeadImportRow[] | null>(null);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');

  const plan = useMemo(() => {
    if (!rows) return null;
    const known = new Set(leads.map((l) => leadKey(l.name, l.commune)));
    const fresh: any[] = [];
    let dup = 0;
    let invalid = 0;
    let noPos = 0;
    for (const r of rows) {
      if (!r.lead) { invalid++; continue; }
      const k = leadKey(r.lead.name, r.lead.commune);
      if (known.has(k)) { dup++; continue; }
      known.add(k);
      if (r.lead.lat == null) noPos++;
      fresh.push(r.lead);
    }
    return { fresh, dup, invalid, noPos };
  }, [rows, leads]);

  const read = async (file: File) => {
    setFileName(file.name);
    setRows(null);
    try {
      let table: string[][];
      if (/\.xlsx$/i.test(file.name)) {
        const { default: readXlsxFile } = await import('read-excel-file/browser');
        table = pickLeadSheet((await readXlsxFile(file)) as { sheet: string; data: unknown[][] }[]);
      } else {
        table = parseCsv(decodeText(await file.arrayBuffer()));
      }
      const res = mapLeadRows(table);
      if (res.missing.length) return say(false, 'Colonne « Nom » introuvable dans le fichier.');
      setRows(res.rows);
    } catch (e: any) {
      say(false, `Lecture impossible : ${e.message || e}`);
    }
  };

  const run = async () => {
    if (!plan?.fresh.length) return;
    setBusy(true);
    let done = 0;
    try {
      for (let i = 0; i < plan.fresh.length; i += 50) {
        const chunk = plan.fresh.slice(i, i + 50);
        const { error } = await supabase.from('kl_leads').insert(chunk);
        if (error) throw error;
        done += chunk.length;
        setProgress(`${done} / ${plan.fresh.length}`);
      }
      onDone(`${done} prospect(s) importé(s).${plan.dup ? ` ${plan.dup} déjà présent(s), ignoré(s).` : ''}`);
    } catch (e: any) {
      say(false, missingTable(e) ? `Lancez d’abord ${SQL_FILE} dans Supabase.` : `Import interrompu après ${done} prospect(s) : ${e.message}`);
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-brand-line p-4 md:p-6 flex flex-col gap-4">
      <h2 className="font-display text-xl md:text-2xl font-extrabold m-0">Importer des prospects</h2>
      <p className="text-sm text-brand-muted m-0">
        Fichier Excel (.xlsx) ou CSV, comme « Kinshasa_Label_Leads_Restos_Hotels.xlsx ». Colonne obligatoire : <b>Nom</b>. Reconnues aussi : Commune, Type, Cuisine,
        Adresse, Téléphone, Site web, Facebook, Instagram, E-mail, Lien Google Maps (la position en est tirée), Statut, Offre proposée, Prochaine action, Date de relance,
        Responsable, Notes. Un prospect déjà présent (même nom et commune) est ignoré.
      </p>
      <label className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-brand-line rounded-2xl p-6 text-center cursor-pointer hover:border-brand-blue">
        <IconPlus size={20} />
        <span className="font-bold">{fileName || 'Choisir le fichier'}</span>
        <input type="file" accept=".xlsx,.csv,.txt" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) read(file); }} />
      </label>
      {plan && (
        <div className="rounded-2xl bg-brand-bg p-4 text-sm flex flex-col gap-1">
          <p className="m-0"><b>{plan.fresh.length}</b> nouveau(x) prospect(s) à importer{plan.noPos ? `, dont ${plan.noPos} sans position` : ''}.</p>
          {plan.dup > 0 && <p className="m-0">{plan.dup} déjà présent(s) : ignoré(s).</p>}
          {plan.invalid > 0 && <p className="m-0">{plan.invalid} ligne(s) sans nom : ignorée(s).</p>}
        </div>
      )}
      <Button variant="primary" size="lg" fullWidth disabled={busy || !plan?.fresh.length} onClick={run}>
        {busy ? `Import… ${progress}` : plan?.fresh.length ? `Importer ${plan.fresh.length} prospect(s)` : 'Importer'}
      </Button>
    </div>
  );
}
