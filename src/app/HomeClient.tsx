'use client';
// Homepage (client part). The server page (page.tsx) renders it with the
// data already loaded, so search engines and link previews see real
// places and communes; the browser then refreshes everything once.
//
// Five blocks (client audit, 2026-10-08), with the existing look:
//   1. Hero carousel (banners + brand slides, "Surprends-moi")
//   2. Category tiles — each opens its own page (/food, /places…)
//   3. Interactive map with category chips
//   4. Six communes + "Voir les 24 communes"
//   5. Newsletter (in the footer)
// Optional: "Coups de cœur" when the team has picked places (Backoffice →
// Vitrine). Kin Actualité, Kin Weekend and the 24 communes have their own
// pages; nothing empty is ever shown.
import { useState, useEffect, useRef, useMemo, useCallback, Fragment, type ReactNode } from 'react';
import { loadSiteSettings, isBannerLive, sortBanners, type SiteSettings, type SectionId } from '../lib/siteSettings';
import Link from 'next/link';
import maplibregl from '../lib/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { supabase } from '../lib/supabase';
import { createPlacePin } from '../lib/mapPins';
import communesData from '../data/communes.json';
import { sameCommune, communeHref, canonicalCommune } from '../lib/communes';
import { WEEKEND_MIN, upcoming } from '../lib/events';
import { CATEGORIES, CATEGORY_PATH, categoryOf, getAverageRating } from '../lib/categories';
import { MAP_STYLE, PIN_COLORS } from '../lib/mapStyle';
import { TRAFFIC_LEVELS, TRAFFIC_COLORS, TRAFFIC_LABELS, DEFAULT_COMMUNE_COLOR, TRAFFIC_FILL_EXPRESSION } from '../lib/traffic';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { NewsletterPopup } from '../components/NewsletterPopup';
import { HeroCarousel } from '../components/HeroCarousel';
import { Carousel } from '../components/Carousel';
import { PlaceCard, CategoryIcon, PlaceImage } from '../components/PlaceCard';
import { PlaceSheet } from '../components/PlaceSheet';
import { CommuneCard } from '../components/CommuneCard';
import { SpinningWheel } from '../components/BrandMark';
import { useKinNews, NewsTicker, type InitialNews } from '../components/KinNews';
import { IconArrowRight, IconPin, IconGlobe, IconStar, IconClose } from '../components/icons';

const COMMUNES: { name: string; district: string; lat: number; lng: number }[] = (communesData as any).communes;

// Places without a position stay in the lists but get no pin (a pin in the
// middle of the commune would send people to the wrong street).
function coordsFor(place: any): [number, number] | null {
  if (place.lat && place.lng) return [parseFloat(place.lng), parseFloat(place.lat)];
  return null;
}


// Map chips: the place categories + traffic. (Actualité and Weekend have
// their own sections and pages.)
const MAP_FILTERS = [
  { id: 'all', label: 'Tout Kin' },
  ...CATEGORIES.filter((c) => !['kin_actualite', 'kin_weekend'].includes(c.id)).map((c) => ({ id: c.id, label: c.label })),
];

export type HomeInitial = {
  places: any[];
  events: any[];
  banners: any[];
  settings: SiteSettings;
  news: InitialNews;
};

// Six communes shown on the homepage: the ones with the most places, then
// the best-known ones (so the block is never empty, even before places).
const FEATURED_COMMUNES_FALLBACK = ['Gombe', 'Limete', 'Ngaliema', 'Bandalungwa', 'Kalamu', 'Lemba'];

