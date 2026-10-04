// Backoffice → "Vitrine" (homepage merchandising), 2026-10-04.
// One place to control what visitors see on the homepage, on every screen:
//   1. Bannières  — the header carousel: desktop image + optional phone
//                   image, text/button, order, schedule, on/off, with live
//                   desktop + phone previews.
//   2. Coups de cœur — hand-pick and order the places in the homepage's
//                   "Coups de cœur de la rédaction" carousel.
//   3. Sections de l'accueil — show/hide and reorder homepage blocks, plus
//                   the news ticker, built-in slides and newsletter popup.
// Everything saves instantly to Supabase; the site reads it on next load.
'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { uploadImage } from '../../lib/upload';
import {
  DEFAULT_SETTINGS, SECTION_LABELS, isBannerLive, loadSiteSettings, sortBanners, type SiteSettings,
} from '../../lib/siteSettings';
import { categoryOf } from '../../lib/categories';
import { BannerSlide, type Banner } from '../HeroCarousel';
import { Button } from '../Button';
import { IconEdit, IconTrash, IconPlus, IconStar, IconChevronLeft, IconSearch, IconExternalLink } from '../icons';

type Msg = { type: 'success' | 'error' | 'warn'; text: string } | null;
type FullBanner = Banner & { active: boolean; position?: number; starts_at?: string | null; ends_at?: string | null; created_at?: string };

const SQL_HINT =
  "Cette option a besoin de la mise à jour de la base de données : exécutez le fichier SQL fourni (Supabase → SQL Editor), puis réessayez.";

function explain(err: any): Msg {
  const m = String(err?.message || err);
  if (/column|relation|schema cache|does not exist/i.test(m)) return { type: 'warn', text: SQL_HINT };
  return { type: 'error', text: m };
}

const input =
  'w-full h-11 px-3 bg-white border border-brand-line text-brand-ink rounded-xl text-[15px] placeholder:text-brand-muted focus:outline-none focus:border-brand-blue';
const label = 'block text-xs font-bold text-brand-ink/70 mb-1.5';

function Up({ onClick, disabled, dir }: { onClick: () => void; disabled?: boolean; dir: 'up' | 'down' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 'up' ? 'Monter' : 'Descendre'}
      className="w-9 h-9 rounded-lg border border-brand-line bg-white inline-flex items-center justify-center text-brand-ink hover:border-brand-blue disabled:opacity-30 cursor-pointer"
    >
      <span className={dir === 'up' ? 'rotate-90' : '-rotate-90'}>
        <IconChevronLeft size={16} />
      </span>
    </button>
  );
}

