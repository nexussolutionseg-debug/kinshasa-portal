// Map picker for the backoffice (2026-11-12): place a lead or a place by
// hand when it has no GPS point (most of Kinshasa's addresses aren't on any
// map). Search the address on OpenStreetMap, tap the exact spot (the pin can
// be dragged), switch to satellite to see the buildings, or use the phone's
// GPS when standing at the place. Free: Esri tiles + OpenStreetMap search.
'use client';

import { resolvePosition } from '../../lib/mapLink';
import { googleMapsSearchUrl } from '../../lib/geo';
import { useEffect, useRef, useState } from 'react';
import maplibregl from '../../lib/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type * as ML from 'maplibre-gl';
import { supabase } from '../../lib/supabase';
import communesGeo from '../../data/communes.json';
import { communeKey } from '../../lib/communes';
import { Button } from '../Button';

const KIN: [number, number] = [15.3, -4.33];
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';

const STYLE: ML.StyleSpecification = {
  version: 8,
  sources: {
    plan: { type: 'raster', tiles: [`${ESRI}/World_Street_Map/MapServer/tile/{z}/{y}/{x}`], tileSize: 256, attribution: 'Tiles &copy; Esri' },
    sat: { type: 'raster', tiles: [`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`], tileSize: 256, attribution: 'Imagery &copy; Esri' },
    labels: { type: 'raster', tiles: [`${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`], tileSize: 256 },
  },
  layers: [
    { id: 'plan', type: 'raster', source: 'plan' },
    { id: 'sat', type: 'raster', source: 'sat', layout: { visibility: 'none' } },
    { id: 'labels', type: 'raster', source: 'labels', layout: { visibility: 'none' } },
  ],
};

/** Middle of a commune's outline (bounding-box centre), or null. */
function communeCenter(name: string | null | undefined): [number, number] | null {
  if (!name) return null;
  const f = (communesGeo as any).features.find((x: any) => communeKey(x.properties?.name) === communeKey(name));
  if (!f) return null;
  const pts: number[][] = [];
  const walk = (c: any) => (typeof c[0] === 'number' ? pts.push(c) : c.forEach(walk));
  walk(f.geometry.coordinates);
  if (!pts.length) return null;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
}

