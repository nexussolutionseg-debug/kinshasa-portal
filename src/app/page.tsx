'use client';
// Homepage — v4 "joyful" redesign (2026-10-04).
//
// Merchandising order, top to bottom:
//   1. Live headline ticker (Kin Actualité)
//   2. Header banner carousel (backoffice banners + brand slides)
//   3. Category tiles (big, colorful, one tap into each Kin category)
//   4. Kin Actualité block (À la une + live headlines + USD/CDF rate)
//   5. Place carousels: top rated, new, then one per category
//   6. Kin Weekend events carousel
//   7. Interactive map explorer with category chips
//   8. Commune carousel
//   9. "Surprends-moi" band
// Every place card opens the same detail sheet (rating + comments).
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { supabase } from '../lib/supabase';
import { escapeHtml } from '../lib/html';
import communesData from '../data/communes.json';
import { COMMUNE_DETAILS } from '../data/communeDetails';
import { CATEGORIES, categoryOf, getAverageRating } from '../lib/categories';
import { MAP_STYLE, PIN_COLORS } from '../lib/mapStyle';
import { TRAFFIC_LEVELS, TRAFFIC_COLORS, TRAFFIC_LABELS, DEFAULT_COMMUNE_COLOR, TRAFFIC_FILL_EXPRESSION, getTrafficLevel } from '../lib/traffic';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { NewsletterPopup } from '../components/NewsletterPopup';
import { HeroCarousel } from '../components/HeroCarousel';
import { Carousel } from '../components/Carousel';
import { PlaceCard, CategoryIcon, PlaceImage } from '../components/PlaceCard';
import { PlaceSheet } from '../components/PlaceSheet';
import { SpinningWheel } from '../components/BrandMark';
import { useKinNews, NewsCard, NewsTicker, ExchangeRateCard, NewsEmpty, LiveDot } from '../components/KinNews';
import { IconArrowRight, IconDice, IconPin, IconGlobe, IconStar, IconClose } from '../components/icons';

const COMMUNES: { name: string; district: string; lat: number; lng: number }[] = (communesData as any).communes;

function coordsFor(place: any): [number, number] {
  if (place.lat && place.lng) return [parseFloat(place.lng), parseFloat(place.lat)];
  const c = COMMUNES.find((x) => (place.commune || '').toLowerCase().includes(x.name.toLowerCase()));
  return c ? [c.lng, c.lat] : [15.3, -4.312];
}


// Map chips: the place categories + traffic. (Actualité and Weekend have
// their own sections and pages.)
const MAP_FILTERS = [
  { id: 'all', label: 'Tout Kin' },
  ...CATEGORIES.filter((c) => !['kin_actualite', 'kin_weekend'].includes(c.id)).map((c) => ({ id: c.id, label: c.label })),
];

