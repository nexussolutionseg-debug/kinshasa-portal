'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { IconHome, IconEdit, IconTrash, IconPlus, IconExternalLink, IconClock, IconSparkle, IconPin, IconCalendar, IconNews, IconMail, IconChat } from '../../components/icons';
import { ReviewsPanel } from '../../components/backoffice/ReviewsPanel';
import { ShowcasePanel } from '../../components/backoffice/ShowcasePanel';
import { DashboardHome } from '../../components/backoffice/DashboardHome';
import { PlacesPanel } from '../../components/backoffice/PlacesPanel';
import { COMMUNE_NAMES } from '../../lib/communes';
import { Button } from '../../components/Button';
import { SubscribersPanel } from '../../components/backoffice/SubscribersPanel';
import { KinshasaMark } from '../../components/BrandMark';

const COMMUNES = COMMUNE_NAMES;

export default function BackofficePage() {
  // ---------------------------------------------------------------------
  // ACCESS GUARD — /login already collects a real Supabase Auth session,
  // but until now nothing actually checked for one here: anyone who
  // opened /backoffice directly (bookmark, guessed URL, the public
  // "Proposer un Lieu" button) landed straight in the full editorial
  // panel — no credentials required. This sends anyone without a valid
  // session to /login instead, and signs out again if the session ever
  // disappears (expiry, sign-out in another tab).
  // ---------------------------------------------------------------------
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      if (!session) {
        router.replace('/login');
      } else {
        setAuthChecked(true);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/login');
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Which content type the backoffice is managing right now.
  const [section, setSection] = useState<'home' | 'places' | 'events' | 'news' | 'showcase' | 'reviews' | 'subscribers'>('home');

  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Places live in <PlacesPanel>; the list is kept here for the dashboard counts.
  const [placesList, setPlacesList] = useState<any[]>([]);
  const [placesStart, setPlacesStart] = useState<{ tab: 'list' | 'form' | 'import'; n: number }>({ tab: 'list', n: 0 });

  const fetchPlaces = async () => {
    const { data, error } = await supabase.from('places').select('*').order('created_at', { ascending: false });
    if (!error && data) setPlacesList(data);
  };

  useEffect(() => {
    fetchPlaces();
  }, []);

  // ---------------------------------------------------------------------
  // ÉVÉNEMENTS (Kin Weekend) — added so events can be managed from here
  // instead of only via direct database access. Mirrors the places CRUD
  // pattern above.
  // ---------------------------------------------------------------------
  const [eventTab, setEventTab] = useState<'manage' | 'add'>('manage');
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [evTitle, setEvTitle] = useState('');
  const [evCommune, setEvCommune] = useState('Gombe');
  const [evCategory, setEvCategory] = useState('');
  const [evDescription, setEvDescription] = useState('');
  const [evDate, setEvDate] = useState('');

  const fetchEvents = async () => {
    const { data, error } = await supabase.from('events').select('*').order('event_date', { ascending: true });
    if (!error && data) setEventsList(data);
  };

  useEffect(() => { fetchEvents(); fetchNewsItems(); }, []);

  const resetEventForm = () => {
    setEditingEventId(null);
    setEvTitle('');
    setEvCommune('Gombe');
    setEvCategory('');
    setEvDescription('');
    setEvDate('');
  };

  const startEditingEvent = (evt: any) => {
    setEditingEventId(evt.id);
    setEvTitle(evt.title || '');
    setEvCommune(evt.commune || 'Gombe');
    setEvCategory(evt.category || '');
    setEvDescription(evt.description || '');
    setEvDate(evt.event_date || '');
    setEventTab('add');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatusMsg(null);
    const payload = {
      title: evTitle.trim(),
      commune: evCommune,
      category: evCategory.trim() || null,
      description: evDescription.trim(),
      event_date: evDate || null,
    };
    try {
      if (editingEventId) {
        const { error } = await supabase.from('events').update(payload).eq('id', editingEventId);
        if (error) throw error;
        setStatusMsg({ type: 'success', text: `Événement "${evTitle}" mis à jour !` });
      } else {
        const { error } = await supabase.from('events').insert([payload]);
        if (error) throw error;
        setStatusMsg({ type: 'success', text: `Événement "${evTitle}" ajouté !` });
      }
      resetEventForm();
      fetchEvents();
      setEventTab('manage');
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async (id: number, title: string) => {
    if (!confirm(`Supprimer "${title}" ?`)) return;
    try {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
      setStatusMsg({ type: 'success', text: `Événement "${title}" supprimé.` });
      fetchEvents();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  // ---------------------------------------------------------------------
  // ACTUALITÉS (Kin News) — manually-curated news items. There is no free,
  // no-billing news API to pull from automatically, so this is a real
  // editorial feed the team enters by hand, dated like events.
  // ---------------------------------------------------------------------
  const [newsTab, setNewsTab] = useState<'manage' | 'add'>('manage');
  const [newsList, setNewsList] = useState<any[]>([]);
  const [editingNewsId, setEditingNewsId] = useState<number | null>(null);
  const [nwTitle, setNwTitle] = useState('');
  const [nwBody, setNwBody] = useState('');
  const [nwCommune, setNwCommune] = useState('');
  const [nwSourceNote, setNwSourceNote] = useState('');
  const [nwLinkUrl, setNwLinkUrl] = useState('');
  const [nwDate, setNwDate] = useState('');

  const fetchNewsItems = async () => {
    const { data, error } = await supabase.from('news').select('*').order('published_date', { ascending: false });
    if (!error && data) setNewsList(data);
  };

  const resetNewsForm = () => {
    setEditingNewsId(null);
    setNwTitle('');
    setNwBody('');
    setNwCommune('');
    setNwSourceNote('');
    setNwLinkUrl('');
    setNwDate('');
  };

  const startEditingNews = (item: any) => {
    setEditingNewsId(item.id);
    setNwTitle(item.title || '');
    setNwBody(item.body || '');
    setNwCommune(item.commune || '');
    setNwSourceNote(item.source_note || '');
    setNwLinkUrl(item.link_url || '');
    setNwDate(item.published_date || '');
    setNewsTab('add');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveNews = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatusMsg(null);
    const payload = {
      title: nwTitle.trim(),
      body: nwBody.trim(),
      commune: nwCommune.trim() || null,
      source_note: nwSourceNote.trim() || null,
      link_url: nwLinkUrl.trim() || null,
      published_date: nwDate || new Date().toISOString().slice(0, 10),
    };
    try {
      if (editingNewsId) {
        const { error } = await supabase.from('news').update(payload).eq('id', editingNewsId);
        if (error) throw error;
        setStatusMsg({ type: 'success', text: `Actualité "${nwTitle}" mise à jour !` });
      } else {
        const { error } = await supabase.from('news').insert([payload]);
        if (error) throw error;
        setStatusMsg({ type: 'success', text: `Actualité "${nwTitle}" publiée !` });
      }
      resetNewsForm();
      fetchNewsItems();
      setNewsTab('manage');
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNews = async (id: number, title: string) => {
    if (!confirm(`Supprimer "${title}" ?`)) return;
    try {
      const { error } = await supabase.from('news').delete().eq('id', id);
      if (error) throw error;
      setStatusMsg({ type: 'success', text: `Actualité "${title}" supprimée.` });
      fetchNewsItems();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  const inputClass = "w-full box-border min-h-11 px-3 py-2.5 bg-brand-bg border border-brand-line text-brand-ink rounded-xl text-[16px] md:text-sm placeholder:text-brand-muted focus:outline-none focus:border-brand-red";
  const labelClass = "block text-xs text-brand-ink/70 font-bold mb-1.5";

  // Nothing is rendered until the session check above resolves — avoids a
  // flash of the full admin panel before an unauthenticated visitor gets
  // redirected to /login.
  if (!authChecked) {
    return (
      <main className="min-h-screen bg-brand-bg text-brand-ink flex items-center justify-center">
        <p className="text-sm text-brand-muted">Vérification de l&apos;accès...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-bg text-brand-ink">

      {/* Admin header — sticky, with one-click access to the live site */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-brand-line">
        <div className="max-w-[1150px] mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <KinshasaMark size={36} />
            <div className="min-w-0">
              <p className="font-display text-base md:text-lg font-extrabold text-brand-ink m-0 leading-none truncate">Kinshasa Label</p>
              <p className="text-[11px] font-bold uppercase tracking-wider text-brand-blue m-0 mt-1">Backoffice</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button href="/" target="_blank" rel="noopener noreferrer" variant="secondary" size="sm">
              <IconExternalLink size={13} /> <span className="hidden sm:inline">Voir le site</span><span className="sm:hidden">Site</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <span className="hidden sm:inline">Déconnexion</span><span className="sm:hidden">Quitter</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-[1150px] mx-auto px-4 py-6 md:py-8">

        {/* Status Notification */}
        {statusMsg && (
          <div className={`p-3.5 rounded-xl mb-5 font-semibold text-sm border ${
            statusMsg.type === 'success'
              ? 'bg-brand-blue-deep/20 text-brand-blue-deep border-brand-blue-deep'
              : 'bg-brand-danger/20 text-brand-danger border-brand-danger'
          }`}>
            {statusMsg.text}
          </div>
        )}

        {/* SECTION SWITCHER — big, icon-led tabs; scrolls sideways on phones */}
        <nav aria-label="Sections du backoffice" className="rail flex gap-2 overflow-x-auto pb-2 mb-6 -mx-4 px-4 md:mx-0 md:px-0">
          {([
            ['home', 'Tableau de bord', IconHome],
            ['showcase', 'Vitrine (accueil)', IconSparkle],
            ['places', 'Lieux', IconPin],
            ['events', 'Kin Weekend', IconCalendar],
            ['news', 'À la une', IconNews],
            ['reviews', 'Avis', IconChat],
            ['subscribers', 'Abonnés', IconMail],
          ] as const).map(([id, l, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => { setSection(id); setStatusMsg(null); window.scrollTo({ top: 0 }); }}
              className={`shrink-0 inline-flex items-center gap-2 h-11 px-4 rounded-full text-sm font-bold border-2 cursor-pointer transition-colors ${
                section === id ? 'bg-brand-ink text-white border-brand-ink' : 'bg-white text-brand-ink border-brand-line hover:border-brand-blue'
              }`}
            >
              <Icon size={16} /> {l}
            </button>
          ))}
        </nav>

        {section === 'home' && (
          <DashboardHome
            go={(id) => { setSection(id); window.scrollTo({ top: 0 }); }}
            addPlace={() => { setSection('places'); setPlacesStart((x) => ({ tab: 'form', n: x.n + 1 })); }}
            placesCount={placesList.length}
            placesNoPhoto={placesList.filter((p) => !p.image_url).length}
            eventsCount={eventsList.filter((e: any) => !e.event_date || new Date(e.event_date) >= new Date(new Date().toDateString())).length}
            newsCount={newsList.length}
          />
        )}

        {section === 'subscribers' && <SubscribersPanel />}

        {section === 'places' && (
          <PlacesPanel key={placesStart.n} places={placesList} reload={fetchPlaces} startWith={placesStart.tab} />
        )}

        {/* ÉVÉNEMENTS SECTION */}
        {section === 'events' && (
        <>
        <div className="flex gap-2.5 mb-6">
          <Button variant={eventTab === 'manage' ? 'primary' : 'secondary'} onClick={() => setEventTab('manage')} fullWidth>
            Liste ({eventsList.length})
          </Button>
          <Button variant={eventTab === 'add' ? 'primary' : 'secondary'} onClick={() => { setEventTab('add'); resetEventForm(); }} fullWidth>
            {editingEventId ? (<><IconEdit size={14} /> Modifier</>) : (<><IconPlus size={14} /> Ajouter</>)}
          </Button>
        </div>

        {eventTab === 'manage' && (
          <div className="bg-brand-surface border border-brand-line rounded-3xl p-4 md:p-6">
            <h2 className="font-display text-xl text-brand-blue mt-0 mb-5 font-semibold">
              Événements — Kin Weekend
            </h2>
            {eventsList.length === 0 ? (
              <p className="text-sm text-brand-muted">Aucun événement enregistré. Ajoutez le premier événement du week-end via l&apos;onglet ci-dessus.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {eventsList.map((item) => (
                  <div key={item.id} className="bg-brand-bg border border-brand-line rounded-2xl p-3.5 md:p-4 flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
                    <div className="flex-1 min-w-0">
                      <div className="flex gap-2 items-center mb-1.5 flex-wrap">
                        {item.category && <span className="text-[10px] bg-brand-red text-white px-1.5 py-0.5 rounded font-bold uppercase">{item.category}</span>}
                        <span className="text-xs text-brand-blue-deep font-semibold">{item.commune}</span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-brand-muted">
                          <IconClock size={11} /> {item.event_date || 'Date non définie'}
                        </span>
                      </div>
                      <h3 className="text-base text-brand-ink m-0 mb-1 font-semibold break-words">{item.title}</h3>
                      <p className="text-sm text-brand-ink/70 m-0 line-clamp-3 break-words">{item.description}</p>
                    </div>
                    <div className="grid grid-cols-2 sm:flex gap-2 shrink-0">
                      <Button variant="primary" onClick={() => startEditingEvent(item)}>
                        <IconEdit size={13} /> Éditer
                      </Button>
                      <Button variant="danger" onClick={() => handleDeleteEvent(item.id, item.title)}>
                        <IconTrash size={13} /> Supprimer
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {eventTab === 'add' && (
          <form onSubmit={handleSaveEvent} className="bg-brand-surface border border-brand-line rounded-3xl p-4 md:p-6">
            <div className="flex justify-between items-center gap-3 mb-5 border-b border-brand-line pb-3">
              <h2 className="font-display text-xl text-brand-blue m-0 font-semibold break-words min-w-0">
                {editingEventId ? `Éditer : "${evTitle}"` : 'Nouvel Événement'}
              </h2>
              {editingEventId && (
                <Button type="button" variant="ghost" onClick={() => { resetEventForm(); setEventTab('manage'); }}>
                  Annuler
                </Button>
              )}
            </div>

            <div className="mb-4">
              <label className={labelClass}>Titre *</label>
              <input type="text" value={evTitle} onChange={(e) => setEvTitle(e.target.value)} required className={inputClass} />
            </div>

            <div className="grid gap-4 mb-4 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
              <div>
                <label className={labelClass}>Commune</label>
                <select value={evCommune} onChange={(e) => setEvCommune(e.target.value)} className={inputClass}>
                  {COMMUNES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Catégorie</label>
                <input type="text" value={evCategory} onChange={(e) => setEvCategory(e.target.value)} placeholder="ex: Concert, Marché, Expo" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Date</label>
                <input type="date" value={evDate} onChange={(e) => setEvDate(e.target.value)} className={inputClass} />
              </div>
            </div>

            <div className="mb-5">
              <label className={labelClass}>Description *</label>
              <textarea value={evDescription} onChange={(e) => setEvDescription(e.target.value)} required rows={3} className={inputClass} />
            </div>

            <Button type="submit" disabled={submitting} variant="primary" size="lg" fullWidth>
              {submitting ? 'Enregistrement...' : editingEventId ? 'Enregistrer les Modifications →' : 'Publier l’Événement →'}
            </Button>
          </form>
        )}
        </>
        )}

        {/* ACTUALITÉS SECTION */}
        {section === 'news' && (
        <>
        <div className="flex gap-2.5 mb-6">
          <Button variant={newsTab === 'manage' ? 'primary' : 'secondary'} onClick={() => setNewsTab('manage')} fullWidth>
            Liste ({newsList.length})
          </Button>
          <Button variant={newsTab === 'add' ? 'primary' : 'secondary'} onClick={() => { setNewsTab('add'); resetNewsForm(); }} fullWidth>
            {editingNewsId ? (<><IconEdit size={14} /> Modifier</>) : (<><IconPlus size={14} /> Publier</>)}
          </Button>
        </div>

        {newsTab === 'manage' && (
          <div className="bg-brand-surface border border-brand-line rounded-3xl p-4 md:p-6">
            <h2 className="font-display text-xl text-brand-blue mt-0 mb-5 font-semibold">
              À la une — Kin Actualité
            </h2>
            <p className="text-xs text-brand-muted mb-4 leading-relaxed">
              Sujets de la rédaction, épinglés « À la une » en tête de Kin Actualité (au-dessus du flux en direct des médias congolais, qui se met à jour tout seul).
            </p>
            {newsList.length === 0 ? (
              <p className="text-sm text-brand-muted">Aucune actualité publiée. Ajoutez la première via l&apos;onglet ci-dessus.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {newsList.map((item) => (
                  <div key={item.id} className="bg-brand-bg border border-brand-line rounded-2xl p-3.5 md:p-4 flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
                    <div className="flex-1 min-w-0">
                      <div className="flex gap-2 items-center mb-1.5 flex-wrap">
                        {item.commune && <span className="text-xs text-brand-blue-deep font-semibold">{item.commune}</span>}
                        <span className="inline-flex items-center gap-1 text-[11px] text-brand-muted">
                          <IconClock size={11} /> {item.published_date}
                        </span>
                      </div>
                      <h3 className="text-base text-brand-ink m-0 mb-1 font-semibold break-words">{item.title}</h3>
                      <p className="text-sm text-brand-ink/70 m-0 line-clamp-3 break-words">{item.body}</p>
                      {item.source_note && <p className="text-[11px] text-brand-muted/70 m-0 mt-1">{item.source_note}</p>}
                    </div>
                    <div className="grid grid-cols-2 sm:flex gap-2 shrink-0">
                      <Button variant="primary" onClick={() => startEditingNews(item)}>
                        <IconEdit size={13} /> Éditer
                      </Button>
                      <Button variant="danger" onClick={() => handleDeleteNews(item.id, item.title)}>
                        <IconTrash size={13} /> Supprimer
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {newsTab === 'add' && (
          <form onSubmit={handleSaveNews} className="bg-brand-surface border border-brand-line rounded-3xl p-4 md:p-6">
            <div className="flex justify-between items-center gap-3 mb-5 border-b border-brand-line pb-3">
              <h2 className="font-display text-xl text-brand-blue m-0 font-semibold break-words min-w-0">
                {editingNewsId ? `Éditer : "${nwTitle}"` : 'Nouvelle Actualité'}
              </h2>
              {editingNewsId && (
                <Button type="button" variant="ghost" onClick={() => { resetNewsForm(); setNewsTab('manage'); }}>
                  Annuler
                </Button>
              )}
            </div>

            <div className="mb-4">
              <label className={labelClass}>Titre *</label>
              <input type="text" value={nwTitle} onChange={(e) => setNwTitle(e.target.value)} required className={inputClass} />
            </div>

            <div className="grid gap-4 mb-4 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
              <div>
                <label className={labelClass}>Commune (optionnel)</label>
                <select value={nwCommune} onChange={(e) => setNwCommune(e.target.value)} className={inputClass}>
                  <option value="">Toute la ville</option>
                  {COMMUNES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Date de publication</label>
                <input type="date" value={nwDate} onChange={(e) => setNwDate(e.target.value)} className={inputClass} />
              </div>
            </div>

            <div className="mb-4">
              <label className={labelClass}>Contenu *</label>
              <textarea value={nwBody} onChange={(e) => setNwBody(e.target.value)} required rows={4} className={inputClass} />
            </div>

            <div className="mb-4">
              <label className={labelClass}>Lien source (optionnel)</label>
              <input type="url" value={nwLinkUrl} onChange={(e) => setNwLinkUrl(e.target.value)} placeholder="https://..." className={inputClass} />
            </div>

            <div className="mb-5">
              <label className={labelClass}>Note de source (optionnel)</label>
              <input type="text" value={nwSourceNote} onChange={(e) => setNwSourceNote(e.target.value)} placeholder="ex: Radio Okapi, communiqué du client..." className={inputClass} />
            </div>

            <Button type="submit" disabled={submitting} variant="primary" size="lg" fullWidth>
              {submitting ? 'Enregistrement...' : editingNewsId ? 'Enregistrer les Modifications →' : 'Publier →'}
            </Button>
          </form>
        )}
        </>
        )}

        {section === 'showcase' && <ShowcasePanel />}
        {section === 'reviews' && <ReviewsPanel />}

      </div>
    </main>
  );
}
