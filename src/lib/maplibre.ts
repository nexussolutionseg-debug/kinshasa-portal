// Single entry point for MapLibre so the worker URL is always set before
// any map is created (see scripts/copy-maplibre-worker.mjs for why).
import * as maplibregl from 'maplibre-gl';

if (typeof window !== 'undefined') {
  maplibregl.setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');
}

export default maplibregl;
export * from 'maplibre-gl';
