'use client';
import { useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { supabase } from '../lib/supabase';
import { escapeHtml } from '../lib/html';
import communesData from '../data/communes.json';
import { IconStar, IconChat, IconExternalLink, IconUser, IconPin, IconGlobe } from '../components/icons';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { Button } from '../components/Button';
import { TRAFFIC_LEVELS, TRAFFIC_COLORS, TRAFFIC_LABELS, DEFAULT_COMMUNE_COLOR, TRAFFIC_FILL_EXPRESSION } from '../lib/traffic';

const VERTICALS = [
  { id: 'all', label: 'TOUT KIN' },
  { id: 'kin_food', label: 'KIN FOOD' },
  { id: 'kin_places', label: 'KIN PLACES' },
  { id: 'kin_culture', label: 'KIN CULTURE' },
  { id: 'kin_style', label: 'KIN STYLE' },
  { id: 'kin_securite', label: 'KIN SÉCURITÉ' },
  { id: 'kin_traffic', label: 'KIN TRAFFIC' },
  { id: 'kin_weekend', label: 'KIN WEEKEND' }
];

// Small inline SVG markup (string form) for the raw-HTML MapLibre
// marker/popup content, which cannot use Tailwind classes or JSX. A
// filled gold star, used for the average-rating display.
const STAR_SVG = (color: string) =>
  `<svg width="11" height="11" viewBox="0 0 24 24" fill="${color}" stroke="${color}" stroke-width="1" style="vertical-align:-1px;"><path d="M12 3.2 14.7 9l6.3.6-4.8 4.2 1.4 6.2L12 16.9l-5.6 3.1 1.4-6.2-4.8-4.2L9.3 9Z"/></svg>`;

// A place's average rating out of 5, from the running rating_sum /
// rating_count kept on the row — not stored per vote, to match the app's
// existing lightweight schema (same shape as the old likes/dislikes
// counters). Returns null when nobody has rated it yet.
function getAverageRating(place: { rating_sum?: number; rating_count?: number }): number | null {
  const count = place.rating_count || 0;
  if (count <= 0) return null;
  return (place.rating_sum || 0) / count;
}

function formatRatingLabel(place: { rating_sum?: number; rating_count?: number }): string {
  const avg = getAverageRating(place);
  const count = place.rating_count || 0;
  return avg === null ? 'Non noté' : `${avg.toFixed(1)} (${count})`;
}

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
  const [mapLoaded, setMapLoaded] = useState(false);

  // Rating & Comments State. Replaces the earlier like/dislike counters
  // with a single 1-5 star rating per place, per client feedback — a
  // 5-star scale already covers the full range from bad to great, so a
  // separate dislike count became redundant.
  const [ratedPlaceIds, setRatedPlaceIds] = useState<number[]>([]);
  const [activeCommentsPlaceId, setActiveCommentsPlaceId] = useState<number | null>(null);
  const [commentsMap, setCommentsMap] = useState<{ [key: number]: any[] }>({});
  const [newCommentAuthor, setNewCommentAuthor] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Load already-rated places from localStorage on initial render (guards
  // against rating the same place twice from the same browser — same
  // pattern the old like/dislike guard used).
  useEffect(() => {
    try {
      const savedRatings = localStorage.getItem('kin_rated_places');
      if (savedRatings) {
        setRatedPlaceIds(JSON.parse(savedRatings));
      }
    } catch (e) {
      console.error('Could not read ratings from localStorage', e);
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

      setMapLoaded(true);
    });


  }, []);

  // Kin Traffic: color each commune shape by its indicative congestion
  // level instead of the flat navy fill, and revert once another tab is
  // selected. A `setPaintProperty` call rather than re-adding the layer,
  // since the layer and its click/hover handlers are already wired up.
  useEffect(() => {
    if (!mapLoaded || !map.current) return;
    const fillColor = activeVertical === 'kin_traffic' ? TRAFFIC_FILL_EXPRESSION : DEFAULT_COMMUNE_COLOR;
    map.current.setPaintProperty('communes-layer', 'fill-extrusion-color', fillColor as any);
  }, [activeVertical, mapLoaded]);

  // Fetch places and events from Supabase
  useEffect(() => {
    const fetchData = async () => {
      // Kin Traffic isn't a places category — it colors the commune
      // shapes on the map instead of listing pins, so there's nothing to
      // query here.
      if (activeVertical === 'kin_traffic') {
        setPlaces([]);
        setWeekendEvents([]);
        return;
      }

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

  // Handle a 1-5 star rating submission. Stores a running sum + count on
  // the place (`rating_sum`/`rating_count`) rather than each individual
  // vote, matching the app's existing lightweight schema — the displayed
  // average is just rating_sum / rating_count. One rating per place per
  // browser, guarded by localStorage, same pattern as the old like guard.
  const handleRatePlace = async (placeId: number, value: number, currentSum: number, currentCount: number) => {
    if (ratedPlaceIds.includes(placeId)) return;

    const updatedSum = (currentSum || 0) + value;
    const updatedCount = (currentCount || 0) + 1;
    const newRatedPlaceIds = [...ratedPlaceIds, placeId];

    // Optimistic UI Update
    setPlaces((prevPlaces) =>
      prevPlaces.map((p) => (p.id === placeId ? { ...p, rating_sum: updatedSum, rating_count: updatedCount } : p))
    );
    setRatedPlaceIds(newRatedPlaceIds);

    try {
      localStorage.setItem('kin_rated_places', JSON.stringify(newRatedPlaceIds));
      await supabase.from('places').update({ rating_sum: updatedSum, rating_count: updatedCount }).eq('id', placeId);
    } catch (err) {
      console.error('Error updating rating:', err);
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
      const isSecurite = place.vertical === 'kin_securite';
      const pinColor = isFood ? '#2F6B45' : isCulture ? '#C8992E' : isStyle ? '#6E4A63' : isSecurite ? '#C4453A' : '#5FA8C9';

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

      el.innerHTML = `<span style="color:${pinColor};font-size:13px;line-height:1;">●</span> <span>${escapeHtml(place.name)}</span> <span style="color:#C8992E;display:inline-flex;align-items:center;gap:2px;">${STAR_SVG('#C8992E')}${formatRatingLabel(place)}</span>`;

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
            <span style="font-size: 10px; font-weight: bold; color: #C8992E; display:inline-flex; align-items:center; gap:2px;">${STAR_SVG('#C8992E')}${formatRatingLabel(place)}</span>
          </div>
          <h4 style="margin: 2px 0; font-size: 13px; font-weight: 800; color: #0B1E3A;">${escapeHtml(place.name)}</h4>
          ${imageHtml}
          <p style="margin: 0; font-size: 11px; color: #5B5548;">${escapeHtml(place.description || '')}</p>
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


  }, [places, ratedPlaceIds]);

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
                {activeVertical === 'kin_traffic'
                  ? 'Carte (niveaux de trafic par commune)'
                  : `Carte (${places.length} marqueurs visibles)`}
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

            {/* KIN TRAFFIC — indicative congestion legend, not a places list */}
            {activeVertical === 'kin_traffic' && (
              <div className="mb-7">
                <h3 className="text-xs text-brand-danger uppercase tracking-wide font-semibold mb-2">
                  Kin Traffic
                </h3>
                <p className="text-xs text-brand-muted mb-3 leading-relaxed">
                  Niveaux de circulation indicatifs par commune, basés sur les axes et carrefours
                  connus pour leurs embouteillages (ex. Boulevard du 30 Juin, Boulevard Lumumba,
                  Rond-Point Victoire). Ce ne sont pas des données de trafic en temps réel.
                </p>
                <div className="flex flex-col divide-y divide-brand-navy-border">
                  {Object.entries(TRAFFIC_LEVELS)
                    .filter(([name]) => !selectedCommune || name.toLowerCase() === selectedCommune.trim().toLowerCase())
                    .map(([name, level]) => (
                      <div key={name} className="flex items-center justify-between py-2.5">
                        <span className="text-sm text-brand-cream font-medium">{name}</span>
                        <span
                          className="inline-flex items-center gap-1.5 text-xs font-semibold"
                          style={{ color: TRAFFIC_COLORS[level] }}
                        >
                          <span
                            className="w-2 h-2 rounded-full inline-block"
                            style={{ backgroundColor: TRAFFIC_COLORS[level] }}
                          />
                          {TRAFFIC_LABELS[level]}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* 100 KIN PLACES */}
            {activeVertical !== 'kin_weekend' && activeVertical !== 'kin_traffic' && (
              <div>
                <h3 className="text-xs text-brand-river uppercase tracking-wide font-semibold mb-3">
                  Sélection 100 Kin ({places.length})
                </h3>
                {places.length === 0 ? (
                  <p className="text-sm text-brand-muted">Aucun lieu certifié enregistré.</p>
                ) : (
                  <div className="flex flex-col divide-y divide-brand-navy-border">
                    {places.map((place) => {
                      const isRated = ratedPlaceIds.includes(place.id);
                      const avgRating = getAverageRating(place);
                      const filledStars = avgRating !== null ? Math.round(avgRating) : 0;
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
                                {/* 1-5 STAR RATING */}
                                <div className="inline-flex items-center gap-2 border border-brand-navy-border bg-brand-navy-light px-2.5 py-1 rounded-full">
                                  <div className="inline-flex items-center gap-0.5" role="radiogroup" aria-label="Noter ce lieu">
                                    {[1, 2, 3, 4, 5].map((value) => (
                                      <button
                                        key={value}
                                        type="button"
                                        role="radio"
                                        aria-checked={value === filledStars}
                                        aria-label={`${value} étoile${value > 1 ? 's' : ''}`}
                                        disabled={isRated}
                                        onClick={() => handleRatePlace(place.id, value, place.rating_sum || 0, place.rating_count || 0)}
                                        className={isRated ? 'cursor-default' : 'cursor-pointer hover:scale-110 transition-transform'}
                                      >
                                        <IconStar
                                          size={14}
                                          filled={value <= filledStars}
                                          className={value <= filledStars ? 'text-brand-gold' : 'text-brand-muted/50'}
                                        />
                                      </button>
                                    ))}
                                  </div>
                                  <span className="text-xs font-semibold text-brand-cream/80">
                                    {avgRating !== null ? `${avgRating.toFixed(1)} (${place.rating_count})` : 'Soyez le premier'}
                                  </span>
                                </div>

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