export default function HomePage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const [places, setPlaces] = useState<any[] | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [mapFilter, setMapFilter] = useState('all');
  const [selectedCommune, setSelectedCommune] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [openPlace, setOpenPlace] = useState<any | null>(null);

  const news = useKinNews();
  const allNews = useMemo(() => [...news.pinned, ...news.live], [news.pinned, news.live]);

  // ---- data ---------------------------------------------------------------
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
      .order('created_at', { ascending: false })
      .then(({ data }) => setBanners(data || []));
  }, []);

  const placeList = useMemo(() => places || [], [places]);

  const topRated = useMemo(
    () =>
      [...placeList]
        .filter((p) => (p.rating_count || 0) > 0)
        .sort((a, b) => (getAverageRating(b) || 0) - (getAverageRating(a) || 0) || (b.rating_count || 0) - (a.rating_count || 0))
        .slice(0, 12),
    [placeList]
  );
  const newest = useMemo(() => placeList.slice(0, 12), [placeList]);
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
          (!selectedCommune || (p.commune || '').toLowerCase().includes(selectedCommune.toLowerCase()))
      ),
    [placeList, mapFilter, selectedCommune]
  );

  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = events.filter((e) => !e.event_date || new Date(e.event_date) >= today);
    return upcoming.length ? upcoming : events;
  }, [events]);

  const updatePlace = useCallback((updated: any) => {
    setPlaces((prev) => (prev || []).map((p) => (p.id === updated.id ? updated : p)));
  }, []);

  const closeSheet = useCallback(() => setOpenPlace(null), []);

  const surprise = useCallback(() => {
    if (!placeList.length) return;
    const pick = placeList[Math.floor(Math.random() * placeList.length)];
    setOpenPlace(pick);
  }, [placeList]);

  const jumpToMap = (filter: string) => {
    setMapFilter(filter);
    document.getElementById('explorer')?.scrollIntoView({ behavior: 'smooth' });
  };

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
      const [lng, lat] = coordsFor(place);
      bounds.extend([lng, lat]);
      const color = PIN_COLORS[place.vertical] || '#1A82F5';
      const avg = getAverageRating(place);

      const el = document.createElement('button');
      el.type = 'button';
      el.setAttribute('aria-label', place.name);
      el.title = place.name;
      el.style.cssText = `position:relative;width:30px;height:30px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 6px 14px -4px rgba(11,37,69,.55);cursor:pointer;padding:0;transition:transform .15s;`;
      // Compact round pin; the name pops up on hover/focus so dense areas stay readable.
      const label = document.createElement('span');
      label.style.cssText = `position:absolute;left:50%;bottom:calc(100% + 6px);transform:translateX(-50%);background:#fff;color:#0B2545;font:700 11px system-ui,sans-serif;padding:4px 8px;border-radius:999px;white-space:nowrap;box-shadow:0 6px 16px -6px rgba(11,37,69,.45);display:none;pointer-events:none;`;
      label.innerHTML = `${escapeHtml(place.name)}${avg !== null ? ` <span style="color:#B98A00">★ ${avg.toFixed(1)}</span>` : ''}`;
      el.appendChild(label);
      const show = () => { label.style.display = 'block'; el.style.transform = 'scale(1.15)'; el.style.zIndex = '5'; };
      const hide = () => { label.style.display = 'none'; el.style.transform = ''; el.style.zIndex = ''; };
      el.addEventListener('mouseenter', show);
      el.addEventListener('mouseleave', hide);
      el.addEventListener('focus', show);
      el.addEventListener('blur', hide);
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        setOpenPlace(place);
      });

      markersRef.current.push(new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map.current!));
    });

    if (mapPlaces.length > 0) map.current.fitBounds(bounds, { padding: 70, maxZoom: 14, duration: 600 });
  }, [mapPlaces, mapFilter]);

  // ---- render -------------------------------------------------------------
  const featuredNews = allNews[0];
  const gridNews = allNews.slice(1, 3);
  const sideNews = allNews.slice(3, 9);

  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader />
      <NewsTicker items={allNews} />
      <NewsletterPopup />

      <div className="max-w-[1400px] w-full mx-auto px-4 md:px-6 pt-5 md:pt-8 flex flex-col gap-14 md:gap-20 pb-16">
        {/* 1. HERO CAROUSEL */}
        <HeroCarousel banners={banners} headlines={news.live} weekendCount={upcomingEvents.length} onSurprise={surprise} />

        {/* 2. CATEGORY TILES */}
        <section aria-label="Catégories" className="-mt-6 md:-mt-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
            {CATEGORIES.map((c) => {
              const count =
                c.id === 'kin_actualite' ? allNews.length : c.id === 'kin_weekend' ? upcomingEvents.length : c.id === 'kin_traffic' ? 24 : (byCategory[c.id] || []).length;
              const inner = (
                <>
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
                    <span className="absolute top-3 right-3 text-[11px] font-extrabold bg-white/90 text-brand-ink px-2 py-0.5 rounded-full">
                      {c.id === 'kin_traffic' ? '24 communes' : count}
                    </span>
                  )}
                </>
              );
              const cls = `relative overflow-hidden flex flex-col gap-3 min-h-[132px] md:min-h-[156px] p-4 rounded-3xl no-underline shadow-card hover:shadow-lift hover:-translate-y-1 transition-all duration-200 text-left cursor-pointer ${
                c.id === 'kin_culture' ? 'text-brand-ink' : 'text-white'
              }`;
              if (c.id === 'kin_actualite')
                return (
                  <Link key={c.id} href="/actualite" className={cls} style={{ background: c.gradient }}>
                    {inner}
                  </Link>
                );
              if (c.id === 'kin_weekend')
                return (
                  <a key={c.id} href="#kin-weekend" className={cls} style={{ background: c.gradient }}>
                    {inner}
                  </a>
                );
              return (
                <button key={c.id} type="button" onClick={() => jumpToMap(c.id)} className={cls} style={{ background: c.gradient }}>
                  {inner}
                </button>
              );
            })}
          </div>
        </section>

        {/* 3. KIN ACTUALITÉ */}
        <section id="kin-actualite" aria-labelledby="kin-actualite-title">
          <div className="flex items-end justify-between gap-4 mb-5">
            <div>
              <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-brand-red">
                <LiveDot /> En direct de Kinshasa
              </span>
              <h2 id="kin-actualite-title" className="font-display text-3xl md:text-4xl font-extrabold text-brand-ink tracking-tight m-0 mt-1">
                Kin Actualité
              </h2>
            </div>
            <Link href="/actualite" className="inline-flex items-center gap-1 text-sm font-bold text-brand-blue-deep no-underline hover:text-brand-blue shrink-0">
              Toute l’actu <IconArrowRight size={14} />
            </Link>
          </div>

          {allNews.length === 0 ? (
            <div className="grid grid-cols-1 gap-5 [&>*]:min-w-0 lg:grid-cols-[1fr_320px]">
              <NewsEmpty loading={news.loading} />
              <ExchangeRateCard />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 [&>*]:min-w-0 lg:grid-cols-[1.35fr_1fr_0.95fr]">
              <div>{featuredNews && <NewsCard item={featuredNews} variant="feature" />}</div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1 content-start">
                {gridNews.map((n) => (
                  <NewsCard key={n.id} item={n} />
                ))}
              </div>
              <div className="flex flex-col gap-5">
                {sideNews.length > 0 && (
                  <div className="bg-white rounded-2xl border border-brand-line shadow-card px-4 py-1">
                    {sideNews.map((n) => (
                      <NewsCard key={n.id} item={n} variant="row" />
                    ))}
                  </div>
                )}
                <ExchangeRateCard />
              </div>
            </div>
          )}
        </section>

        {/* 4. PLACE CAROUSELS */}
        {places === null ? (
          <RailSkeleton />
        ) : (
          <>
            {topRated.length > 0 && (
              <Carousel
                title={<>Les coups de cœur <span className="text-brand-red">des Kinois</span></>}
                subtitle="Les adresses les mieux notées par la communauté."
                eyebrow={<span className="inline-flex items-center gap-1 text-xs font-extrabold uppercase tracking-wider text-brand-yellow-deep"><IconStar size={13} filled /> Top notés</span>}
                seeAllHref="/#explorer"
              >
                {topRated.map((p, i) => (
                  <PlaceCard key={p.id} place={p} onOpen={setOpenPlace} badge={i < 3 ? `#${i + 1}` : undefined} />
                ))}
              </Carousel>
            )}

            {newest.length > 0 && (
              <Carousel title="Nouveaux lieux à découvrir" subtitle="Fraîchement ajoutés à la sélection Kinshasa Label." seeAllHref="/#explorer">
                {newest.map((p) => (
                  <PlaceCard key={p.id} place={p} onOpen={setOpenPlace} />
                ))}
              </Carousel>
            )}

            {/* One rail per category once it has enough to scroll through
                (security posts live on the map / commune pages instead —
                not a "discovery" rail). */}
            {CATEGORIES.filter((c) => c.id !== 'kin_securite' && (byCategory[c.id] || []).length >= 3).map((c) => (
              <Carousel
                key={c.id}
                title={
                  <span className="inline-flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-xl inline-flex items-center justify-center text-white" style={{ background: c.gradient }}>
                      <CategoryIcon id={c.id} size={18} />
                    </span>
                    {c.label}
                  </span>
                }
                subtitle={c.tagline}
              >
                {byCategory[c.id].map((p) => (
                  <PlaceCard key={p.id} place={p} onOpen={setOpenPlace} />
                ))}
              </Carousel>
            ))}
          </>
        )}

        {/* 5. KIN WEEKEND */}
        <section id="kin-weekend" className="rounded-[28px] p-5 md:p-8" style={{ background: 'linear-gradient(135deg,#EFE6FD 0%,#FFF7D1 100%)' }}>
          {upcomingEvents.length === 0 ? (
            <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
              <div>
                <h2 className="font-display text-2xl md:text-3xl font-extrabold text-brand-ink m-0">Kin Weekend</h2>
                <p className="text-brand-muted m-0 mt-1">Le programme des sorties arrive bientôt. Organisateur ? Faites-nous signe.</p>
              </div>
              <Link href="/contact" className="self-start inline-flex items-center gap-1.5 bg-brand-ink text-white font-bold px-5 py-3 rounded-full no-underline">
                Proposer un événement <IconArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <Carousel title="Kin Weekend" subtitle="Concerts, expos, soirées : on sort où ?" itemClassName="w-[82%] sm:w-[46%] lg:w-[32%]">
              {upcomingEvents.map((evt) => (
                <EventCard key={evt.id} evt={evt} />
              ))}
            </Carousel>
          )}
        </section>

        {/* 6. MAP EXPLORER */}
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
                <span className="text-xs font-bold text-brand-muted">
                  {mapFilter === 'kin_traffic' ? 'Trafic indicatif' : `${mapPlaces.length} lieu${mapPlaces.length > 1 ? 'x' : ''}`}
                </span>
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
                    {places === null ? 'Chargement des lieux…' : 'Pas encore de lieu ici. Connaissez-vous une bonne adresse ?'}
                  </p>
                  {places !== null && (
                    <Link href="/contact" className="text-sm font-bold text-brand-blue-deep no-underline">
                      Proposer un lieu →
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

              <Link
                href={`/commune/${encodeURIComponent(selectedCommune || 'Gombe')}`}
                className="mt-auto pt-4 inline-flex items-center justify-center gap-1.5 w-full bg-brand-blue text-white font-bold py-3 rounded-full no-underline hover:bg-brand-blue-deep"
              >
                Le guide de {selectedCommune || 'Gombe'} <IconArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>

        {/* 7. COMMUNES */}
        <Carousel
          id="communes"
          title="Les 24 communes de Kin"
          subtitle="Chaque commune a son caractère. Laquelle est la tienne ?"
          itemClassName="w-[70%] sm:w-[38%] md:w-[28%] lg:w-[19%]"
        >
          {COMMUNES.map((c, i) => {
            const brief = COMMUNE_DETAILS[c.name] || COMMUNE_DETAILS[c.name.replace(' ', '-')];
            const level = getTrafficLevel(c.name);
            const gradients = [
              'linear-gradient(160deg,#1A82F5,#0A2A66)',
              'linear-gradient(160deg,#F04A3A,#A60E1D)',
              'linear-gradient(160deg,#FFE36B,#F5B400)',
            ];
            const yellow = i % 3 === 2;
            const count = placeList.filter((p) => (p.commune || '').toLowerCase().includes(c.name.toLowerCase())).length;
            return (
              <Link
                key={c.name}
                href={`/commune/${encodeURIComponent(c.name)}`}
                className={`relative h-[210px] flex flex-col justify-end p-4 rounded-3xl overflow-hidden no-underline shadow-card hover:shadow-lift hover:-translate-y-1 transition-all ${
                  yellow ? 'text-brand-ink' : 'text-white'
                }`}
                style={{ background: gradients[i % 3] }}
              >
                <span className="absolute -right-8 -top-8 opacity-30 pointer-events-none">
                  <SpinningWheel size={130} spin={false} />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">District {c.district}</span>
                <span className="font-display text-2xl font-extrabold leading-tight">{c.name}</span>
                {brief && <span className="text-xs opacity-90 mt-1 line-clamp-2">{brief.tagline}</span>}
                <span className="mt-2 flex gap-1.5 flex-wrap">
                  {count > 0 && (
                    <span className="text-[10px] font-extrabold bg-white/90 text-brand-ink px-2 py-0.5 rounded-full">
                      {count} lieu{count > 1 ? 'x' : ''}
                    </span>
                  )}
                  {level && (
                    <span className="text-[10px] font-extrabold bg-white/90 px-2 py-0.5 rounded-full" style={{ color: TRAFFIC_COLORS[level] }}>
                      Trafic {TRAFFIC_LABELS[level].toLowerCase()}
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </Carousel>

        {/* 8. SURPRISE BAND */}
        <section className="relative overflow-hidden rounded-[28px] bg-brand-yellow px-6 py-10 md:px-12 md:py-12 flex flex-col md:flex-row md:items-center gap-6 justify-between">
          <span className="absolute -right-16 -bottom-24 opacity-60 pointer-events-none">
            <SpinningWheel size={320} />
          </span>
          <div className="relative max-w-xl">
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-brand-ink m-0">Tu ne sais pas où aller ?</h2>
            <p className="text-brand-ink/80 text-base md:text-lg m-0 mt-2">Laisse la grande roue choisir pour toi : un lieu au hasard, noté par les Kinois.</p>
          </div>
          <button
            type="button"
            onClick={surprise}
            disabled={!placeList.length}
            className="relative self-start md:self-auto inline-flex items-center gap-2 bg-brand-red text-white font-extrabold text-lg px-8 py-4 rounded-full shadow-lift hover:bg-brand-red-dark hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-60"
          >
            <IconDice size={22} /> Surprends-moi
          </button>
        </section>
      </div>

      <SiteFooter />
      <PlaceSheet place={openPlace} onClose={closeSheet} onUpdated={updatePlace} />
    </main>
  );
}

function EventCard({ evt }: { evt: any }) {
  const d = evt.event_date ? new Date(evt.event_date) : null;
  return (
    <article className="h-full bg-white rounded-2xl border border-brand-line shadow-card p-4 flex gap-4">
      <div className="shrink-0 w-16 rounded-2xl bg-brand-red text-white flex flex-col items-center justify-center py-2.5 self-start">
        {d ? (
          <>
            <span className="text-[11px] font-bold uppercase">{d.toLocaleDateString('fr-FR', { weekday: 'short' })}</span>
            <span className="font-display text-2xl font-extrabold leading-none">{d.getDate()}</span>
            <span className="text-[11px] font-bold uppercase">{d.toLocaleDateString('fr-FR', { month: 'short' })}</span>
          </>
        ) : (
          <span className="text-xs font-bold">Bientôt</span>
        )}
      </div>
      <div className="min-w-0">
        <span className="text-[11px] font-extrabold uppercase tracking-wide text-[#7B3FE4]">
          {[evt.category, evt.commune].filter(Boolean).join(' · ')}
        </span>
        <h3 className="font-display text-lg font-bold text-brand-ink leading-snug m-0 mt-0.5">{evt.title}</h3>
        {evt.description && <p className="text-sm text-brand-muted m-0 mt-1 line-clamp-3">{evt.description}</p>}
      </div>
    </article>
  );
}

function RailSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="h-8 w-72 rounded-full bg-brand-line/70 mb-4 animate-pulse" />
      <div className="flex gap-4 overflow-hidden">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="shrink-0 w-[78%] sm:w-[44%] md:w-[31%] lg:w-[23.5%] rounded-2xl bg-white border border-brand-line overflow-hidden">
            <div className="aspect-[4/3] bg-brand-line/60 animate-pulse" />
            <div className="p-4 flex flex-col gap-2">
              <div className="h-3 w-1/3 bg-brand-line/70 rounded animate-pulse" />
              <div className="h-5 w-2/3 bg-brand-line/70 rounded animate-pulse" />
              <div className="h-3 w-full bg-brand-line/50 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