function Toggle({ on, onChange, labelText }: { on: boolean; onChange: (v: boolean) => void; labelText: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={labelText}
      onClick={() => onChange(!on)}
      className={`relative w-12 h-7 rounded-full transition-colors shrink-0 cursor-pointer ${on ? 'bg-brand-blue' : 'bg-brand-line'}`}
    >
      <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? 'left-6' : 'left-1'}`} />
    </button>
  );
}

function ImageDrop({
  title, hint, value, onChange, folder, maxWidth, aspect,
}: {
  title: string; hint: string; value: string; onChange: (url: string) => void;
  folder: 'banners' | 'banners-mobile' | 'places'; maxWidth: number; aspect: string;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  return (
    <div>
      <span className={label}>{title}</span>
      <label
        className={`relative flex flex-col items-center justify-center text-center ${aspect} rounded-2xl border-2 border-dashed border-brand-line bg-brand-bg overflow-hidden cursor-pointer hover:border-brand-blue`}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="absolute inset-0 w-full h-full object-contain" />
        ) : (
          <span className="px-3 text-sm text-brand-muted">
            {busy ? 'Envoi…' : <>Cliquez pour choisir une image<br /><span className="text-xs">{hint}</span></>}
          </span>
        )}
        {busy && <span className="absolute inset-0 bg-white/70 flex items-center justify-center text-sm font-bold">Envoi…</span>}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            setBusy(true);
            setErr('');
            try {
              onChange(await uploadImage(f, folder, maxWidth));
            } catch (x: any) {
              setErr(x.message || String(x));
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      <div className="flex justify-between items-center mt-1.5 min-h-[20px]">
        <span className="text-[11px] text-brand-muted">{hint}</span>
        {value && (
          <button type="button" onClick={() => onChange('')} className="text-xs font-bold text-brand-danger cursor-pointer">
            Retirer
          </button>
        )}
      </div>
      {err && <p className="text-xs text-brand-danger m-0">{err}</p>}
    </div>
  );
}

const toLocal = (iso?: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : null);

function bannerStatus(b: FullBanner) {
  if (!b.active) return { text: 'Désactivée', cls: 'bg-brand-line text-brand-muted' };
  const now = Date.now();
  if (b.starts_at && Date.parse(b.starts_at) > now) return { text: `Programmée · ${new Date(b.starts_at).toLocaleDateString('fr-FR')}`, cls: 'bg-brand-yellow-soft text-brand-yellow-deep' };
  if (b.ends_at && Date.parse(b.ends_at) < now) return { text: 'Expirée', cls: 'bg-brand-red-soft text-brand-red' };
  return { text: 'En ligne', cls: 'bg-[#E5F7EC] text-[#178A4A]' };
}

// ======================================================================
export function ShowcasePanel() {
  const [tab, setTab] = useState<'banners' | 'featured' | 'sections'>('banners');
  const [msg, setMsg] = useState<Msg>(null);

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-3xl border border-brand-line p-5 md:p-6">
        <h2 className="font-display text-2xl font-extrabold text-brand-ink m-0">Vitrine de la page d&apos;accueil</h2>
        <p className="text-sm text-brand-muted mt-1 mb-4">
          Choisissez ce que les visiteurs voient en premier — sur ordinateur et sur téléphone. Les changements sont visibles
          sur le site au prochain chargement de la page.
        </p>
        <div className="grid grid-cols-3 gap-2 bg-brand-bg p-1.5 rounded-2xl">
          {[
            ['banners', 'Bannières'],
            ['featured', 'Coups de cœur'],
            ['sections', "Sections de l'accueil"],
          ].map(([id, l]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTab(id as typeof tab);
                setMsg(null);
              }}
              className={`h-11 rounded-xl text-sm font-bold cursor-pointer ${tab === id ? 'bg-white shadow-card text-brand-ink' : 'text-brand-muted hover:text-brand-ink'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {msg && (
        <div
          className={`rounded-2xl px-4 py-3 text-sm font-semibold border ${
            msg.type === 'success'
              ? 'bg-[#E5F7EC] border-[#9BD8B3] text-[#146C3B]'
              : msg.type === 'warn'
              ? 'bg-brand-yellow-soft border-brand-yellow text-brand-ink'
              : 'bg-brand-red-soft border-brand-red/40 text-brand-red-dark'
          }`}
        >
          {msg.text}
        </div>
      )}

      {tab === 'banners' && <BannersTab setMsg={setMsg} />}
      {tab === 'featured' && <FeaturedTab setMsg={setMsg} />}
      {tab === 'sections' && <SectionsTab setMsg={setMsg} />}
    </div>
  );
}

// ---------------------------------------------------------------- BANNERS --
const EMPTY: FullBanner = { id: 0, image_url: '', mobile_image_url: '', message: '', link_url: '', link_label: '', active: true, starts_at: null, ends_at: null };

