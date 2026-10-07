'use client';
// Commune page — v4 joyful redesign (2026-10-04): colorful hero banner,
// fact cards, the commune's own Kin Actualité headlines, place carousels
// (same cards + detail sheet as the homepage), events, and the map.

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import maplibregl from '../../../lib/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { sameCommune, canonicalCommune } from '../../../lib/communes';
import { supabase } from '../../../lib/supabase';
import { createPlacePin } from '../../../lib/mapPins';
import { IconHome, IconChevronRight, IconClock, IconChart, IconPin, IconArrowRight } from '../../../components/icons';
import { SiteHeader } from '../../../components/SiteHeader';
import { SiteFooter } from '../../../components/SiteFooter';
import { SpinningWheel } from '../../../components/BrandMark';
import { Carousel } from '../../../components/Carousel';
import { PlaceCard, CategoryIcon } from '../../../components/PlaceCard';
import { PlaceSheet } from '../../../components/PlaceSheet';
import { useKinNews, NewsCard, LiveDot } from '../../../components/KinNews';
import { getTrafficLevel, TRAFFIC_COLORS, TRAFFIC_LABELS } from '../../../lib/traffic';
import { CATEGORIES, getAverageRating } from '../../../lib/categories';
import { COMMUNE_DETAILS, ALL_KINSHASA_COMMUNES, DEFAULT_COMMUNE_BRIEF } from '../../../data/communeDetails';
import { MAP_STYLE, PIN_COLORS } from '../../../lib/mapStyle';

