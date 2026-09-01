'use client';
import { useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { supabase } from '../lib/supabase';
import { escapeHtml } from '../lib/html';
import communesData from '../data/communes.json';
import { IconHeart, IconThumbsDown, IconChat, IconExternalLink, IconUser, IconPin, IconGlobe } from '../components/icons';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { Button } from '../components/Button';

const VERTICALS = [
  { id: 'all', label: 'TOUT KIN' },
  { id: 'kin_food', label: 'KIN FOOD' },
  { id: 'kin_places', label: 'KIN PLACES' },
  { id: 'kin_culture', label: 'KIN CULTURE' },
  { id: 'kin_style', label: 'KIN STYLE' },
  { id: 'kin_weekend', label: 'KIN WEEKEND' }
];

// Small inline SVG markup (string form) for the raw-HTML MapLibre
// marker/popup content, which cannot use Tailwind classes or JSX.
const HEART_SVG = (color: string) =>
  `<svg width="11" height="11" viewBox="0 0 24 24" fill="${color}" stroke="${color}" stroke-width="2" style="vertical-align:-1px;"><path d="M12 20.5s-7-4.35-9.5-8.8C.9 8.6 2.3 5 5.7 5c1.9 0 3.3 1 4.3 2.5C11 6 12.4 5 14.3 5c3.4 0 4.8 3.6 3.2 6.7C19 16.15 12 20.5 12 20.5Z"/></svg>`;

const THUMBS_DOWN_SVG = (color: string) =>
  `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;"><path d="M7 14V4M3 4h3.2c.4 0 .8.1 1.1.3l4.4 2c.3.1.7.2 1.1.2h4.4a2 2 0 0 1 2 2.3l-1 6a2 2 0 0 1-2 1.7H9"/></svg>`;

// MapLibre style object: plain raster tiles from Esri's free, no-API-key
// "World Dark Gray" basemap (base + labels reference layer). The app
// previously pointed at CARTO's hosted GL vector style
// (basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json); that style's
// metadata still loads, but CARTO now gates the actual tile pixels behind
// a required API key, so the map rendered with markers floating over a
// blank background in production. Esri's raster tiles need no key and
// verified working end-to-end against real Kinshasa coordinates.
const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'esri-dark-gray-base': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: 'Tiles &copy; Esri',
    },
    'esri-dark-gray-labels': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
    },
  },
  layers: [
    { id: 'esri-dark-gray-base-layer', type: 'raster', source: 'esri-dark-gray-base' },
    { id: 'esri-dark-gray-labels-layer', type: 'raster', source: 'esri-dark-gray-labels' },
  ],
  // MapLibre's own public demo glyph server — needed for the commune name
  // labels below (text layers render nothing without a `glyphs` source).
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
};

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
  const [dislikedPlaceIds, setDislikedPlaceIds] = useState<number[]>([]);
  const [activeCommentsPlaceId, setActiveCommentsPlaceId] = useState<number | null>(null);
  const [commentsMap, setCommentsMap] = useState<{ [key: number]: any[] }>({});
  const [newCommentAuthor, setNewCommentAuthor] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Load liked/disliked places from localStorage on initial render
  useEffect(() => {
    try {
      const savedLikes = localStorage.getItem('kin_liked_places');
      if (savedLikes) {
        setLikedPlaceIds(JSON.parse(savedLikes));
      }
      const savedDislikes = localStorage.getItem('kin_disliked_places');
      if (savedDislikes) {
        setDislikedPlaceIds(JSON.parse(savedDislikes));
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
      style: MAP_STYLE,
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
          'fill-extrusion-color': '#14294A',
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-opacity': 0.65
        }
      });

      // Visible commune boundary outline — the fill-extrusion layer above
      // has no stroke of its own, so adjacent communes were hard to tell
      // apart against the new basemap. A distinct gold border fixes that.
      map.current.addLayer({
        id: 'communes-border',
        type: 'line',
        source: 'communes-geojson',
        paint: {
          'line-color': '#C8992E',
          'line-width': 1.5,
          'line-opacity': 0.9
        }
      });

      // Commune name labels so each shape is identifiable at a glance.
      map.current.addLayer({
        id: 'communes-label',
        type: 'symbol',
        source: 'communes-geojson',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 11,
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.05
        },
        paint: {
          'text-color': '#F4F1E9',
          'text-halo-color': '#0B1E3A',
          'text-halo-width': 1.4
        }
      });

      map.current.on('click', 'communes-layer', (e) => {
        if (e.features && e.features[0]) {
          const name = e.features[0].properties?.name;
          if (name) setSelectedCommune(name);
        }
      });

      map.current.on('mouseenter', 'communes-layer', () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      });
      map.current.on('mouseleave', 'communes-layer', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
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

  // Handle Dislike Action — mirrors handleLikePlace. Requires a `dislikes`
  // integer column on the `places` table (same pattern as `likes`); until
  // that column exists in Supabase, the UI count still updates locally but
  // the persisted update silently fails, exactly like every other
  // Supabase call in this file that doesn't check `error`.
  const handleDislikePlace = async (placeId: number, currentDislikes: number) => {
    if (dislikedPlaceIds.includes(placeId)) return;

    const updatedDislikes = (currentDislikes || 0) + 1;
    const newDislikedPlaceIds = [...dislikedPlaceIds, placeId];

    setPlaces((prevPlaces) =>
      prevPlaces.map((p) => (p.id === placeId ? { ...p, dislikes: updatedDislikes } : p))
    );
    setDislikedPlaceIds(newDislikedPlaceIds);

    try {
      localStorage.setItem('kin_disliked_places', JSON.stringify(newDislikedPlaceIds));
      await supabase.from('places').update({ dislikes: updatedDislikes }).eq('id', placeId);
    } catch (err) {
      console.error('Error updating dislikes:', err);
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
      const pinColor = isFood ? '#2F6B45' : isCulture ? '#C8992E' : isStyle ? '#6E4A63' : '#5FA8C9';

      el.style.backgroundColor = '#0B1E3A';
      el.style.border = `2px solid ${pinColor}`;
      el.style.borderRadius = '20px';
      el.style.padding = '4px 8px';
      el.style.color = '#F4F1E9';
      el.style.fontSize = '10px';
      el.style.fontWeight = 'bold';
      el.style.cursor = 'pointer';
      el.style.boxShadow = `0 0 10px ${pinColor}88`;
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.gap = '4px';
      el.style.whiteSpace = 'nowrap';

      el.innerHTML = `<span style="color:${pinColor};font-size:13px;line-height:1;">●</span> <span>${escapeHtml(place.name)}</span> <span style="color:#C4453A;display:inline-flex;align-items:center;gap:2px;">${HEART_SVG('#C4453A')}${place.likes || 0}</span>`;

      const imageHtml = place.image_url ?
        `<img src="${escapeHtml(place.image_url)}" alt="${escapeHtml(place.name)}" style="width: 100%; height: 80px; object-fit: cover; border-radius: 6px; margin: 6px 0; border: 1px solid #22385C;" />` : '';

      const mapsLinkHtml = place.google_maps_url ?
        `<a href="${escapeHtml(place.google_maps_url)}" target="_blank" rel="noopener noreferrer" style="display: inline-block; margin-top: 4px; font-size: 11px; font-weight: bold; color: #5FA8C9; text-decoration: none;">Google Maps Itinéraire →</a>` : '';

      const popupHtml = `
        <div style="color: #0B1E3A; font-family: system-ui, sans-serif; padding: 2px; max-width: 200px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 9px; font-weight: bold; color: #C8992E; text-transform: uppercase;">
              ★ ${escapeHtml(place.commune)}
            </span>
            <span style="font-size: 10px; font-weight: bold; color: #C4453A; display:inline-flex; align-items:center; gap:2px;">${HEART_SVG('#C4453A')}${place.likes || 0}</span>
          </div>
          <h4 style="margin: 2px 0; font-size: 13px; font-weight: 800; color: #0B1E3A;">${escapeHtml(place.name)}</h4>
          ${imageHtml}
          <p style="margin: 0; font-size: 11px; color: #5B5548;">${escapeHtml(place.description || '')}</p>
          <span style="display:inline-flex; align-items:center; gap:3px; font-size: 10px; font-weight: bold; color: #6b7280; margin-top: 4px;">${THUMBS_DOWN_SVG('#6b7280')}${place.dislikes || 0}</span>
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


  }, [places, likedPlaceIds, dislikedPlaceIds]);

  return (
    <main className="min-h-screen bg-brand-navy text-brand-cream flex flex-col">
      <SiteHeader />

      {/* HERO */}
      <section className="border-b border-brand-navy-border">
        <div className="max-w-[1650px] mx-auto px-4 md:px-6 py-10 md:py-16">
          <div className="flex flex-col gap-4 max-w-3xl">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-brand-gold-light">
              <span className="bg-brand-gold text-brand-navy text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                #001
              </span>
              &quot;Tu Connais Kin ?&quot; — Guide Curation des 100 Meilleurs Lieux
            </span>
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-semibold text-brand-cream leading-[1.05]">
              Le meilleur de Kinshasa,<br className="hidden md:block" /> commune par commune.
            </h1>
            <p className="text-base md:text-lg text-brand-cream/70 max-w-xl leading-relaxed">
              La sélection éditoriale des adresses, de la culture et des sorties du week-end à
              travers les communes de la capitale — sur une carte interactive.
            </p>
          </div>
        </div>
      </section>

      {/* EXPLORER / FILTER TABS */}
      <section id="explorer" className="max-w-[1650px] mx-auto px-4 md:px-6 pt-8 w-full">
        <h2 className="text-xs uppercase tracking-wide text-brand-muted font-semibold mb-3">
          Explorer par catégorie
        </h2>
        <div className="flex gap-6 md:gap-8 overflow-x-auto border-b border-brand-navy-border">
          {VERTICALS.map((v) => (
            <button
              key={v.id}
              onClick={() => setActiveVertical(v.id)}
              className={`shrink-0 whitespace-nowrap pb-3 text-sm font-semibold border-b-2 -mb-px transition-colors cursor-pointer ${
                activeVertical === v.id
                  ? 'text-brand-gold border-brand-gold'
                  : 'text-brand-cream/55 border-transparent hover:text-brand-cream'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </section>

      {/* MAIN GRID: MAP + LISTINGS */}
      <section className="max-w-[1650px] mx-auto px-4 md:px-6 py-8 w-full flex-1">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,7fr)_minmax(340px,4.5fr)]">

          {/* MAP */}
          <div className="bg-brand-navy-light rounded-2xl border border-brand-navy-border p-3.5 md:p-4">
            <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
              <span className="text-xs text-brand-muted uppercase font-semibold tracking-wide">
                Carte ({places.length} marqueurs visibles)
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-brand-green font-semibold">
                  {selectedCommune ? `Commune : ${selectedCommune}` : 'Tout Kinshasa'}
                </span>
                {selectedCommune && (
                  <Button variant="secondary" size="sm" onClick={() => setSelectedCommune(null)}>
                    Afficher Tout Kinshasa
                  </Button>
                )}
              </div>
            </div>
            <div ref={mapContainer} className="w-full h-[350px] rounded-xl overflow-hidden md:h-[560px]" />
          </div>

          {/* LISTINGS — editorial feed, not stacked boxes */}
          <div className="flex flex-col">
            <div className="flex justify-between items-baseline mb-4 pb-4 border-b border-brand-navy-border">
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-brand-cream">
                {selectedCommune ? selectedCommune : 'Tout Kinshasa'}
              </h2>
              <button
                onClick={() => setSelectedCommune(selectedCommune ? null : 'Gombe')}
                className={`inline-flex items-center gap-1 text-xs font-semibold cursor-pointer transition-colors ${
                  selectedCommune === null ? 'text-brand-gold' : 'text-brand-cream/70 hover:text-brand-gold'
                }`}
              >
                {selectedCommune === null ? (<><IconPin size={12} /> Filtrer Gombe</>) : (<><IconGlobe size={12} /> Voir Tout Kinshasa</>)}
              </button>
            </div>

            {/* KIN WEEKEND */}
            {(activeVertical === 'all' || activeVertical === 'kin_weekend') && (
              <div id="kin-weekend" className="mb-7">
                <h3 className="text-xs text-brand-plum uppercase tracking-wide font-semibold mb-3">
                  Kin Weekend ({weekendEvents.length})
                </h3>
                {weekendEvents.length === 0 ? (
                  <p className="text-sm text-brand-muted">Aucun événement ce weekend.</p>
                ) : (
                  <div className="flex flex-col divide-y divide-brand-navy-border">
                    {weekendEvents.map((evt) => (
                      <div key={evt.id} className="py-3 pl-3 border-l-2 border-brand-plum">
                        <span className="text-[11px] text-brand-plum font-semibold uppercase tracking-wide">
                          {evt.category} · {evt.commune}
                        </span>
                        <h4 className="text-sm font-semibold text-brand-cream mt-0.5 mb-1">{evt.title}</h4>
                        <p className="text-sm text-brand-cream/60 m-0 leading-relaxed">{evt.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 100 KIN PLACES */}
            {activeVertical !== 'kin_weekend' && (
              <div>
                <h3 className="text-xs text-brand-river uppercase tracking-wide font-semibold mb-3">
                  Sélection 100 Kin ({places.length})
                </h3>
                {places.length === 0 ? (
                  <p className="text-sm text-brand-muted">Aucun lieu certifié enregistré.</p>
                ) : (
                  <div className="flex flex-col divide-y divide-brand-navy-border">
                    {places.map((place) => {
                      const isLiked = likedPlaceIds.includes(place.id);
                      const isDisliked = dislikedPlaceIds.includes(place.id);
                      const comments = commentsMap[place.id] || [];
                      const isCommentsOpen = activeCommentsPlaceId === place.id;

                      return (
                        <div key={place.id} className="py-4">
                          <div className="flex flex-col gap-4 items-start md:flex-row">
                            {place.image_url && (
                              <img
                                src={place.image_url}
                                alt={place.name}
                                className="w-full h-48 object-cover rounded-lg shrink-0 md:w-32 md:h-32"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center gap-2 mb-1">
                                <span className="text-[11px] text-brand-green font-semibold uppercase tracking-wide">
                                  {place.commune}
                                </span>
                                <span className="text-xs text-brand-gold-light font-semibold shrink-0">{place.budget}</span>
                              </div>
                              <h4 className="font-display text-lg font-semibold text-brand-cream mb-1">{place.name}</h4>
                              <p className="text-sm text-brand-cream/65 leading-relaxed mb-2.5">{place.description}</p>

                              <div className="flex items-center gap-2.5 flex-wrap">
                                {/* LIKE BUTTON */}
                                <button
                                  onClick={() => handleLikePlace(place.id, place.likes || 0)}
                                  disabled={isLiked}
                                  className={`inline-flex items-center gap-1 border px-2.5 py-1 rounded-full text-xs font-semibold ${
                                    isLiked
                                      ? 'bg-brand-danger/20 text-brand-danger border-brand-danger cursor-default'
                                      : 'bg-brand-navy-light text-brand-cream border-brand-navy-border cursor-pointer hover:border-brand-danger'
                                  }`}
                                >
                                  <IconHeart size={13} filled={isLiked} />
                                  {isLiked ? 'Aimé' : "J'aime"} ({place.likes || 0})
                                </button>

                                {/* DISLIKE BUTTON */}
                                <button
                                  onClick={() => handleDislikePlace(place.id, place.dislikes || 0)}
                                  disabled={isDisliked}
                                  className={`inline-flex items-center gap-1 border px-2.5 py-1 rounded-full text-xs font-semibold ${
                                    isDisliked
                                      ? 'bg-brand-navy-border text-brand-muted border-brand-navy-border cursor-default'
                                      : 'bg-brand-navy-light text-brand-cream/70 border-brand-navy-border cursor-pointer hover:border-brand-muted'
                                  }`}
                                >
                                  <IconThumbsDown size={13} />
                                  ({place.dislikes || 0})
                                </button>

                                {/* COMMENTS TOGGLE */}
                                <button
                                  onClick={() => toggleComments(place.id)}
                                  className="inline-flex items-center gap-1 bg-brand-navy-light text-brand-river border border-brand-navy-border px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer hover:border-brand-river"
                                >
                                  <IconChat size={13} />
                                  Avis {comments.length > 0 ? `(${comments.length})` : ''}
                                </button>

                                {place.google_maps_url && (
                                  <a href={place.google_maps_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-brand-river font-semibold no-underline ml-auto hover:text-brand-gold-light">
                                    <IconExternalLink size={11} /> Google Maps
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* EXPANDABLE COMMENTS DRAWER */}
                          {isCommentsOpen && (
                            <div className="mt-3 pt-3 border-t border-brand-navy-border">
                              <form onSubmit={(e) => handleAddComment(place.id, e)} className="flex flex-col gap-2 mb-2.5">
                                <input
                                  type="text"
                                  placeholder="Votre nom (ex: Glody)"
                                  value={newCommentAuthor}
                                  onChange={(e) => setNewCommentAuthor(e.target.value)}
                                  className="bg-brand-navy-light border border-brand-navy-border text-brand-cream px-2.5 py-1.5 rounded-md text-sm placeholder:text-brand-muted focus:outline-none focus:border-brand-gold"
                                />
                                <div className="flex gap-1.5">
                                  <input
                                    type="text"
                                    placeholder="Laissez votre avis..."
                                    value={newCommentText}
                                    onChange={(e) => setNewCommentText(e.target.value)}
                                    required
                                    className="flex-1 bg-brand-navy-light border border-brand-navy-border text-brand-cream px-2.5 py-1.5 rounded-md text-sm placeholder:text-brand-muted focus:outline-none focus:border-brand-gold"
                                  />
                                  <Button type="submit" disabled={isSubmittingComment} variant="primary" size="sm">
                                    {isSubmittingComment ? '...' : 'Envoyer'}
                                  </Button>
                                </div>
                              </form>

                              {/* COMMENTS LIST */}
                              <div className="flex flex-col gap-1.5 max-h-[150px] overflow-y-auto">
                                {comments.length === 0 ? (
                                  <p className="text-xs text-brand-muted italic m-0">Soyez le premier à donner votre avis !</p>
                                ) : (
                                  comments.map((c) => (
                                    <div key={c.id} className="bg-brand-navy-light px-2.5 py-1.5 rounded-md border border-brand-navy-border">
                                      <div className="flex justify-between text-[11px] text-brand-river font-semibold">
                                        <span className="inline-flex items-center gap-1"><IconUser size={11} /> {c.author_name || 'Visiteur'}</span>
                                        <span className="text-brand-muted">{new Date(c.created_at).toLocaleDateString('fr-FR')}</span>
                                      </div>
                                      <p className="text-sm text-brand-cream/80 mt-0.5 mb-0">{c.comment_text}</p>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <Button
              href={selectedCommune ? `/commune/${encodeURIComponent(selectedCommune)}` : `/commune/Gombe`}
              variant="primary"
              size="lg"
              fullWidth
              className="mt-6"
            >
              {selectedCommune ? `Guide de ${selectedCommune}` : 'Guide de Gombe'} →
            </Button>
          </div>

        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
