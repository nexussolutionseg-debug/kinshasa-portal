// Backoffice → "Tableau de bord" (landing screen, 2026-10-04).
// What needs attention at a glance, one-tap shortcuts to the common jobs,
// and the "Liens de suivi" (UTM) builder for Instagram / WhatsApp / flyers.
'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { isBannerLive } from '../../lib/siteSettings';
import { buildTrackingLink, SITE_URL } from '../../lib/utm';
import { ALL_KINSHASA_COMMUNES } from '../../data/communeDetails';
import { communeHref } from '../../lib/communes';
import { CATEGORY_PATH, PLACE_CATEGORY_IDS, categoryOf } from '../../lib/categories';
import { IconPlus, IconSparkle, IconCalendar, IconNews, IconMail, IconPin, IconExternalLink, IconWarning } from '../icons';

type Section = 'home' | 'places' | 'events' | 'news' | 'showcase' | 'reviews' | 'subscribers';

const SOURCES = [
  { id: 'ig_bio', label: 'Instagram — lien en bio', source: 'instagram', medium: 'social', content: 'bio' },
  { id: 'ig_story', label: 'Instagram — story', source: 'instagram', medium: 'social', content: 'story' },
  { id: 'ig_post', label: 'Instagram — post / reel', source: 'instagram', medium: 'social', content: 'post' },
  { id: 'whatsapp', label: 'WhatsApp', source: 'whatsapp', medium: 'messaging', content: '' },
  { id: 'facebook', label: 'Facebook', source: 'facebook', medium: 'social', content: '' },
  { id: 'tiktok', label: 'TikTok', source: 'tiktok', medium: 'social', content: '' },
  { id: 'newsletter', label: 'Newsletter (e-mail)', source: 'newsletter', medium: 'email', content: '' },
  { id: 'qr', label: 'Flyer / affiche (QR code)', source: 'print', medium: 'qr', content: '' },
  { id: 'partner', label: 'Site d’un partenaire', source: 'partner', medium: 'referral', content: '' },
];

const PAGES = [
  { path: '/', label: 'Accueil' },
  { path: '/actualite', label: 'Kin Actualité' },
  ...PLACE_CATEGORY_IDS.concat('kin_traffic').map((id) => ({ path: CATEGORY_PATH[id], label: categoryOf(id).label })),
  { path: '/weekend', label: 'Kin Weekend' },
  { path: '/#explorer', label: 'Carte' },
  { path: '/communes', label: 'Les 24 communes' },
  { path: '/devenir-partenaire', label: 'Deviens partenaire' },
  ...ALL_KINSHASA_COMMUNES.map((c) => ({ path: communeHref(c), label: `Commune : ${c}` })),
];