function BannersTab({ setMsg }: { setMsg: (m: Msg) => void }) {
  const [list, setList] = useState<FullBanner[]>([]);
  const [edit, setEdit] = useState<FullBanner | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.from('banners').select('*');
    if (error) return setMsg(explain(error));
    setList(sortBanners((data || []) as FullBanner[]));
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    if (!edit.image_url && !edit.mobile_image_url && !edit.message) {
      setMsg({ type: 'error', text: 'Ajoutez au moins une image ou un message.' });
      return;
    }
    setSaving(true);
    const base = {
      image_url: edit.image_url || null,
      message: edit.message?.trim() || null,
      link_url: edit.link_url?.trim() || null,
      link_label: edit.link_label?.trim() || null,
      active: edit.active,
    };
    const extra = {
      mobile_image_url: edit.mobile_image_url || null,
      starts_at: edit.starts_at || null,
      ends_at: edit.ends_at || null,
      ...(edit.id ? {} : { position: list.length ? Math.max(...list.map((b) => b.position ?? 0)) + 1 : 0 }),
    };
    let { error } = edit.id
      ? await supabase.from('banners').update({ ...base, ...extra }).eq('id', edit.id)
      : await supabase.from('banners').insert([{ ...base, ...extra }]);
    // Before the SQL update, the new columns don't exist: save what we can.
    if (error && explain(error)?.type === 'warn') {
      ({ error } = edit.id ? await supabase.from('banners').update(base).eq('id', edit.id) : await supabase.from('banners').insert([base]));
      if (!error) setMsg({ type: 'warn', text: 'Bannière enregistrée, sans image mobile ni programmation. ' + SQL_HINT });
    } else if (!error) {
      setMsg({ type: 'success', text: edit.id ? 'Bannière mise à jour.' : 'Bannière ajoutée au carrousel.' });
    }
    setSaving(false);
    if (error) return setMsg(explain(error));
    setEdit(null);
    load();
  };

  const move = async (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    setList(next);
    const results = await Promise.all(next.map((b, k) => supabase.from('banners').update({ position: k }).eq('id', b.id)));
    const err = results.find((r) => r.error)?.error;
    if (err) setMsg(explain(err));
  };

  const toggle = async (b: FullBanner) => {
    const { error } = await supabase.from('banners').update({ active: !b.active }).eq('id', b.id);
    if (error) return setMsg(explain(error));
    load();
  };

  const remove = async (b: FullBanner) => {
    if (!confirm('Supprimer définitivement cette bannière ?')) return;
    const { error } = await supabase.from('banners').delete().eq('id', b.id);
    if (error) return setMsg(explain(error));
    load();
  };

  if (edit) {
    return (
      <form onSubmit={save} className="bg-white rounded-3xl border border-brand-line p-5 md:p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-xl font-extrabold m-0">{edit.id ? 'Modifier la bannière' : 'Nouvelle bannière'}</h3>
          <button type="button" onClick={() => setEdit(null)} className="text-sm font-bold text-brand-muted cursor-pointer">
            Annuler
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_auto] items-start">
          <ImageDrop
            title="Image ordinateur & tablette"
            hint="Paysage · idéal 2400 × 800 px (3:1)"
            value={edit.image_url || ''}
            onChange={(v) => setEdit({ ...edit, image_url: v })}
            folder="banners"
            maxWidth={2400}
            aspect="w-full aspect-[3/1]"
          />
          <ImageDrop
            title="Image téléphone (recommandé)"
            hint="Portrait · idéal 1080 × 1350 px (4:5)"
            value={edit.mobile_image_url || ''}
            onChange={(v) => setEdit({ ...edit, mobile_image_url: v })}
            folder="banners-mobile"
            maxWidth={1400}
            aspect="w-[150px] md:w-[170px] aspect-[4/5]"
          />
        </div>
        <p className="text-xs text-brand-muted -mt-2 m-0">
          Sans image téléphone, l&apos;image ordinateur est utilisée en entier (jamais recadrée). Les grosses photos sont
          automatiquement allégées.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className={label} htmlFor="bn-msg">Texte sur la bannière (optionnel)</label>
            <input id="bn-msg" className={input} value={edit.message || ''} maxLength={120} onChange={(e) => setEdit({ ...edit, message: e.target.value })} placeholder="Ex : Grand concert de rumba ce samedi au Grand Théâtre" />
          </div>
          <div>
            <label className={label} htmlFor="bn-url">Lien du bouton (optionnel)</label>
            <input id="bn-url" className={input} value={edit.link_url || ''} onChange={(e) => setEdit({ ...edit, link_url: e.target.value })} placeholder="https://… ou /commune/Gombe" />
          </div>
          <div>
            <label className={label} htmlFor="bn-lbl">Texte du bouton</label>
            <input id="bn-lbl" className={input} value={edit.link_label || ''} maxLength={30} onChange={(e) => setEdit({ ...edit, link_label: e.target.value })} placeholder="En savoir plus" />
          </div>
          <div>
            <label className={label} htmlFor="bn-start">Afficher à partir du (optionnel)</label>
            <input id="bn-start" type="datetime-local" className={input} value={toLocal(edit.starts_at)} onChange={(e) => setEdit({ ...edit, starts_at: fromLocal(e.target.value) })} />
          </div>
          <div>
            <label className={label} htmlFor="bn-end">Retirer automatiquement le (optionnel)</label>
            <input id="bn-end" type="datetime-local" className={input} value={toLocal(edit.ends_at)} onChange={(e) => setEdit({ ...edit, ends_at: fromLocal(e.target.value) })} />
          </div>
          <div className="flex items-center gap-3 md:col-span-2">
            <Toggle on={edit.active} onChange={(v) => setEdit({ ...edit, active: v })} labelText="Bannière active" />
            <span className="text-sm font-semibold">{edit.active ? 'Active — visible dans le carrousel' : 'Désactivée — cachée du site'}</span>
          </div>
        </div>

        <div>
          <span className={label}>Aperçu</span>
          <div className="grid gap-4 md:grid-cols-[1fr_180px] items-end bg-brand-bg rounded-2xl p-4">
            <div>
              <p className="text-[11px] font-bold text-brand-muted m-0 mb-1.5">Ordinateur</p>
              <div className="relative w-full aspect-[3/1] rounded-xl overflow-hidden shadow-card">
                <BannerSlide banner={edit} variant="desktop" />
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold text-brand-muted m-0 mb-1.5">Téléphone</p>
              <div className="relative w-[180px] h-[280px] rounded-[22px] overflow-hidden shadow-card border-4 border-brand-ink">
                <BannerSlide banner={edit} variant="mobile" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="submit" variant="primary" size="lg" disabled={saving}>
            {saving ? 'Enregistrement…' : edit.id ? 'Enregistrer les modifications' : 'Publier la bannière'}
          </Button>
          <Button type="button" variant="secondary" size="lg" onClick={() => setEdit(null)}>
            Annuler
          </Button>
        </div>
      </form>
    );
  }

  const liveCount = list.filter((b) => isBannerLive(b)).length;
  return (
    <div className="bg-white rounded-3xl border border-brand-line p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-display text-xl font-extrabold m-0">Carrousel en haut de l&apos;accueil</h3>
          <p className="text-sm text-brand-muted m-0 mt-0.5">
            {liveCount} bannière{liveCount > 1 ? 's' : ''} en ligne · affichées dans cet ordre, avant les diapositives Kinshasa Label.
          </p>
        </div>
        <Button variant="primary" onClick={() => setEdit({ ...EMPTY })}>
          <IconPlus size={16} /> Nouvelle bannière
        </Button>
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-brand-muted py-6 text-center">Aucune bannière. Le carrousel affiche les diapositives Kinshasa Label par défaut.</p>
      ) : (
        <ul className="list-none p-0 m-0 flex flex-col gap-3">
          {list.map((b, i) => {
            const st = bannerStatus(b);
            return (
              <li key={b.id} className="flex flex-col sm:flex-row sm:items-center gap-3 border border-brand-line rounded-2xl p-3">
                <div className="flex gap-2 shrink-0">
                  <div className="relative w-[150px] aspect-[3/1] rounded-lg overflow-hidden bg-brand-bg" title="Ordinateur">
                    <BannerSlide banner={{ ...b, message: null, link_url: null }} variant="desktop" />
                  </div>
                  <div className="relative w-[40px] h-[50px] rounded-md overflow-hidden bg-brand-bg" title="Téléphone">
                    <BannerSlide banner={{ ...b, message: null, link_url: null }} variant="mobile" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`inline-block text-[11px] font-extrabold px-2 py-0.5 rounded-full ${st.cls}`}>{st.text}</span>
                  {!b.mobile_image_url && b.image_url && (
                    <span className="ml-1.5 inline-block text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand-bg text-brand-muted">sans image téléphone</span>
                  )}
                  <p className="text-sm font-semibold text-brand-ink m-0 mt-1 truncate">{b.message || <span className="text-brand-muted font-normal">Sans texte</span>}</p>
                  {b.ends_at && <p className="text-xs text-brand-muted m-0">Jusqu&apos;au {new Date(b.ends_at).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Up dir="up" onClick={() => move(i, -1)} disabled={i === 0} />
                  <Up dir="down" onClick={() => move(i, 1)} disabled={i === list.length - 1} />
                  <Toggle on={b.active} onChange={() => toggle(b)} labelText="Activer / désactiver" />
                  <button type="button" onClick={() => setEdit({ ...b })} aria-label="Modifier" className="w-9 h-9 rounded-lg border border-brand-line inline-flex items-center justify-center hover:border-brand-blue cursor-pointer">
                    <IconEdit size={15} />
                  </button>
                  <button type="button" onClick={() => remove(b)} aria-label="Supprimer" className="w-9 h-9 rounded-lg border border-brand-line inline-flex items-center justify-center text-brand-danger hover:border-brand-danger cursor-pointer">
                    <IconTrash size={15} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// --------------------------------------------------------------- FEATURED --
function FeaturedTab({ setMsg }: { setMsg: (m: Msg) => void }) {
  const [places, setPlaces] = useState<any[]>([]);
  const [q, setQ] = useState('');

  const load = async () => {
    const { data, error } = await supabase.from('places').select('*').order('name');
    if (error) return setMsg(explain(error));
    setPlaces(data || []);
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const featured = useMemo(
    () => places.filter((p) => p.featured).sort((a, b) => (a.featured_rank ?? 0) - (b.featured_rank ?? 0)),
    [places]
  );
  const others = places.filter((p) => !p.featured && (!q || `${p.name} ${p.commune}`.toLowerCase().includes(q.toLowerCase())));
  const columnMissing = places.length > 0 && !('featured' in places[0]);

  const setFeatured = async (p: any, on: boolean) => {
    const rank = on ? (featured.length ? Math.max(...featured.map((f) => f.featured_rank ?? 0)) + 1 : 0) : 0;
    const { error } = await supabase.from('places').update({ featured: on, featured_rank: rank }).eq('id', p.id);
    if (error) return setMsg(explain(error));
    load();
  };

  const move = async (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= featured.length) return;
    const next = [...featured];
    [next[i], next[j]] = [next[j], next[i]];
    const results = await Promise.all(next.map((p, k) => supabase.from('places').update({ featured_rank: k }).eq('id', p.id)));
    const err = results.find((r) => r.error)?.error;
    if (err) setMsg(explain(err));
    load();
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="bg-white rounded-3xl border border-brand-line p-5">
        <h3 className="font-display text-xl font-extrabold m-0">Coups de cœur de la rédaction ({featured.length})</h3>
        <p className="text-sm text-brand-muted mt-1 mb-4">
          Affichés dans cet ordre dans le premier carrousel de l&apos;accueil. Conseil : 6 à 12 lieux, avec de belles photos.
        </p>
        {columnMissing && <p className="text-sm bg-brand-yellow-soft rounded-xl px-3 py-2 mb-3">{SQL_HINT}</p>}
        {featured.length === 0 ? (
          <p className="text-sm text-brand-muted py-6 text-center border-2 border-dashed border-brand-line rounded-2xl">
            Aucun coup de cœur — l&apos;accueil affiche alors les mieux notés. Ajoutez des lieux depuis la liste à droite.
          </p>
        ) : (
          <ul className="list-none p-0 m-0 flex flex-col gap-2">
            {featured.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 border border-brand-line rounded-2xl p-2.5">
                <span className="w-7 text-center font-display font-extrabold text-brand-red">{i + 1}</span>
                <Thumb p={p} />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold truncate">{p.name}</span>
                  <span className="block text-xs text-brand-muted truncate">{categoryOf(p.vertical).label} · {p.commune}</span>
                </span>
                <Up dir="up" onClick={() => move(i, -1)} disabled={i === 0} />
                <Up dir="down" onClick={() => move(i, 1)} disabled={i === featured.length - 1} />
                <button type="button" onClick={() => setFeatured(p, false)} className="h-9 px-3 rounded-lg text-xs font-bold text-brand-danger border border-brand-line hover:border-brand-danger cursor-pointer">
                  Retirer
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-brand-line p-5">
        <h3 className="font-display text-xl font-extrabold m-0 mb-3">Tous les lieux</h3>
        <div className="relative mb-3">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted"><IconSearch size={16} /></span>
          <input className={`${input} pl-9`} placeholder="Rechercher un lieu ou une commune…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <ul className="list-none p-0 m-0 flex flex-col gap-1.5 max-h-[520px] overflow-y-auto">
          {others.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-xl p-2 hover:bg-brand-bg">
              <Thumb p={p} />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold truncate">{p.name}</span>
                <span className="block text-xs text-brand-muted truncate">{categoryOf(p.vertical).label} · {p.commune} {p.image_url ? '' : '· sans photo'}</span>
              </span>
              <button type="button" onClick={() => setFeatured(p, true)} className="h-9 px-3 rounded-lg text-xs font-bold bg-brand-yellow-soft text-brand-ink border border-brand-yellow hover:bg-brand-yellow inline-flex items-center gap-1 cursor-pointer">
                <IconStar size={13} filled className="text-brand-yellow-deep" /> Coup de cœur
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Thumb({ p }: { p: any }) {
  const cat = categoryOf(p.vertical);
  return p.image_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={p.image_url} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" />
  ) : (
    <span className="w-11 h-11 rounded-lg shrink-0" style={{ background: cat.gradient }} />
  );
}

// --------------------------------------------------------------- SECTIONS --
function SectionsTab({ setMsg }: { setMsg: (m: Msg) => void }) {
  const [s, setS] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSiteSettings().then((v) => {
      setS(v);
      setLoaded(true);
    });
  }, []);

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= s.sections.length) return;
    const next = [...s.sections];
    [next[i], next[j]] = [next[j], next[i]];
    setS({ ...s, sections: next });
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from('site_settings').upsert({ id: 1, data: s, updated_at: new Date().toISOString() });
    setSaving(false);
    setMsg(error ? explain(error) : { type: 'success', text: "Accueil mis à jour. Rechargez le site pour voir le résultat." });
  };

  if (!loaded) return <p className="text-sm text-brand-muted">Chargement…</p>;

  return (
    <div className="bg-white rounded-3xl border border-brand-line p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-display text-xl font-extrabold m-0">Ordre et visibilité des sections</h3>
          <p className="text-sm text-brand-muted m-0 mt-0.5">Le même ordre s&apos;applique sur ordinateur et sur téléphone.</p>
        </div>
        <div className="flex gap-2">
          <Button href="/" target="_blank" rel="noopener noreferrer" variant="secondary">
            Voir l&apos;accueil <IconExternalLink size={13} />
          </Button>
          <Button variant="primary" onClick={save} disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl bg-brand-bg p-3 mb-3 text-sm font-semibold text-brand-muted">1. Bannières (toujours en haut)</div>
      <ul className="list-none p-0 m-0 flex flex-col gap-2">
        {s.sections.map((sec, i) => (
          <li key={sec.id} className={`flex items-center gap-3 border rounded-2xl p-3 ${sec.visible ? 'border-brand-line' : 'border-dashed border-brand-line opacity-60'}`}>
            <span className="w-6 text-center text-sm font-extrabold text-brand-muted">{i + 2}</span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold">{SECTION_LABELS[sec.id].label}</span>
              <span className="block text-xs text-brand-muted">{SECTION_LABELS[sec.id].hint}</span>
            </span>
            <Up dir="up" onClick={() => move(i, -1)} disabled={i === 0} />
            <Up dir="down" onClick={() => move(i, 1)} disabled={i === s.sections.length - 1} />
            <Toggle
              on={sec.visible}
              labelText={`Afficher ${SECTION_LABELS[sec.id].label}`}
              onChange={(v) => setS({ ...s, sections: s.sections.map((x) => (x.id === sec.id ? { ...x, visible: v } : x)) })}
            />
          </li>
        ))}
      </ul>

      <h3 className="font-display text-lg font-extrabold mt-6 mb-2">Options</h3>
      <ul className="list-none p-0 m-0 flex flex-col gap-2">
        {[
          ['ticker', 'Bandeau défilant « Kin Actu »', 'La ligne de titres en direct sous le menu'],
          ['brandSlides', 'Diapositives Kinshasa Label dans le carrousel', 'Explorer / Kin Actualité / Kin Weekend, après vos bannières'],
          ['newsletterPopup', 'Invitation newsletter', 'Proposée une fois par visite, après défilement'],
        ].map(([k, l, h]) => (
          <li key={k} className="flex items-center gap-3 border border-brand-line rounded-2xl p-3">
            <span className="flex-1">
              <span className="block text-sm font-bold">{l}</span>
              <span className="block text-xs text-brand-muted">{h}</span>
            </span>
            <Toggle on={s[k as 'ticker']} labelText={l} onChange={(v) => setS({ ...s, [k]: v })} />
          </li>
        ))}
      </ul>
    </div>
  );
}

