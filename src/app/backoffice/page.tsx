'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { IconHome, IconEdit, IconTrash, IconPlus, IconExternalLink, IconClock, IconSparkle, IconPin, IconCalendar, IconNews, IconMail, IconChat } from '../../components/icons';
import { ReviewsPanel } from '../../components/backoffice/ReviewsPanel';
import { ShowcasePanel } from '../../components/backoffice/ShowcasePanel';
import { DashboardHome } from '../../components/backoffice/DashboardHome';
import { uploadImage } from '../../lib/upload';
import { Button } from '../../components/Button';
import { SubscribersPanel } from '../../components/backoffice/SubscribersPanel';
import { KinshasaMark } from '../../components/BrandMark';

const COMMUNES = [
  'Gombe', 'Limete', 'Ngaliema', "N'sele", "N'djili", 'Kintambo',
  'Barumbu', 'Kinshasa', 'Lingwala', 'Kasa-Vubu', 'Bandalungwa',
  'Kalamu', 'Ngiri-Ngiri', 'Bumbu', 'Selembao', 'Makala', 'Ngaba',
  'Lemba', 'Matete', 'Masina', 'Kimbanseke', 'Mont-Ngafula', 'Maluku', 'Kisenso'
];

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

  const [activeTab, setActiveTab] = useState<'manage' | 'add'>('manage');
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Database Places
  const [placesList, setPlacesList] = useState<any[]>([]);
  const [editingPlaceId, setEditingPlaceId] = useState<number | null>(null);

  // Editable Form Fields
  const [placeName, setPlaceName] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [commune, setCommune] = useState('Gombe');
  const [vertical, setVertical] = useState('kin_food');
  const [address, setAddress] = useState('');
  const [budget, setBudget] = useState('$$');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [placeDesc, setPlaceDesc] = useState('');

  const placeInputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<any>(null);

  // Fetch all listed places from Supabase
  const fetchPlaces = async () => {
    const { data, error } = await supabase
      .from('places')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPlacesList(data);
    }
  };

  useEffect(() => {
    fetchPlaces();
  }, []);

  // Load Google Places Autocomplete Script
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      console.warn("⚠️ GOOGLE PLACES API KEY MISSING: Please set NEXT_PUBLIC_GOOGLE_PLACES_API_KEY in Vercel / .env.local");
      return;
    }

    if ((window as any).google && (window as any).google.maps && (window as any).google.maps.places) {
      initAutocomplete();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = () => initAutocomplete();
    document.head.appendChild(script);
  }, [activeTab]);

  const initAutocomplete = () => {
    if (!placeInputRef.current || !(window as any).google) return;

    autocompleteRef.current = new (window as any).google.maps.places.Autocomplete(placeInputRef.current, {
      types: ['establishment', 'geocode'],
      componentRestrictions: { country: 'cd' } // Restrict search to DR Congo
    });

    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace();
      if (!place) return;

      if (place.name) setPlaceName(place.name);
      if (place.formatted_address) setAddress(place.formatted_address);
      if (place.url) setGoogleMapsUrl(place.url);

      if (place.geometry && place.geometry.location) {
        setLat(place.geometry.location.lat());
        setLng(place.geometry.location.lng());
      }

      if (place.photos && place.photos.length > 0) {
        const photoUrl = place.photos[0].getUrl({ maxWidth: 800 });
        setImageUrl(photoUrl);
      }
    });
  };

  // Populate form to edit a place
  const startEditing = (place: any) => {
    setEditingPlaceId(place.id);
    setPlaceName(place.name || '');
    setGoogleMapsUrl(place.google_maps_url || '');
    setImageUrl(place.image_url || '');
    setCommune(place.commune || 'Gombe');
    setVertical(place.vertical || 'kin_food');
    setAddress(place.address || '');
    setBudget(place.budget || '$$');
    setLat(place.lat || null);
    setLng(place.lng || null);
    setPlaceDesc(place.description || '');
    setActiveTab('add');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Save changes to database (Insert or Update)
  const handleSavePlace = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatusMsg(null);

    // Fallback coordinates if autocomplete lat/lng was missing
    const finalLat = lat || (commune === 'Limete' ? -4.350 : -4.312);
    const finalLng = lng || (commune === 'Limete' ? 15.330 : 15.300);

    const payload = {
      name: placeName.trim(),
      google_maps_url: googleMapsUrl.trim() || null,
      image_url: imageUrl.trim() || null,
      commune,
      vertical,
      address,
      budget,
      lat: finalLat,
      lng: finalLng,
      description: placeDesc,
      is_label_recommended: true
    };

    try {
      if (editingPlaceId) {
        const { error } = await supabase.from('places').update(payload).eq('id', editingPlaceId);
        if (error) throw error;
        setStatusMsg({ type: 'success', text: `Lieu "${placeName}" mis à jour avec succès !` });
      } else {
        const { error } = await supabase.from('places').insert([payload]);
        if (error) throw error;
        setStatusMsg({ type: 'success', text: `Lieu "${placeName}" ajouté à la sélection !` });
      }

      resetForm();
      fetchPlaces();
      setActiveTab('manage');
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setEditingPlaceId(null);
    setPlaceName('');
    setGoogleMapsUrl('');
    setImageUrl('');
    setAddress('');
    setLat(null);
    setLng(null);
    setPlaceDesc('');
  };

  const handleDeletePlace = async (id: number, name: string) => {
    if (!confirm(`Supprimer "${name}" ?`)) return;
    try {
      const { error } = await supabase.from('places').delete().eq('id', id);
      if (error) throw error;
      setStatusMsg({ type: 'success', text: `Lieu "${name}" supprimé.` });
      fetchPlaces();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

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

  const inputClass = "w-full box-border px-3 py-2.5 bg-brand-bg border border-brand-line text-brand-ink rounded-lg text-sm placeholder:text-brand-muted focus:outline-none focus:border-brand-red";
  const labelClass = "block text-[11px] text-brand-muted uppercase font-bold mb-1.5";

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
              Déconnexion
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
            addPlace={() => { setSection('places'); setActiveTab('add'); resetForm(); }}
            placesCount={placesList.length}
            placesNoPhoto={placesList.filter((p) => !p.image_url).length}
            eventsCount={eventsList.filter((e: any) => !e.event_date || new Date(e.event_date) >= new Date(new Date().toDateString())).length}
            newsCount={newsList.length}
          />
        )}

        {section === 'subscribers' && <SubscribersPanel />}

        {section === 'places' && (
        <>
        {/* Tab Switcher */}
        <div className="flex gap-2.5 mb-6">
          <Button
            variant={activeTab === 'manage' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('manage')}
            fullWidth
          >
            Liste des Lieux ({placesList.length})
          </Button>
          <Button
            variant={activeTab === 'add' ? 'primary' : 'secondary'}
            onClick={() => { setActiveTab('add'); resetForm(); }}
            fullWidth
          >
            {editingPlaceId ? (<><IconEdit size={14} /> Modifier le Lieu</>) : (<><IconPlus size={14} /> Ajouter un Lieu via Google Maps</>)}
          </Button>
        </div>

        {/* LIST & EDIT TAB */}
        {activeTab === 'manage' && (
          <div className="bg-brand-surface border border-brand-line rounded-2xl p-6">
            <h2 className="font-display text-xl text-brand-blue mt-0 mb-5 font-semibold">
              Lieux Répertoriés à Kinshasa
            </h2>

            {placesList.length === 0 ? (
              <p className="text-sm text-brand-muted">Aucun lieu enregistré dans la base de données.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {placesList.map((item) => (
                  <div key={item.id} className="bg-brand-bg border border-brand-line rounded-xl p-4 flex gap-4 items-center flex-wrap">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-20 h-20 object-cover rounded-lg shrink-0 border border-brand-line" />
                    ) : (
                      <div className="w-20 h-20 bg-brand-surface rounded-lg flex items-center justify-center text-[10px] text-brand-muted shrink-0 border border-dashed border-brand-line">
                        Pas d&apos;image
                      </div>
                    )}

                    <div className="flex-1 min-w-[280px]">
                      <div className="flex gap-2 items-center mb-1.5 flex-wrap">
                        <span className="text-[10px] bg-brand-red text-white px-1.5 py-0.5 rounded font-bold uppercase">{item.vertical}</span>
                        <span className="text-xs text-brand-blue-deep font-semibold">{item.commune}</span>
                        <span className="text-xs text-brand-red-dark">{item.budget}</span>
                        <span className={`text-[11px] ${item.lat ? 'text-brand-blue' : 'text-brand-danger'}`}>
                          {item.lat ? 'Coordonnées OK' : 'Mode Fallback'}
                        </span>
                      </div>

                      <h3 className="text-base text-brand-ink m-0 mb-1 font-semibold">{item.name}</h3>

                      {item.google_maps_url && (
                        <a href={item.google_maps_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-brand-blue no-underline font-semibold mb-1">
                          <IconExternalLink size={11} /> Google Maps Link
                        </a>
                      )}

                      <p className="text-sm text-brand-ink/70 m-0">{item.description}</p>
                    </div>

                    <div className="flex gap-2.5">
                      <Button variant="primary" size="sm" onClick={() => startEditing(item)}>
                        <IconEdit size={13} /> Éditer
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDeletePlace(item.id, item.name)}>
                        <IconTrash size={13} /> Supprimer
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ADD / EDIT FORM */}
        {activeTab === 'add' && (
          <form onSubmit={handleSavePlace} className="bg-brand-surface border border-brand-line rounded-2xl p-6">
            <div className="flex justify-between items-center mb-5 border-b border-brand-line pb-3">
              <h2 className="font-display text-xl text-brand-blue m-0 font-semibold">
                {editingPlaceId ? `Éditer : "${placeName}"` : 'Rechercher & Importer via Google Maps'}
              </h2>
              {editingPlaceId && (
                <Button type="button" variant="ghost" onClick={() => { resetForm(); setActiveTab('manage'); }}>
                  Annuler
                </Button>
              )}
            </div>

            {/* Google Places Input */}
            <div className="mb-4">
              <label className={labelClass}>
                Nom du Lieu (Recherche Auto Google Maps) *
              </label>
              <input
                ref={placeInputRef}
                type="text"
                value={placeName}
                onChange={(e) => setPlaceName(e.target.value)}
                required
                placeholder="Tapez le nom d'un établissement à Kinshasa..."
                className={`${inputClass} border-brand-red`}
              />
            </div>

            <div className="mb-4">
              <label className={labelClass}>Photo du lieu</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <label className="shrink-0 inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-brand-blue text-white text-sm font-bold cursor-pointer hover:bg-brand-blue-deep">
                  {photoUploading ? 'Envoi…' : 'Importer une photo'}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      if (!f) return;
                      setPhotoUploading(true);
                      try {
                        setImageUrl(await uploadImage(f, 'places', 1400));
                      } catch (err: any) {
                        setStatusMsg({ type: 'error', text: `Échec de l'envoi de la photo : ${err.message || err}` });
                      } finally {
                        setPhotoUploading(false);
                      }
                    }}
                  />
                </label>
                <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="… ou collez un lien https://" className={inputClass} />
              </div>
              <p className="text-[11px] text-brand-muted mt-1.5 mb-0">Format conseillé : paysage 4:3 (ex. 1200 × 900). Les grosses photos sont allégées automatiquement.</p>
              {imageUrl && (
                <div className="mt-2.5">
                  <img src={imageUrl} alt="Aperçu" className="w-[120px] h-20 object-cover rounded-md border border-brand-line" />
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className={labelClass}>Lien Google Maps</label>
              <input type="url" value={googleMapsUrl} onChange={(e) => setGoogleMapsUrl(e.target.value)} placeholder="https://maps.app.goo.gl/..." className={inputClass} />
            </div>

            <div className="grid gap-4 mb-4 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
              <div>
                <label className={labelClass}>Commune</label>
                <select value={commune} onChange={(e) => setCommune(e.target.value)} className={inputClass}>
                  {COMMUNES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Verticale</label>
                <select value={vertical} onChange={(e) => setVertical(e.target.value)} className={inputClass}>
                  <option value="kin_food">KIN FOOD (Où bien manger)</option>
                  <option value="kin_places">KIN PLACES (Lieux à découvrir)</option>
                  <option value="kin_culture">KIN CULTURE (Culture &amp; Musique)</option>
                  <option value="kin_style">KIN STYLE (Mode &amp; Créateurs)</option>
                  <option value="kin_securite">KIN SÉCURITÉ (Police &amp; Postes de sécurité)</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 mb-4 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
              <div>
                <label className={labelClass}>Adresse / Repère</label>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="ex: Av. Blvd 30 Juin" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Budget</label>
                <select value={budget} onChange={(e) => setBudget(e.target.value)} className={inputClass}>
                  <option value="$">$ (Abordable)</option>
                  <option value="$$">$$ (Moyen)</option>
                  <option value="$$$">$$$ (Premium)</option>
                </select>
              </div>
            </div>

            <div className="mb-5">
              <label className={labelClass}>Description *</label>
              <textarea value={placeDesc} onChange={(e) => setPlaceDesc(e.target.value)} required rows={3} className={inputClass} />
            </div>

            <Button type="submit" disabled={submitting} variant="primary" size="lg" fullWidth>
              {submitting ? 'Enregistrement...' : editingPlaceId ? 'Enregistrer les Modifications →' : 'Enregistrer le Lieu →'}
            </Button>
          </form>
        )}
        </>
        )}

        {/* ÉVÉNEMENTS SECTION */}
        {section === 'events' && (
        <>
        <div className="flex gap-2.5 mb-6">
          <Button variant={eventTab === 'manage' ? 'primary' : 'secondary'} onClick={() => setEventTab('manage')} fullWidth>
            Liste des Événements ({eventsList.length})
          </Button>
          <Button variant={eventTab === 'add' ? 'primary' : 'secondary'} onClick={() => { setEventTab('add'); resetEventForm(); }} fullWidth>
            {editingEventId ? (<><IconEdit size={14} /> Modifier l&apos;Événement</>) : (<><IconPlus size={14} /> Ajouter un Événement</>)}
          </Button>
        </div>

        {eventTab === 'manage' && (
          <div className="bg-brand-surface border border-brand-line rounded-2xl p-6">
            <h2 className="font-display text-xl text-brand-blue mt-0 mb-5 font-semibold">
              Événements — Kin Weekend
            </h2>
            {eventsList.length === 0 ? (
              <p className="text-sm text-brand-muted">Aucun événement enregistré. Ajoutez le premier événement du week-end via l&apos;onglet ci-dessus.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {eventsList.map((item) => (
                  <div key={item.id} className="bg-brand-bg border border-brand-line rounded-xl p-4 flex gap-4 items-center flex-wrap">
                    <div className="flex-1 min-w-[280px]">
                      <div className="flex gap-2 items-center mb-1.5 flex-wrap">
                        {item.category && <span className="text-[10px] bg-brand-red text-white px-1.5 py-0.5 rounded font-bold uppercase">{item.category}</span>}
                        <span className="text-xs text-brand-blue-deep font-semibold">{item.commune}</span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-brand-muted">
                          <IconClock size={11} /> {item.event_date || 'Date non définie'}
                        </span>
                      </div>
                      <h3 className="text-base text-brand-ink m-0 mb-1 font-semibold">{item.title}</h3>
                      <p className="text-sm text-brand-ink/70 m-0">{item.description}</p>
                    </div>
                    <div className="flex gap-2.5">
                      <Button variant="primary" size="sm" onClick={() => startEditingEvent(item)}>
                        <IconEdit size={13} /> Éditer
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDeleteEvent(item.id, item.title)}>
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
          <form onSubmit={handleSaveEvent} className="bg-brand-surface border border-brand-line rounded-2xl p-6">
            <div className="flex justify-between items-center mb-5 border-b border-brand-line pb-3">
              <h2 className="font-display text-xl text-brand-blue m-0 font-semibold">
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
            Liste des Actualités ({newsList.length})
          </Button>
          <Button variant={newsTab === 'add' ? 'primary' : 'secondary'} onClick={() => { setNewsTab('add'); resetNewsForm(); }} fullWidth>
            {editingNewsId ? (<><IconEdit size={14} /> Modifier l&apos;Actualité</>) : (<><IconPlus size={14} /> Publier une Actualité</>)}
          </Button>
        </div>

        {newsTab === 'manage' && (
          <div className="bg-brand-surface border border-brand-line rounded-2xl p-6">
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
                  <div key={item.id} className="bg-brand-bg border border-brand-line rounded-xl p-4 flex gap-4 items-center flex-wrap">
                    <div className="flex-1 min-w-[280px]">
                      <div className="flex gap-2 items-center mb-1.5 flex-wrap">
                        {item.commune && <span className="text-xs text-brand-blue-deep font-semibold">{item.commune}</span>}
                        <span className="inline-flex items-center gap-1 text-[11px] text-brand-muted">
                          <IconClock size={11} /> {item.published_date}
                        </span>
                      </div>
                      <h3 className="text-base text-brand-ink m-0 mb-1 font-semibold">{item.title}</h3>
                      <p className="text-sm text-brand-ink/70 m-0">{item.body}</p>
                      {item.source_note && <p className="text-[11px] text-brand-muted/70 m-0 mt-1">{item.source_note}</p>}
                    </div>
                    <div className="flex gap-2.5">
                      <Button variant="primary" size="sm" onClick={() => startEditingNews(item)}>
                        <IconEdit size={13} /> Éditer
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDeleteNews(item.id, item.title)}>
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
          <form onSubmit={handleSaveNews} className="bg-brand-surface border border-brand-line rounded-2xl p-6">
            <div className="flex justify-between items-center mb-5 border-b border-brand-line pb-3">
              <h2 className="font-display text-xl text-brand-blue m-0 font-semibold">
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