export function DashboardHome({
  go, addPlace, placesCount, placesNoPhoto, eventsCount, newsCount,
}: {
  go: (s: Section) => void;
  addPlace: () => void;
  placesCount: number;
  placesNoPhoto: number;
  eventsCount: number;
  newsCount: number;
}) {
  const [liveBanners, setLiveBanners] = useState<number | null>(null);
  const [subs, setSubs] = useState<number | null>(null);

  useEffect(() => {
    supabase.from('banners').select('*').then(({ data }) => setLiveBanners((data || []).filter((b: any) => isBannerLive(b)).length));
    supabase.from('subscribers').select('id', { count: 'exact', head: true }).then(({ count }) => setSubs(count ?? null));
  }, []);

  const stats = [
    { label: 'Lieux publiés', value: placesCount, sub: placesNoPhoto ? `${placesNoPhoto} sans photo` : 'tous avec photo', warn: placesNoPhoto > 0, go: 'places' as Section, Icon: IconPin },
    { label: 'Événements à venir', value: eventsCount, sub: eventsCount ? 'Kin Weekend' : 'à ajouter', warn: eventsCount === 0, go: 'events' as Section, Icon: IconCalendar },
    { label: 'Bannières en ligne', value: liveBanners ?? '…', sub: 'carrousel de l’accueil', warn: liveBanners === 0, go: 'showcase' as Section, Icon: IconSparkle },
    { label: 'Abonnés newsletter', value: subs ?? '—', sub: subs === null ? 'après mise à jour SQL' : 'exportables en CSV', warn: false, go: 'subscribers' as Section, Icon: IconMail },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-3xl p-5 md:p-7 text-white" style={{ background: 'linear-gradient(120deg,#0A2A66,#1A82F5)' }}>
        <h2 className="font-display text-2xl md:text-3xl font-extrabold m-0">Mbote ! 👋</h2>
        <p className="text-white/85 m-0 mt-1">Que voulez-vous mettre en avant sur Kinshasa Label aujourd’hui ?</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mt-5">
          {[
            { l: 'Ajouter un lieu', Icon: IconPlus, on: addPlace },
            { l: 'Changer les bannières', Icon: IconSparkle, on: () => go('showcase') },
            { l: 'Ajouter un événement', Icon: IconCalendar, on: () => go('events') },
            { l: 'Publier « À la une »', Icon: IconNews, on: () => go('news') },
          ].map(({ l, Icon, on }) => (
            <button key={l} type="button" onClick={on} className="flex items-center gap-2.5 h-14 px-4 rounded-2xl bg-white/12 hover:bg-white hover:text-brand-ink border border-white/25 text-sm font-bold text-left cursor-pointer transition-colors" style={{ background: 'rgba(255,255,255,0.12)' }}>
              <Icon size={18} /> {l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(({ label, value, sub, warn, go: target, Icon }) => (
          <button key={label} type="button" onClick={() => go(target)} className="text-left bg-white rounded-2xl border border-brand-line p-4 hover:border-brand-blue cursor-pointer">
            <span className="flex items-center gap-2 text-xs font-bold text-brand-muted"><Icon size={14} /> {label}</span>
            <span className="block font-display text-3xl font-extrabold text-brand-ink mt-1">{value}</span>
            <span className={`flex items-center gap-1 text-xs font-semibold mt-0.5 ${warn ? 'text-brand-red' : 'text-brand-muted'}`}>
              {warn && <IconWarning size={12} />} {sub}
            </span>
          </button>
        ))}
      </div>

      <TrackingLinks />
    </div>
  );
}

function TrackingLinks() {
  const [srcId, setSrcId] = useState('ig_bio');
  const [path, setPath] = useState('/');
  const [campaign, setCampaign] = useState('');
  const [copied, setCopied] = useState(false);
  const src = SOURCES.find((s) => s.id === srcId)!;

  const link = useMemo(
    () => buildTrackingLink({ path, source: src.source, medium: src.medium, campaign: campaign || (srcId === 'ig_bio' ? 'bio' : 'general'), content: src.content }),
    [path, src, campaign, srcId]
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the link is selectable below */
    }
  };

  const field = 'w-full h-11 px-3 bg-white border border-brand-line rounded-xl text-[15px] focus:outline-none focus:border-brand-blue';

  return (
    <div className="bg-white rounded-3xl border border-brand-line p-5 md:p-6">
      <h3 className="font-display text-xl font-extrabold m-0">Liens de suivi (UTM)</h3>
      <p className="text-sm text-brand-muted mt-1 mb-4">
        Utilisez ces liens partout où vous partagez le site : Google Analytics vous dira combien de visiteurs viennent de
        chaque post, story ou flyer (Rapports → Acquisition → Acquisition de trafic).
      </p>
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label className="block text-xs font-bold text-brand-ink/70 mb-1.5" htmlFor="utm-src">Où allez-vous partager ?</label>
          <select id="utm-src" className={field} value={srcId} onChange={(e) => setSrcId(e.target.value)}>
            {SOURCES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-brand-ink/70 mb-1.5" htmlFor="utm-page">Vers quelle page ?</label>
          <select id="utm-page" className={field} value={path} onChange={(e) => setPath(e.target.value)}>
            {PAGES.map((p) => <option key={p.path} value={p.path}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-brand-ink/70 mb-1.5" htmlFor="utm-camp">Nom de la campagne</label>
          <input id="utm-camp" className={field} placeholder="ex : concert rumba octobre" value={campaign} onChange={(e) => setCampaign(e.target.value)} />
        </div>
      </div>
      <div className="mt-4 flex flex-col md:flex-row gap-2">
        <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className={`${field} font-mono text-xs md:text-sm bg-brand-bg`} aria-label="Lien de suivi" />
        <button type="button" onClick={copy} className="shrink-0 h-11 px-5 rounded-full bg-brand-red text-white text-sm font-bold cursor-pointer hover:bg-brand-red-dark">
          {copied ? 'Copié ✓' : 'Copier le lien'}
        </button>
      </div>
      <p className="text-[11px] text-brand-muted mt-2 mb-0">
        Lien Instagram (bio) prêt à l’emploi : <span className="font-mono break-all">{buildTrackingLink({ path: '/', source: 'instagram', medium: 'social', campaign: 'bio', content: 'bio' })}</span>
        {' · '}Les visites ne sont comptées que pour les visiteurs qui acceptent les cookies. Site : <a href={SITE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5">{SITE_URL.replace('https://', '')} <IconExternalLink size={10} /></a>
      </p>
    </div>
  );
}
