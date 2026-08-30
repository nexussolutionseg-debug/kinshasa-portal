'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { supabase } from '../lib/supabase';
import communesData from '../data/communes.json';

const VERTICALS = [
{ id: 'all', label: '✨ TOUT KIN' },
{ id: 'kin_food', label: '🍔 KIN FOOD' },
{ id: 'kin_places', label: '📍 KIN PLACES' },
{ id: 'kin_culture', label: '🎨 KIN CULTURE' },
{ id: 'kin_style', label: '👗 KIN STYLE' },
{ id: 'kin_weekend', label: '🎉 KIN WEEKEND' }
];

// Fallback Geocoding Helper for venues missing explicit lat/lng
const getFallbackCoordinates = (communeName?: string) => {
const normalized = (communeName || '').toLowerCase();
if (normalized.includes('limete')) return { lat: -4.350, lng: 15.330 };
if (normalized.includes('ngaliema')) return { lat: -4.335, lng: 15.260 };
if (normalized.includes('kintambo')) return { lat: -4.318, lng: 15.280 };
if (normalized.includes('bandal')) return { lat: -4.340, lng: 15.285 };
if (normalized.includes('kalamu')) return { lat: -4.345, lng: 15.310 };
return { lat: -4.312, lng: 15.300 }; // Default Central Kinshasa / Gombe
};

