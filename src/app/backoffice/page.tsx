'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { IconHome, IconEdit, IconTrash, IconPlus, IconExternalLink } from '../../components/icons';
import { Button } from '../../components/Button';

const COMMUNES = [
  'Gombe', 'Limete', 'Ngaliema', "N'sele", "N'djili", 'Kintambo',
  'Barumbu', 'Kinshasa', 'Lingwala', 'Kasa-Vubu', 'Bandalungwa',
  'Kalamu', 'Ngiri-Ngiri', 'Bumbu', 'Selembao', 'Makala', 'Ngaba',
  'Lemba', 'Matete', 'Masina', 'Kimbanseke', 'Mont-Ngafula', 'Maluku', 'Ouanza'
];

export default function BackofficePage() {
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

  const inputClass = "w-full box-border px-3 py-2.5 bg-brand-navy border border-brand-navy-border text-brand-cream rounded-lg text-sm placeholder:text-brand-muted focus:outline-none focus:border-brand-gold";
  const labelClass = "block text-[11px] text-brand-muted uppercase font-bold mb-1.5";

  return (
    <main className="min-h-screen bg-brand-navy text-brand-cream">

      {/* Simplified admin header — no marketing hero/footer needed here */}
      <nav className="flex justify-between items-center max-w-[1000px] mx-auto px-4 py-4 border-b border-brand-navy-border flex-wrap gap-2.5">
        <div className="flex items-center gap-3">
          <Link href="/" className="inline-flex items-center gap-1.5 text-brand-river no-underline font-semibold text-sm hover:text-brand-gold-light">
            <IconHome size={14} /> Accueil
          </Link>
          <span className="text-brand-navy-border">/</span>
          <h1 className="font-display text-lg font-semibold text-brand-cream m-0">
            Kinshasa Label — Backoffice
          </h1>
        </div>
        <Button href="/" variant="secondary" size="sm">
          ← Retour au Média
        </Button>
      </nav>

      <div className="max-w-[1000px] mx-auto px-4 py-7">

        {/* Status Notification */}
        {statusMsg && (
          <div className={`p-3.5 rounded-xl mb-5 font-semibold text-sm border ${
            statusMsg.type === 'success'
              ? 'bg-brand-green/20 text-brand-green border-brand-green'
              : 'bg-brand-danger/20 text-brand-danger border-brand-danger'
          }`}>
            {statusMsg.text}
          </div>
        )}

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
          <div className="bg-brand-navy-light border border-brand-navy-border rounded-2xl p-6">
            <h2 className="font-display text-xl text-brand-river mt-0 mb-5 font-semibold">
              Lieux Répertoriés à Kinshasa
            </h2>

            {placesList.length === 0 ? (
              <p className="text-sm text-brand-muted">Aucun lieu enregistré dans la base de données.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {placesList.map((item) => (
                  <div key={item.id} className="bg-brand-navy border border-brand-navy-border rounded-xl p-4 flex gap-4 items-center flex-wrap">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-20 h-20 object-cover rounded-lg shrink-0 border border-brand-navy-border" />
                    ) : (
                      <div className="w-20 h-20 bg-brand-navy-light rounded-lg flex items-center justify-center text-[10px] text-brand-muted shrink-0 border border-dashed border-brand-navy-border">
                        Pas d&apos;image
                      </div>
                    )}

                    <div className="flex-1 min-w-[280px]">
                      <div className="flex gap-2 items-center mb-1.5 flex-wrap">
                        <span className="text-[10px] bg-brand-gold text-brand-navy px-1.5 py-0.5 rounded font-bold uppercase">{item.vertical}</span>
                        <span className="text-xs text-brand-green font-semibold">{item.commune}</span>
                        <span className="text-xs text-brand-gold-light">{item.budget}</span>
                        <span className={`text-[11px] ${item.lat ? 'text-brand-river' : 'text-brand-danger'}`}>
                          {item.lat ? 'Coordonnées OK' : 'Mode Fallback'}
                        </span>
                      </div>

                      <h3 className="text-base text-brand-cream m-0 mb-1 font-semibold">{item.name}</h3>

                      {item.google_maps_url && (
                        <a href={item.google_maps_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-brand-river no-underline font-semibold mb-1">
                          <IconExternalLink size={11} /> Google Maps Link
                        </a>
                      )}

                      <p className="text-sm text-brand-cream/70 m-0">{item.description}</p>
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
          <form onSubmit={handleSavePlace} className="bg-brand-navy-light border border-brand-navy-border rounded-2xl p-6">
            <div className="flex justify-between items-center mb-5 border-b border-brand-navy-border pb-3">
              <h2 className="font-display text-xl text-brand-river m-0 font-semibold">
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
                className={`${inputClass} border-brand-gold`}
              />
            </div>

            <div className="mb-4">
              <label className={labelClass}>Lien Photo (URL)</label>
              <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className={inputClass} />
              {imageUrl && (
                <div className="mt-2.5">
                  <img src={imageUrl} alt="Aperçu" className="w-[120px] h-20 object-cover rounded-md border border-brand-navy-border" />
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

      </div>
    </main>
  );
}