export default function CommuneDetailPage() {
  const params = useParams();
  const router = useRouter();

  const rawName = (params?.name as string) || 'Gombe';
  const communeName = canonicalCommune(decodeURIComponent(rawName).trim()) || decodeURIComponent(rawName).trim();
  const communeInfo = COMMUNE_DETAILS[communeName] || COMMUNE_DETAILS[communeName.replace(' ', '-')] || DEFAULT_COMMUNE_BRIEF;

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const [places, setPlaces] = useState<any[] | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [openPlace, setOpenPlace] = useState<any | null>(null);
  const news = useKinNews(communeName);

  useEffect(() => {
    setPlaces(null);
    supabase
      .from('places')
      .select('*')
      .order('created_at', { ascending: false })
      // matched in code so "N'djili" / "Ndjili" / "N'Djili" all count; hidden places skipped
      .then(({ data }) => setPlaces((data || []).filter((p: any) => p.published !== false && sameCommune(p.commune, communeName))));
    supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: true })
      .then(({ data }) => setEvents((data || []).filter((e: any) => sameCommune(e.commune, communeName))));
  }, [communeName]);

  const placeList = useMemo(() => places || [], [places]);

  useEffect(() => {
    if (!mapContainer.current) return;
    if (map.current) {
      map.current.flyTo({ center: [communeInfo.lng, communeInfo.lat], zoom: communeInfo.zoom, essential: true });
    } else {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: MAP_STYLE,
        center: [communeInfo.lng, communeInfo.lat],
        zoom: communeInfo.zoom,
        pitch: 35,
        cooperativeGestures: true,
      });
      map.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    }

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    placeList.forEach((p) => {
      if (!(p.lat && p.lng)) return; // no position yet: listed below, no pin
      const lat = parseFloat(p.lat);
      const lng = parseFloat(p.lng);
      const color = PIN_COLORS[p.vertical] || '#1A82F5';
      const el = createPlacePin({ name: p.name, color, rating: getAverageRating(p), onSelect: () => setOpenPlace(p) });

      markersRef.current.push(new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map.current!));
    });
  }, [communeName, communeInfo, placeList]);

  const byCategory = useMemo(() => {
    const m: Record<string, any[]> = {};
    for (const p of placeList) (m[p.vertical] ||= []).push(p);
    return m;
  }, [placeList]);

  const updatePlace = useCallback((u: any) => setPlaces((prev) => (prev || []).map((p) => (p.id === u.id ? u : p))), []);
  const closeSheet = useCallback(() => setOpenPlace(null), []);

  const trafficLevel = getTrafficLevel(communeName);
  const communeNews = [...news.pinned, ...news.live].slice(0, 6);

  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader />

      {/* HERO BANNER */}
      <section className="relative overflow-hidden text-white" style={{ background: 'linear-gradient(120deg,#0A2A66 0%,#0E5FC9 50%,#1A82F5 100%)' }}>
        <span className="absolute -right-28 -top-28 opacity-40 pointer-events-none">
          <SpinningWheel size={460} />
        </span>
        <div className="relative max-w-[1400px] mx-auto px-4 md:px-6 pt-5 pb-10 md:pb-14">
          <nav aria-label="Fil d'Ariane" className="flex items-center gap-1.5 text-xs text-white/75">
            <Link href="/" className="inline-flex items-center gap-1 no-underline text-white/75 hover:text-white">
              <IconHome size={12} /> Accueil
            </Link>
            <IconChevronRight size={12} />
            <Link href="/#communes" className="no-underline text-white/75 hover:text-white">
              Communes
            </Link>
            <IconChevronRight size={12} />
            <span className="text-white font-semibold">{communeName}</span>
          </nav>

          <div className="mt-6 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-1.5 bg-brand-yellow text-brand-ink text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wide">
                <IconPin size={12} /> Commune de Kinshasa
              </span>
              <h1 className="font-display text-5xl md:text-7xl font-extrabold leading-[1] tracking-tight m-0 mt-3">{communeName}</h1>
              <p className="text-lg md:text-2xl text-white/90 font-medium m-0 mt-3 max-w-2xl">{communeInfo.tagline}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                {trafficLevel && (
                  <span
                    className="inline-flex items-center gap-1.5 bg-white text-xs font-extrabold px-3 py-1.5 rounded-full"
                    style={{ color: TRAFFIC_COLORS[trafficLevel] }}
                    title="Niveau indicatif, pas une donnée de trafic en temps réel."
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: TRAFFIC_COLORS[trafficLevel] }} />
                    Circulation {TRAFFIC_LABELS[trafficLevel].toLowerCase()}
                  </span>
                )}
                {places && (
                  <span className="inline-flex items-center bg-white/15 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                    {places.length} lieu{places.length > 1 ? 'x' : ''} sélectionné{places.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            <div className="shrink-0">
              <label htmlFor="commune-select" className="block text-[11px] uppercase tracking-wide text-white/80 font-bold mb-1.5">
                Changer de commune
              </label>
              <select
                id="commune-select"
                value={ALL_KINSHASA_COMMUNES.includes(communeName) ? communeName : ''}
                onChange={(e) => router.push(`/commune/${encodeURIComponent(e.target.value)}`)}
                className="bg-white text-brand-ink px-4 py-3 rounded-full text-sm font-bold cursor-pointer min-w-[240px] border-0 shadow-lift"
              >
                <option value="" disabled>
                  Choisir une commune (24)…
                </option>
                {ALL_KINSHASA_COMMUNES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-[1400px] mx-auto px-4 md:px-6 w-full flex-1 py-8 md:py-10 flex flex-col gap-12 md:gap-16 pb-16">
        <div className="grid grid-cols-1 gap-8 [&>*]:min-w-0 lg:grid-cols-[minmax(0,1fr)_400px]">
          {/* LEFT: story */}
          <div className="flex flex-col gap-6 min-w-0">
            <p className="text-lg md:text-xl text-brand-ink/85 leading-relaxed m-0">{communeInfo.specification}</p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="bg-brand-blue-soft rounded-3xl p-5">
                <h2 className="inline-flex items-center gap-2 text-sm font-extrabold text-brand-blue-deep m-0 mb-2">
                  <IconClock size={16} /> Un peu d’histoire
                </h2>
                <p className="text-sm text-brand-ink/80 leading-relaxed m-0">{communeInfo.history}</p>
              </div>
              <div className="bg-brand-yellow-soft rounded-3xl p-5">
                <h2 className="inline-flex items-center gap-2 text-sm font-extrabold text-brand-yellow-deep m-0 mb-2">
                  <IconChart size={16} /> Économie &amp; activités
                </h2>
                <p className="text-sm text-brand-ink/80 leading-relaxed m-0">{communeInfo.economy}</p>
              </div>
            </div>

            <div>
              <h3 className="text-xs text-brand-muted uppercase tracking-wide font-bold mb-3 mt-0">Quartiers &amp; repères</h3>
              <div className="flex gap-2 flex-wrap">
                {communeInfo.keyDistricts.map((d) => (
                  <span key={d} className="bg-white text-brand-ink border border-brand-line px-3.5 py-1.5 rounded-full text-sm font-semibold shadow-sm">
                    {d}
                  </span>
                ))}
              </div>
            </div>

            {/* Commune news */}
            <section className="bg-white rounded-3xl border border-brand-line shadow-card p-5">
              <div className="flex items-center justify-between gap-3 mb-1">
                <h2 className="font-display text-xl font-extrabold text-brand-ink m-0 inline-flex items-center gap-2">
                  <LiveDot /> Kin Actualité à {communeName}
                </h2>
                <Link href="/actualite" className="text-sm font-bold text-brand-blue-deep no-underline shrink-0">
                  Toute l’actu →
                </Link>
              </div>
              {communeNews.length === 0 ? (
                <p className="text-sm text-brand-muted m-0 py-3">
                  {news.loading ? 'Chargement…' : `Pas d’actualité récente mentionnant ${communeName}.`}
                </p>
              ) : (
                communeNews.map((n) => <NewsCard key={n.id} item={n} variant="row" />)
              )}
            </section>
          </div>

          {/* RIGHT: map */}
          <aside>
            <div className="lg:sticky lg:top-24 bg-white border border-brand-line rounded-3xl shadow-card p-2.5">
              <div ref={mapContainer} className="w-full h-[360px] lg:h-[460px] rounded-2xl overflow-hidden" />
              <p className="text-xs text-brand-muted mt-2 mb-1 text-center font-semibold">
                Touchez une épingle pour ouvrir le lieu
              </p>
            </div>
          </aside>
        </div>

        {/* EVENTS */}
        {events.length > 0 && (
          <section className="rounded-[28px] p-5 md:p-8" style={{ background: 'linear-gradient(135deg,#EFE6FD 0%,#FFF7D1 100%)' }}>
            <Carousel title={`Kin Weekend à ${communeName}`} subtitle="Les sorties au programme dans la commune." itemClassName="w-[82%] sm:w-[46%] lg:w-[32%]">
              {events.map((e) => (
                <article key={e.id} className="h-full bg-white rounded-2xl border border-brand-line shadow-card p-4">
                  <span className="text-[11px] font-extrabold uppercase tracking-wide text-[#7B3FE4]">
                    {[e.category, e.event_date && new Date(e.event_date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                  <h3 className="font-display text-lg font-bold text-brand-ink m-0 mt-1">{e.title}</h3>
                  {e.description && <p className="text-sm text-brand-muted m-0 mt-1 line-clamp-3">{e.description}</p>}
                </article>
              ))}
            </Carousel>
          </section>
        )}

        {/* PLACES BY CATEGORY */}
        {places === null ? (
          <div className="flex items-center gap-3 text-brand-muted">
            <SpinningWheel size={40} /> Chargement des adresses…
          </div>
        ) : placeList.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-brand-line p-8 text-center">
            <SpinningWheel size={64} spin={false} className="mx-auto" />
            <h2 className="font-display text-2xl font-extrabold text-brand-ink mt-3 mb-1">Aucune adresse à {communeName} pour l’instant</h2>
            <p className="text-brand-muted m-0">Vous connaissez un bon plan dans la commune ? Dites-le-nous.</p>
            <Link href="/contact" className="inline-flex items-center gap-1.5 mt-4 bg-brand-red text-white font-bold px-5 py-3 rounded-full no-underline">
              Proposer un lieu <IconArrowRight size={14} />
            </Link>
          </div>
        ) : (
          CATEGORIES.filter((c) => (byCategory[c.id] || []).length > 0).map((c) => (
            <Carousel
              key={c.id}
              title={
                <span className="inline-flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-xl inline-flex items-center justify-center text-white" style={{ background: c.gradient }}>
                    <CategoryIcon id={c.id} size={18} />
                  </span>
                  {c.label} à {communeName}
                </span>
              }
              subtitle={c.tagline}
            >
              {byCategory[c.id].map((p) => (
                <PlaceCard key={p.id} place={p} onOpen={setOpenPlace} />
              ))}
            </Carousel>
          ))
        )}
      </div>

      <SiteFooter />
      <PlaceSheet place={openPlace} onClose={closeSheet} onUpdated={updatePlace} />
    </main>
  );
}