export function PositionPicker({
  title,
  commune,
  query,
  initial,
  onPick,
  onClose,
}: {
  title: string;
  commune?: string | null;
  query?: string;
  initial?: { lat: number; lng: number } | null;
  onPick: (pos: { lat: number; lng: number }) => void;
  onClose: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<ML.Map | null>(null);
  const marker = useRef<ML.Marker | null>(null);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(initial || null);
  const [sat, setSat] = useState(false);
  const [q, setQ] = useState(query || '');
  const [search, setSearch] = useState<{ busy: boolean; results: any[]; msg: string }>({ busy: false, results: [], msg: '' });
  const [gps, setGps] = useState('');
  // Google Maps (2026-11-12): find the place there, Share → Copy link, paste it here.
  const [gLink, setGLink] = useState('');
  const [gMsg, setGMsg] = useState('');
  const onGoogleLink = async (v: string) => {
    setGLink(v);
    setGMsg('');
    if (v.trim().length < 8) return;
    setGMsg('Lecture du lien…');
    const r = await resolvePosition(v);
    if (r && 'lat' in r) {
      place(r.lng, r.lat, true);
      setGMsg('Position de Google Maps placée ✓ Vérifie l’épingle puis valide.');
    } else setGMsg(r && 'error' in r ? r.error : 'Ce lien ne contient pas de position. Ouvre la fiche du lieu dans Google Maps, puis Partager → Copier le lien.');
  };

  const place = (lng: number, lat: number, fly = false) => {
    const m = map.current;
    if (!m) return;
    const p = { lat: +lat.toFixed(6), lng: +lng.toFixed(6) };
    setPos(p);
    if (!marker.current) {
      marker.current = new maplibregl.Marker({ color: '#D21C2E', draggable: true }).setLngLat([lng, lat]).addTo(m);
      marker.current.on('dragend', () => {
        const ll = marker.current!.getLngLat();
        setPos({ lat: +ll.lat.toFixed(6), lng: +ll.lng.toFixed(6) });
      });
    } else marker.current.setLngLat([lng, lat]);
    if (fly) m.flyTo({ center: [lng, lat], zoom: Math.max(m.getZoom(), 17) });
  };

  useEffect(() => {
    if (!box.current) return;
    const start: [number, number] = initial ? [initial.lng, initial.lat] : communeCenter(commune) || KIN;
    const m = new maplibregl.Map({ container: box.current, style: STYLE, center: start, zoom: initial ? 17 : commune ? 14 : 11, attributionControl: { compact: true } });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    m.on('click', (e) => place(e.lngLat.lng, e.lngLat.lat));
    map.current = m;
    m.on('load', () => {
      m.resize();
      if (initial) place(initial.lng, initial.lat);
    });
    // The dialog lays itself out after the map is created (and phones rotate):
    // keep the map the size of its box so a tap always lands on it.
    const ro = new ResizeObserver(() => m.resize());
    ro.observe(box.current);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      ro.disconnect();
      m.remove();
      map.current = null;
      marker.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m || !m.isStyleLoaded()) return;
    m.setLayoutProperty('plan', 'visibility', sat ? 'none' : 'visible');
    m.setLayoutProperty('sat', 'visibility', sat ? 'visible' : 'none');
    m.setLayoutProperty('labels', 'visibility', sat ? 'visible' : 'none');
  }, [sat]);

  const runSearch = async () => {
    if (q.trim().length < 2) return;
    setSearch({ busy: true, results: [], msg: '' });
    const { data } = await supabase.auth.getSession();
    try {
      const r = await fetch(`/api/osm-search?${new URLSearchParams({ q: q.trim(), commune: commune || '' })}`, {
        headers: { Authorization: `Bearer ${data.session?.access_token || ''}` },
      });
      const j = await r.json();
      const results = j.results || [];
      setSearch({ busy: false, results, msg: j.error || (results.length ? '' : 'Rien trouvé. Touchez la carte à l’endroit exact.') });
      if (results.length === 1) place(results[0].lng, results[0].lat, true);
    } catch {
      setSearch({ busy: false, results: [], msg: 'Recherche impossible. Touchez la carte à l’endroit exact.' });
    }
  };

  const useGps = () => {
    if (!navigator.geolocation) return setGps('GPS non disponible sur cet appareil.');
    setGps('Recherche de votre position…');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        place(p.coords.longitude, p.coords.latitude, true);
        setGps(`Position du téléphone (précision ± ${Math.round(p.coords.accuracy)} m).`);
      },
      () => setGps('Position refusée ou indisponible.'),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  return (
    <div className="fixed inset-0 z-[70] bg-brand-ink/60 flex items-stretch md:items-center justify-center md:p-6" role="dialog" aria-modal="true" aria-label={`Position de ${title}`}>
      <div className="bg-white w-full md:max-w-4xl md:rounded-3xl overflow-hidden flex flex-col max-h-full">
        <div className="p-3 md:p-4 border-b border-brand-line flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="font-display text-lg font-extrabold m-0 truncate">Placer : {title}</p>
            <button type="button" onClick={onClose} className="h-9 px-3 rounded-full border border-brand-line font-bold cursor-pointer shrink-0">Fermer</button>
          </div>
          <div className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), runSearch())}
              placeholder="Adresse, avenue, repère…"
              className="flex-1 min-w-0 h-11 px-3 border border-brand-line rounded-xl text-[16px] md:text-sm"
              aria-label="Chercher une adresse"
            />
            <Button type="button" variant="secondary" onClick={runSearch} disabled={search.busy}>{search.busy ? '…' : 'Chercher'}</Button>
          </div>
          {search.results.length > 1 && (
            <ul className="list-none p-0 m-0 flex flex-col gap-1 max-h-32 overflow-y-auto">
              {search.results.map((r) => (
                <li key={r.osm}>
                  <button type="button" onClick={() => place(r.lng, r.lat, true)} className="w-full text-left text-sm bg-brand-bg hover:bg-brand-blue-soft rounded-lg px-3 py-1.5 cursor-pointer">
                    <b>{r.name || r.label.split(',')[0]}</b> <span className="text-brand-muted">· {r.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {search.msg && <p className="text-xs text-brand-muted m-0">{search.msg}</p>}
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center rounded-xl bg-brand-bg p-2">
            <a
              href={googleMapsSearchUrl(title, commune)}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center justify-center h-10 px-4 rounded-full bg-white border border-brand-line font-bold text-sm text-brand-ink no-underline"
            >
              1. Trouver sur Google Maps ↗
            </a>
            <input
              value={gLink}
              onChange={(e) => onGoogleLink(e.target.value)}
              placeholder="2. Partager → Copier le lien, puis collez-le ici"
              className="flex-1 min-w-0 h-10 px-3 border border-brand-line rounded-xl text-[16px] md:text-sm bg-white"
              aria-label="Lien Google Maps du lieu"
            />
          </div>
          {gMsg && <p className="text-xs font-semibold text-brand-blue-deep m-0">{gMsg}</p>}
        </div>

        <div className="relative flex-1 min-h-[45vh] md:min-h-[460px]">
          {/* Inline position: MapLibre's own CSS sets .maplibregl-map { position: relative }, which would cancel a class and leave the map 0 px tall. */}
          <div ref={box} style={{ position: 'absolute', inset: 0 }} />
          <div className="absolute left-2 top-2 flex gap-1.5">
            <button type="button" onClick={() => setSat(false)} className={`h-9 px-3 rounded-full text-sm font-bold shadow cursor-pointer ${!sat ? 'bg-brand-ink text-white' : 'bg-white text-brand-ink'}`}>Plan</button>
            <button type="button" onClick={() => setSat(true)} className={`h-9 px-3 rounded-full text-sm font-bold shadow cursor-pointer ${sat ? 'bg-brand-ink text-white' : 'bg-white text-brand-ink'}`}>Satellite</button>
          </div>
          {!pos && (
            <p className="absolute left-1/2 -translate-x-1/2 bottom-3 m-0 bg-white/95 rounded-full px-4 py-2 text-sm font-semibold shadow pointer-events-none">
              Touchez la carte à l’endroit exact
            </p>
          )}
        </div>

        <div className="p-3 md:p-4 border-t border-brand-line flex flex-col sm:flex-row sm:items-center gap-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <Button type="button" variant="ghost" onClick={useGps}>📍 Ma position (sur place)</Button>
          <p className="text-xs text-brand-muted m-0 flex-1">{gps || (pos ? `${pos.lat}, ${pos.lng} · déplacez l’épingle si besoin` : 'Aucune position choisie')}</p>
          <Button type="button" variant="primary" disabled={!pos} onClick={() => pos && onPick(pos)}>Valider cette position</Button>
        </div>
      </div>
    </div>
  );
}