export function HomeClient({ initial }: { initial: HomeInitial }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const [places, setPlaces] = useState<any[] | null>(initial.places);
  const [events, setEvents] = useState<any[]>(initial.events);
  const [banners, setBanners] = useState<any[]>(initial.banners);
  const [settings, setSettings] = useState<SiteSettings>(initial.settings);
  const [mapFilter, setMapFilter] = useState('all');
  const [selectedCommune, setSelectedCommune] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [openPlace, setOpenPlace] = useState<any | null>(null);

  const news = useKinNews(undefined, initial.news);
  const allNews = useMemo(() => [...news.pinned, ...news.live], [news.pinned, news.live]);

  // ---- data (refresh in the browser so backoffice changes show at once) ---
  useEffect(() => {
    supabase
      .from('places')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => setPlaces(data || []));
    supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: true })
      .then(({ data }) => setEvents(data || []));
    // All active banners become hero slides (previously only the newest one showed).
    supabase
      .from('banners')
      .select('*')
      .eq('active', true)
      .then(({ data }) => setBanners(data || []));
    loadSiteSettings().then(setSettings);
  }, []);

  // Scheduled (start/end dates) and ordered in Backoffice → Vitrine.
  const liveBanners = useMemo(() => sortBanners(banners.filter((b) => isBannerLive(b))), [banners]);

  // published === false = hidden in the backoffice (the team's session can read them; visitors can't).
  const placeList = useMemo(() => (places || []).filter((p) => p.published !== false), [places]);

  // Hand-picked in Backoffice → Vitrine → Coups de cœur.
  const featuredPlaces = useMemo(
    () => placeList.filter((p) => p.featured).sort((a, b) => (a.featured_rank ?? 0) - (b.featured_rank ?? 0)),
    [placeList]
  );
  const byCategory = useMemo(() => {
    const m: Record<string, any[]> = {};
    for (const p of placeList) (m[p.vertical] ||= []).push(p);
    return m;
  }, [placeList]);

  const mapPlaces = useMemo(
    () =>
      placeList.filter(
        (p) =>
          (mapFilter === 'all' || mapFilter === 'kin_traffic' ? true : p.vertical === mapFilter) &&
          (!selectedCommune || sameCommune(p.commune, selectedCommune))
      ),
    [placeList, mapFilter, selectedCommune]
  );

  const upcomingEvents = useMemo(() => upcoming(events), [events]);
  const weekendOn = upcomingEvents.length >= WEEKEND_MIN;

  const featuredCommunes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of placeList) {
      const c = canonicalCommune(p.commune);
      if (c) counts.set(c, (counts.get(c) || 0) + 1);
    }
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
    const names = [...new Set([...ranked, ...FEATURED_COMMUNES_FALLBACK])].slice(0, 6);
    return names.map((n) => COMMUNES.find((c) => sameCommune(c.name, n))!).filter(Boolean);
  }, [placeList]);

  const updatePlace = useCallback((updated: any) => {
    setPlaces((prev) => (prev || []).map((p) => (p.id === updated.id ? updated : p)));
  }, []);

  const closeSheet = useCallback(() => setOpenPlace(null), []);

  const surprise = useCallback(() => {
    if (!placeList.length) return;
    const pick = placeList[Math.floor(Math.random() * placeList.length)];
    setOpenPlace(pick);
  }, [placeList]);

  // "/?carte=kin_traffic#explorer" (from /traffic) opens the map on that filter.
  useEffect(() => {
    const f = new URLSearchParams(window.location.search).get('carte');
    if (f && MAP_FILTERS.some((m) => m.id === f)) setMapFilter(f);
  }, []);

  // ---- map ----------------------------------------------------------------
  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: [15.3057, -4.3245],
      zoom: 11.3,
      pitch: 40,
      bearing: -10,
      cooperativeGestures: true, // one-finger page scroll on phones doesn't get trapped by the map
    });
    map.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.current.on('load', () => {
      const m = map.current!;
      m.addSource('communes-geojson', { type: 'geojson', data: communesData as any });
      m.addLayer({
        id: 'communes-layer',
        type: 'fill-extrusion',
        source: 'communes-geojson',
        paint: {
          'fill-extrusion-color': DEFAULT_COMMUNE_COLOR,
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-opacity': 0.28,
        },
      });
      m.addLayer({
        id: 'communes-border',
        type: 'line',
        source: 'communes-geojson',
        paint: { 'line-color': '#0E5FC9', 'line-width': 1.2, 'line-opacity': 0.8 },
      });
      m.addLayer({
        id: 'communes-selected',
        type: 'line',
        source: 'communes-geojson',
        filter: ['==', ['get', 'name'], ''],
        paint: { 'line-color': '#D21C2E', 'line-width': 3.5 },
      });
      m.addLayer({
        id: 'communes-label',
        type: 'symbol',
        source: 'communes-geojson',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 11,
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.05,
        },
        paint: { 'text-color': '#0B2545', 'text-halo-color': '#FFFFFF', 'text-halo-width': 1.6 },
      });
      m.on('click', 'communes-layer', (e) => {
        const name = e.features?.[0]?.properties?.name;
        if (name) setSelectedCommune(name);
      });
      m.on('mouseenter', 'communes-layer', () => (m.getCanvas().style.cursor = 'pointer'));
      m.on('mouseleave', 'communes-layer', () => (m.getCanvas().style.cursor = ''));
      setMapLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!mapLoaded || !map.current) return;
    map.current.setPaintProperty(
      'communes-layer',
      'fill-extrusion-color',
      (mapFilter === 'kin_traffic' ? TRAFFIC_FILL_EXPRESSION : DEFAULT_COMMUNE_COLOR) as any
    );
    map.current.setPaintProperty('communes-layer', 'fill-extrusion-opacity', mapFilter === 'kin_traffic' ? 0.55 : 0.28);
    map.current.setFilter('communes-selected', ['==', ['get', 'name'], selectedCommune || '']);
  }, [mapFilter, selectedCommune, mapLoaded]);

  useEffect(() => {
    if (!map.current) return;
    markersRef.current.forEach((mk) => mk.remove());
    markersRef.current = [];
    if (mapFilter === 'kin_traffic') return;

    const bounds = new maplibregl.LngLatBounds();
    mapPlaces.forEach((place) => {
      const at = coordsFor(place);
      if (!at) return;
      const [lng, lat] = at;
      bounds.extend([lng, lat]);
      const color = PIN_COLORS[place.vertical] || '#1A82F5';
      const avg = getAverageRating(place);

      const el = createPlacePin({ name: place.name, color, rating: avg, onSelect: () => setOpenPlace(place) });

      markersRef.current.push(new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map.current!));
    });

    if (markersRef.current.length > 0) map.current.fitBounds(bounds, { padding: 70, maxZoom: 14, duration: 600 });
  }, [mapPlaces, mapFilter]);

  // ---- homepage sections (rendered in the order set in the backoffice) ---
  // ---- homepage sections (order and visibility: Backoffice → Vitrine) ---
  // Kin Weekend tile only once the programme has WEEKEND_MIN events; the
  // Actualité tile then spans two columns so the grid stays full.
  const tiles = CATEGORIES.filter((c) => c.id !== 'kin_weekend' || weekendOn);
  const sections: Record<SectionId, ReactNode> = {
    categories: (
      <>
        {/* 2. CATEGORY TILES — each one opens its own page */}
        <section aria-label="Catégories">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
            {tiles.map((c) => {
              const count =
                c.id === 'kin_actualite' ? allNews.length : c.id === 'kin_weekend' ? upcomingEvents.length : c.id === 'kin_traffic' ? 0 : (byCategory[c.id] || []).length;
              const wide = c.id === 'kin_actualite' && tiles.length % 2 === 1;
              return (
                <Link
                  key={c.id}
                  href={CATEGORY_PATH[c.id]}
                  className={`relative overflow-hidden flex flex-col gap-3 min-h-[132px] md:min-h-[156px] p-4 rounded-3xl no-underline shadow-card hover:shadow-lift hover:-translate-y-1 transition-all duration-200 text-left ${
                    c.id === 'kin_culture' ? 'text-brand-ink' : 'text-white'
                  } ${wide ? 'col-span-2' : ''}`}
                  style={{ background: c.gradient }}
                >
                  <span className="absolute -right-6 -bottom-6 opacity-25 pointer-events-none">
                    <SpinningWheel size={110} spin={false} />
                  </span>
                  <span className="w-11 h-11 rounded-2xl bg-white/25 inline-flex items-center justify-center">
                    <CategoryIcon id={c.id} size={22} />
                  </span>
                  <span className="mt-auto">
                    <span className="flex items-center gap-1.5 font-display text-lg md:text-xl font-extrabold leading-tight">
                      {c.id === 'kin_actualite' && <span className="relative inline-flex w-2 h-2"><span className="absolute inset-0 rounded-full bg-white animate-live-dot" /></span>}
                      {c.label}
                    </span>
                    <span className="block text-xs md:text-sm opacity-90 font-medium mt-0.5">{c.tagline}</span>
                  </span>
                  {count > 0 && (
                    <span className="absolute top-3 right-3 text-[11px] font-extrabold bg-white/90 text-brand-ink px-2 py-0.5 rounded-full">{count}</span>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      </>
    ),
    featured:
      featuredPlaces.length > 0 ? (
        <Carousel
          title={<>Coups de cœur <span className="text-brand-red">de la rédaction</span></>}
          subtitle="Notre sélection du moment à Kinshasa."
          eyebrow={<span className="inline-flex items-center gap-1 text-xs font-extrabold uppercase tracking-wider text-brand-red"><IconStar size={13} filled /> Sélection Kinshasa Label</span>}
        >
          {featuredPlaces.map((p) => (
            <PlaceCard key={p.id} place={p} onOpen={setOpenPlace} badge="Coup de cœur" />
          ))}
        </Carousel>
      ) : null,
    map: (
      <>
        {/* 3. MAP EXPLORER */}
        <section id="explorer" aria-labelledby="explorer-title">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4">
            <div>
              <h2 id="explorer-title" className="font-display text-3xl md:text-4xl font-extrabold text-brand-ink tracking-tight m-0">
                Explore Kin sur la carte
              </h2>
              <p className="text-brand-muted m-0 mt-1">Touche une commune pour filtrer, ou une épingle pour ouvrir le lieu.</p>
            </div>
            {selectedCommune && (
              <button
                type="button"
                onClick={() => setSelectedCommune(null)}
                className="self-start inline-flex items-center gap-1.5 bg-brand-red-soft text-brand-red font-bold text-sm px-4 py-2 rounded-full cursor-pointer hover:bg-brand-red hover:text-white"
              >
                <IconPin size={14} /> {selectedCommune} <IconClose size={14} />
              </button>
            )}
          </div>

          <div className="rail flex gap-2 overflow-x-auto pb-3 mb-2 -mx-4 px-4 md:mx-0 md:px-0">
            {MAP_FILTERS.map((f) => {
              const active = mapFilter === f.id;
              const cat = f.id === 'all' ? null : categoryOf(f.id);
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setMapFilter(f.id)}
                  aria-pressed={active}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold border-2 transition-colors cursor-pointer ${
                    active ? 'text-white border-transparent' : 'bg-white text-brand-ink border-brand-line hover:border-brand-blue'
                  }`}
                  style={active ? { background: cat ? cat.color : '#0B2545' } : undefined}
                >
                  {cat ? <CategoryIcon id={f.id} size={15} /> : <IconGlobe size={15} />} {f.label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-5 [&>*]:min-w-0 lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
            <div className="bg-white rounded-3xl border border-brand-line shadow-card p-2.5">
              <div ref={mapContainer} className="w-full h-[380px] md:h-[560px] rounded-2xl overflow-hidden" />
            </div>

            <div className="bg-white rounded-3xl border border-brand-line shadow-card p-4 md:p-5 flex flex-col min-h-[300px] lg:max-h-[584px]">
              <div className="flex items-baseline justify-between gap-2 pb-3 border-b border-brand-line">
                <h3 className="font-display text-xl font-extrabold text-brand-ink m-0">{selectedCommune || 'Tout Kinshasa'}</h3>
                {(mapFilter === 'kin_traffic' || mapPlaces.length > 0) && (
                  <span className="text-xs font-bold text-brand-muted">
                    {mapFilter === 'kin_traffic' ? 'Trafic indicatif' : `${mapPlaces.length} lieu${mapPlaces.length > 1 ? 'x' : ''}`}
                  </span>
                )}
              </div>

              {mapFilter === 'kin_traffic' ? (
                <div className="overflow-y-auto -mx-1 px-1">
                  <p className="text-xs text-brand-muted my-3 leading-relaxed">
                    Niveaux de circulation indicatifs par commune (Boulevard du 30 Juin, Boulevard Lumumba, Rond-Point Victoire…). Pas des données en temps réel.
                  </p>
                  <ul className="list-none p-0 m-0">
                    {Object.entries(TRAFFIC_LEVELS)
                      .filter(([name]) => COMMUNES.some((c) => c.name === name))
                      .filter(([name]) => !selectedCommune || name.toLowerCase() === selectedCommune.toLowerCase())
                      .map(([name, level]) => (
                        <li key={name} className="flex items-center justify-between py-2 border-b border-brand-line last:border-0">
                          <button type="button" onClick={() => setSelectedCommune(name)} className="text-sm font-semibold text-brand-ink cursor-pointer hover:text-brand-blue-deep">
                            {name}
                          </button>
                          <span
                            className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
                            style={{ color: TRAFFIC_COLORS[level], background: `${TRAFFIC_COLORS[level]}1A` }}
                          >
                            <span className="w-2 h-2 rounded-full" style={{ background: TRAFFIC_COLORS[level] }} />
                            {TRAFFIC_LABELS[level]}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              ) : mapPlaces.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-8">
                  <SpinningWheel size={64} spin={places === null} />
                  <p className="text-sm text-brand-muted m-0">
                    {places === null ? 'Chargement des lieux…' : 'Pas encore de lieu ici. Tu connais une bonne adresse ?'}
                  </p>
                  {places !== null && (
                    <Link href="/devenir-partenaire" className="text-sm font-bold text-brand-blue-deep no-underline">
                      Propose un lieu →
                    </Link>
                  )}
                </div>
              ) : (
                <ul className="list-none p-0 m-0 overflow-y-auto -mx-1 px-1">
                  {mapPlaces.map((p) => {
                    const avg = getAverageRating(p);
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => setOpenPlace(p)}
                          className="w-full flex items-center gap-3 py-2.5 border-b border-brand-line text-left cursor-pointer hover:bg-brand-bg rounded-xl px-1.5"
                        >
                          <PlaceImage src={p.image_url} alt={p.name} vertical={p.vertical} className="w-14 h-14 rounded-xl shrink-0" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-bold text-brand-ink truncate">{p.name}</span>
                            <span className="block text-xs text-brand-muted truncate">
                              {categoryOf(p.vertical).label} · {p.commune}
                            </span>
                          </span>
                          {avg !== null && (
                            <span className="inline-flex items-center gap-0.5 text-xs font-extrabold text-brand-yellow-deep shrink-0">
                              <IconStar size={12} filled className="text-brand-yellow" /> {avg.toFixed(1)}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Only once a commune is picked, so the link always has context. */}
              {selectedCommune && (
                <Link
                  href={communeHref(selectedCommune)}
                  className="mt-auto pt-4 inline-flex items-center justify-center gap-1.5 w-full bg-brand-blue text-white font-bold py-3 rounded-full no-underline hover:bg-brand-blue-deep"
                >
                  Ouvrir le guide de {selectedCommune} <IconArrowRight size={14} />
                </Link>
              )}
            </div>
          </div>
        </section>

      </>
    ),
    communes: (
      <>
        {/* 4. SIX COMMUNES + "Voir les 24" */}
        <section id="communes" aria-labelledby="communes-title">
          <div className="flex items-end justify-between gap-4 mb-5">
            <div>
              <h2 id="communes-title" className="font-display text-3xl md:text-4xl font-extrabold text-brand-ink tracking-tight m-0">
                Les communes de Kin
              </h2>
              <p className="text-brand-muted m-0 mt-1">Chaque commune a son caractère. Laquelle est la tienne ?</p>
            </div>
            <Link href="/communes" className="hidden sm:inline-flex items-center gap-1 text-sm font-bold text-brand-blue-deep no-underline hover:text-brand-blue shrink-0">
              Voir les 24 communes <IconArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
            {featuredCommunes.map((c, i) => (
              <CommuneCard key={c.name} commune={c} index={i} count={placeList.filter((p) => sameCommune(p.commune, c.name)).length} />
            ))}
          </div>
          <Link
            href="/communes"
            className="sm:hidden mt-4 flex items-center justify-center gap-1.5 w-full h-12 rounded-full bg-white border border-brand-line text-brand-ink font-bold no-underline"
          >
            Voir les 24 communes <IconArrowRight size={14} />
          </Link>
        </section>
      </>
    ),
  };

  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader below={settings.ticker ? <NewsTicker items={allNews} /> : null} />
      {settings.newsletterPopup && <NewsletterPopup />}

      <div className="max-w-[1400px] w-full mx-auto px-4 md:px-6 pt-5 md:pt-8 flex flex-col gap-14 md:gap-20 pb-16">
        {/* 1. HERO CAROUSEL */}
        <HeroCarousel banners={liveBanners} headlines={news.live} weekendCount={weekendOn ? upcomingEvents.length : 0} onSurprise={surprise} brandSlides={settings.brandSlides} />

        {/* 2+. SECTIONS — order and visibility come from Backoffice → Vitrine */}
        {settings.sections
          .filter((sec) => sec.visible)
          .map((sec, idx) => (
            <Fragment key={sec.id}>
              {sec.id === 'categories' && idx === 0 ? <div className="-mt-6 md:-mt-10">{sections.categories}</div> : sections[sec.id]}
            </Fragment>
          ))}
      </div>

      <SiteFooter />
      <PlaceSheet place={openPlace} onClose={closeSheet} onUpdated={updatePlace} />
    </main>
  );
}