export default function HomePage() {
const mapContainer = useRef(null);
const map = useRef<maplibregl.Map | null>(null);
const markersRef = useRef<maplibregl.Marker[]>([]);

const [activeVertical, setActiveVertical] = useState('all');
const [selectedCommune, setSelectedCommune] = useState<string | null>(null);
const [places, setPlaces] = useState<any[]>([]);
const [weekendEvents, setWeekendEvents] = useState<any[]>([]);

// Likes & Comments State
const [likedPlaceIds, setLikedPlaceIds] = useState<number[]>([]);
const [activeCommentsPlaceId, setActiveCommentsPlaceId] = useState<number | null>(null);
const [commentsMap, setCommentsMap] = useState<{ [key: number]: any[] }>({});
const [newCommentAuthor, setNewCommentAuthor] = useState('');
const [newCommentText, setNewCommentText] = useState('');
const [isSubmittingComment, setIsSubmittingComment] = useState(false);

// Load liked places from localStorage on initial render
useEffect(() => {
try {
const savedLikes = localStorage.getItem('kin_liked_places');
if (savedLikes) {
setLikedPlaceIds(JSON.parse(savedLikes));
}
} catch (e) {
console.error('Could not read likes from localStorage', e);
}
}, []);

// Initialize MapLibre 3D Map
useEffect(() => {
if (map.current || !mapContainer.current) return;

map.current = new maplibregl.Map({
  container: mapContainer.current,
  style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  center: [15.3057, -4.3245],
  zoom: 11.5,
  pitch: 45,
  bearing: -10
});

map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

map.current.on('load', () => {
  if (!map.current) return;

  map.current.addSource('communes-geojson', {
    type: 'geojson',
    data: communesData as any
  });

  map.current.addLayer({
    id: 'communes-layer',
    type: 'fill-extrusion',
    source: 'communes-geojson',
    paint: {
      'fill-extrusion-color': '#1e293b',
      'fill-extrusion-height': ['get', 'height'],
      'fill-extrusion-opacity': 0.65
    }
  });

  map.current.on('click', 'communes-layer', (e) => {
    if (e.features && e.features[0]) {
      const name = e.features[0].properties?.name;
      if (name) setSelectedCommune(name);
    }
  });
});


}, []);

// Fetch places and events from Supabase
useEffect(() => {
const fetchData = async () => {
let placeQuery = supabase.from('places').select('*').order('created_at', { ascending: false });

  if (selectedCommune) {
    placeQuery = placeQuery.ilike('commune', `%${selectedCommune.trim()}%`);
  }
  if (activeVertical !== 'all' && activeVertical !== 'kin_weekend') {
    placeQuery = placeQuery.eq('vertical', activeVertical);
  }
  const { data: placeData } = await placeQuery;
  setPlaces(placeData || []);

  let eventQuery = supabase.from('events').select('*').order('event_date', { ascending: true });
  if (selectedCommune) {
    eventQuery = eventQuery.ilike('commune', `%${selectedCommune.trim()}%`);
  }
  const { data: eventData } = await eventQuery;
  setWeekendEvents(eventData || []);
};

fetchData();


}, [selectedCommune, activeVertical]);

// Handle Like Action
const handleLikePlace = async (placeId: number, currentLikes: number) => {
if (likedPlaceIds.includes(placeId)) return; // Prevent double-liking locally

const updatedLikes = (currentLikes || 0) + 1;
const newLikedPlaceIds = [...likedPlaceIds, placeId];

// Optimistic UI Update
setPlaces((prevPlaces) =>
  prevPlaces.map((p) => (p.id === placeId ? { ...p, likes: updatedLikes } : p))
);
setLikedPlaceIds(newLikedPlaceIds);

try {
  localStorage.setItem('kin_liked_places', JSON.stringify(newLikedPlaceIds));
  await supabase.from('places').update({ likes: updatedLikes }).eq('id', placeId);
} catch (err) {
  console.error('Error updating likes:', err);
}


};

// Toggle Comment Box & Fetch Comments for a Place
const toggleComments = async (placeId: number) => {
if (activeCommentsPlaceId === placeId) {
setActiveCommentsPlaceId(null);
return;
}

setActiveCommentsPlaceId(placeId);

// Fetch comments if not loaded yet
if (!commentsMap[placeId]) {
  const { data } = await supabase
    .from('comments')
    .select('*')
    .eq('place_id', placeId)
    .order('created_at', { ascending: false });

  setCommentsMap((prev) => ({ ...prev, [placeId]: data || [] }));
}


};

// Submit a New Comment
const handleAddComment = async (placeId: number, e: React.FormEvent) => {
e.preventDefault();
if (!newCommentText.trim()) return;

setIsSubmittingComment(true);
const author = newCommentAuthor.trim() || 'Kinois';
const text = newCommentText.trim();

try {
  const { data, error } = await supabase
    .from('comments')
    .insert([{ place_id: placeId, author_name: author, comment_text: text }])
    .select();

  if (!error && data) {
    setCommentsMap((prev) => ({
      ...prev,
      [placeId]: [data[0], ...(prev[placeId] || [])]
    }));
    setNewCommentText('');
  }
} catch (err) {
  console.error('Error adding comment:', err);
} finally {
  setIsSubmittingComment(false);
}


};

// Render Markers on Map
useEffect(() => {
if (!map.current) return;

markersRef.current.forEach((marker) => marker.remove());
markersRef.current = [];

const bounds = new maplibregl.LngLatBounds();
let hasValidCoords = false;

places.forEach((place) => {
  const fallback = getFallbackCoordinates(place.commune);
  const lat = place.lat ? parseFloat(place.lat) : fallback.lat;
  const lng = place.lng ? parseFloat(place.lng) : fallback.lng;

  hasValidCoords = true;
  bounds.extend([lng, lat]);

  const el = document.createElement('div');
  const isFood = place.vertical === 'kin_food';
  const isCulture = place.vertical === 'kin_culture';
  const isStyle = place.vertical === 'kin_style';
  const pinColor = isFood ? '#22c55e' : isCulture ? '#f59e0b' : isStyle ? '#ec4899' : '#38bdf8';
  const pinIcon = isFood ? '🍔' : isCulture ? '🎨' : isStyle ? '👗' : '📍';

  el.style.backgroundColor = '#020617';
  el.style.border = `2px solid ${pinColor}`;
  el.style.borderRadius = '20px';
  el.style.padding = '4px 8px';
  el.style.color = '#ffffff';
  el.style.fontSize = '10px';
  el.style.fontWeight = 'bold';
  el.style.cursor = 'pointer';
  el.style.boxShadow = `0 0 10px ${pinColor}88`;
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.gap = '4px';
  el.style.whiteSpace = 'nowrap';

  el.innerHTML = `<span>${pinIcon}</span> <span>${place.name}</span> <span style="color:#ef4444;">❤️ ${place.likes || 0}</span>`;

  const imageHtml = place.image_url ? 
    `<img src="${place.image_url}" alt="${place.name}" style="width: 100%; height: 80px; object-fit: cover; border-radius: 6px; margin: 6px 0;" />` : '';

  const mapsLinkHtml = place.google_maps_url ? 
    `<a href="${place.google_maps_url}" target="_blank" rel="noopener noreferrer" style="display: inline-block; margin-top: 4px; font-size: 11px; font-weight: bold; color: #2563eb; text-decoration: none;">📍 Google Maps Itinéraire →</a>` : '';

  const popupHtml = `
    <div style="color: #0f172a; font-family: system-ui, sans-serif; padding: 2px; max-width: 200px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 9px; font-weight: bold; color: #2563eb; text-transform: uppercase;">
          ★ ${place.commune}
        </span>
        <span style="font-size: 10px; font-weight: bold; color: #ef4444;">❤️ ${place.likes || 0}</span>
      </div>
      <h4 style="margin: 2px 0; font-size: 13px; font-weight: 800; color: #020617;">${place.name}</h4>
      ${imageHtml}
      <p style="margin: 0; font-size: 11px; color: #334155;">${place.description || ''}</p>
      ${mapsLinkHtml}
    </div>
  `;

  const popup = new maplibregl.Popup({ offset: 25, closeButton: false }).setHTML(popupHtml);

  const marker = new maplibregl.Marker({ element: el })
    .setLngLat([lng, lat])
    .setPopup(popup)
    .addTo(map.current!);

  markersRef.current.push(marker);
});

if (hasValidCoords && map.current && places.length > 0) {
  map.current.fitBounds(bounds, { padding: 60, maxZoom: 14 });
}


}, [places, likedPlaceIds]);

return (
<main style={{ backgroundColor: '#020617', color: '#f8fafc', minHeight: '100vh', padding: '12px', fontFamily: 'system-ui, sans-serif' }}>

  {/* Mobile Styles */}
  <style jsx global>{`
    .nav-header { display: flex; justify-content: space-between; align-items: center; max-width: 1650px; margin: 0 auto 16px auto; border-bottom: 1px solid #1e293b; padding-bottom: 12px; gap: 12px; }
    .hero-banner { max-width: 1650px; margin: 0 auto 16px auto; background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
    .main-layout-grid { display: grid; grid-template-columns: minmax(0, 7fr) minmax(340px, 4.5fr); gap: 16px; max-width: 1650px; margin: 0 auto; }
    .map-frame { width: 100%; height: 500px; border-radius: 12px; overflow: hidden; }
    .place-card-item { background-color: #020617; border: 1px solid #1e293b; border-radius: 10px; padding: 12px; margin-bottom: 12px; }

    @media (max-width: 900px) {
      .nav-header { flex-direction: column; align-items: flex-start; }
      .hero-banner { flex-direction: column; align-items: flex-start; }
      .main-layout-grid { grid-template-columns: 1fr; }
      .map-frame { height: 350px; }
      .place-card-main { flex-direction: column; }
      .place-card-image { width: 100% !important; height: 160px !important; }
    }
  `}</style>

  {/* Header */}
  <nav className="nav-header">
    <div>
      <span style={{ fontSize: '10px', color: '#38bdf8', fontWeight: 'bold', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Le Média-Guide de Recommandation</span>
      <h1 style={{ fontSize: '20px', fontWeight: '900', color: '#ffffff', margin: 0 }}>KINSHASA LABEL</h1>
    </div>

    <Link href="/backoffice" style={{ backgroundColor: '#2563eb', color: '#ffffff', padding: '8px 14px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase' }}>
      + Proposer un Lieu
    </Link>
  </nav>

  {/* Hero Banner */}
  <div className="hero-banner">
    <div>
      <span style={{ backgroundColor: '#dc2626', color: '#fff', fontSize: '9px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', marginRight: '8px' }}>#001</span>
      <strong style={{ fontSize: '13px', color: '#ffffff' }}>"Tu Connais Kin ?" — Guide Curation des 100 Meilleurs Lieux</strong>
    </div>
    <span style={{ color: '#38bdf8', fontSize: '11px', fontWeight: 'bold' }}>Recommandé ★</span>
  </div>

  {/* Filter Bar */}
  <div style={{ maxWidth: '1650px', margin: '0 auto 16px auto', display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
    {VERTICALS.map((v) => (
      <button
        key={v.id}
        onClick={() => setActiveVertical(v.id)}
        style={{
          backgroundColor: activeVertical === v.id ? '#2563eb' : '#0f172a',
          color: '#ffffff',
          border: '1px solid #1e293b',
          padding: '8px 14px',
          borderRadius: '20px',
          fontSize: '11px',
          fontWeight: 'bold',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          flexShrink: 0
        }}
      >
        {v.label}
      </button>
    ))}
  </div>

  {/* Main Grid */}
  <div className="main-layout-grid">
    
    {/* MAP */}
    <section style={{ backgroundColor: '#0f172a', borderRadius: '14px', border: '1px solid #1e293b', padding: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
        <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>
          Carte ({markersRef.current.length} Marqueurs Visibles)
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 'bold' }}>
            {selectedCommune ? `Commune: ${selectedCommune}` : 'Tout Kinshasa'}
          </span>
          {selectedCommune && (
            <button
              onClick={() => setSelectedCommune(null)}
              style={{ backgroundColor: '#1e293b', color: '#38bdf8', border: '1px solid #334155', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Afficher Tout Kinshasa
            </button>
          )}
        </div>
      </div>
      <div ref={mapContainer} className="map-frame" />
    </section>

    {/* LISTINGS */}
    <section style={{ backgroundColor: '#0f172a', borderRadius: '14px', border: '1px solid #1e293b', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #1e293b', paddingBottom: '10px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#ffffff', margin: 0, textTransform: 'uppercase' }}>
            {selectedCommune ? selectedCommune : 'Tout Kinshasa'}
          </h2>
          <button
            onClick={() => setSelectedCommune(selectedCommune ? null : 'Gombe')}
            style={{ backgroundColor: selectedCommune === null ? '#2563eb' : '#020617', color: '#ffffff', border: '1px solid #334155', padding: '5px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            {selectedCommune === null ? '📍 Filtrer Gombe' : '🌍 Voir Tout Kinshasa'}
          </button>
        </div>

        {/* KIN WEEKEND */}
        {(activeVertical === 'all' || activeVertical === 'kin_weekend') && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '11px', color: '#a855f7', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #1e293b', paddingBottom: '4px', marginBottom: '10px' }}>
              🎉 KIN WEEKEND ({weekendEvents.length})
            </h3>
            {weekendEvents.length === 0 ? (
              <p style={{ fontSize: '11px', color: '#64748b' }}>Aucun événement ce weekend.</p>
            ) : (
              weekendEvents.map((evt) => (
                <div key={evt.id} style={{ backgroundColor: '#020617', border: '1px solid #a855f7', borderRadius: '8px', padding: '10px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '9px', color: '#a855f7', fontWeight: 'bold', textTransform: 'uppercase' }}>● {evt.category} ({evt.commune})</span>
                  <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff', margin: '2px 0' }}>{evt.title}</h4>
                  <p style={{ fontSize: '11px', color: '#cbd5e1', margin: 0 }}>{evt.description}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* 100 KIN PLACES */}
        {activeVertical !== 'kin_weekend' && (
          <div>
            <h3 style={{ fontSize: '11px', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #1e293b', paddingBottom: '4px', marginBottom: '10px' }}>
              📍 Sélection 100 KIN ({places.length})
            </h3>
            {places.length === 0 ? (
              <p style={{ fontSize: '11px', color: '#64748b' }}>Aucun lieu certifié enregistré.</p>
            ) : (
              places.map((place) => {
                const isLiked = likedPlaceIds.includes(place.id);
                const comments = commentsMap[place.id] || [];
                const isCommentsOpen = activeCommentsPlaceId === place.id;

                return (
                  <div key={place.id} className="place-card-item">
                    <div className="place-card-main" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      {place.image_url && (
                        <img 
                          src={place.image_url} 
                          alt={place.name} 
                          className="place-card-image"
                          style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} 
                        />
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                          <span style={{ fontSize: '9px', color: '#22c55e', fontWeight: 'bold', textTransform: 'uppercase' }}>★ {place.commune}</span>
                          <span style={{ fontSize: '10px', color: '#eab308', fontWeight: 'bold' }}>{place.budget}</span>
                        </div>
                        <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff', margin: '0 0 2px 0' }}>{place.name}</h4>
                        <p style={{ fontSize: '11px', color: '#cbd5e1', margin: '0 0 6px 0' }}>{place.description}</p>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '6px' }}>
                          {/* LIKE BUTTON */}
                          <button
                            onClick={() => handleLikePlace(place.id, place.likes || 0)}
                            disabled={isLiked}
                            style={{
                              backgroundColor: isLiked ? 'rgba(239, 68, 68, 0.2)' : '#0f172a',
                              color: isLiked ? '#ef4444' : '#f8fafc',
                              border: `1px solid ${isLiked ? '#ef4444' : '#334155'}`,
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              cursor: isLiked ? 'default' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            {isLiked ? '❤️ Aimé' : '🤍 J\'aime'} ({place.likes || 0})
                          </button>

                          {/* COMMENTS TOGGLE */}
                          <button
                            onClick={() => toggleComments(place.id)}
                            style={{
                              backgroundColor: '#0f172a',
                              color: '#38bdf8',
                              border: '1px solid #334155',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            💬 Avis {comments.length > 0 ? `(${comments.length})` : ''}
                          </button>

                          {place.google_maps_url && (
                            <a href={place.google_maps_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '10px', color: '#38bdf8', fontWeight: 'bold', textDecoration: 'none', marginLeft: 'auto' }}>
                              📍 Google Maps →
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* EXPANDABLE COMMENTS DRAWER */}
                    {isCommentsOpen && (
                      <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #1e293b' }}>
                        <form onSubmit={(e) => handleAddComment(place.id, e)} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                          <input
                            type="text"
                            placeholder="Votre nom (ex: Glody)"
                            value={newCommentAuthor}
                            onChange={(e) => setNewCommentAuthor(e.target.value)}
                            style={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '6px 10px', borderRadius: '6px', fontSize: '11px' }}
                          />
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <input
                              type="text"
                              placeholder="Laissez votre avis..."
                              value={newCommentText}
                              onChange={(e) => setNewCommentText(e.target.value)}
                              required
                              style={{ flex: 1, backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '6px 10px', borderRadius: '6px', fontSize: '11px' }}
                            />
                            <button
                              type="submit"
                              disabled={isSubmittingComment}
                              style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                              {isSubmittingComment ? '...' : 'Envoyer'}
                            </button>
                          </div>
                        </form>

                        {/* COMMENTS LIST */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                          {comments.length === 0 ? (
                            <p style={{ fontSize: '10px', color: '#64748b', fontStyle: 'italic', margin: 0 }}>Soyez le premier à donner votre avis !</p>
                          ) : (
                            comments.map((c) => (
                              <div key={c.id} style={{ backgroundColor: '#0f172a', padding: '6px 10px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#38bdf8', fontWeight: 'bold' }}>
                                  <span>👤 {c.author_name || 'Visiteur'}</span>
                                  <span style={{ color: '#64748b' }}>{new Date(c.created_at).toLocaleDateString('fr-FR')}</span>
                                </div>
                                <p style={{ fontSize: '11px', color: '#cbd5e1', margin: '2px 0 0 0' }}>{c.comment_text}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <Link 
        href={selectedCommune ? `/commune/${encodeURIComponent(selectedCommune)}` : `/commune/Gombe`} 
        style={{ display: 'block', textAlign: 'center', backgroundColor: '#2563eb', color: '#ffffff', padding: '12px', borderRadius: '8px', fontWeight: 'bold', textDecoration: 'none', fontSize: '12px', marginTop: '16px' }}
      >
        {selectedCommune ? `Guide de ${selectedCommune} →` : 'Guide de Gombe →'}
      </Link>
    </section>

  </div>
</main>


);
}


