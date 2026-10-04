// Shared MapLibre basemap for the homepage and commune pages.
//
// Esri's free, no-API-key raster "World Light Gray" canvas (base + labels).
// Switched from the Dark Gray variant with the v4 light/joyful redesign so
// the map matches the white page. Same host as before
// (server.arcgisonline.com) — already allowed by the CSP in next.config.js.
// (History: CARTO's GL style was dropped on 2026-09-01 because its tiles
// now require an API key.)
import type * as maplibregl from 'maplibre-gl';

export const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'esri-light-gray-base': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: 'Tiles &copy; Esri',
    },
    'esri-light-gray-labels': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
    },
  },
  layers: [
    { id: 'esri-light-gray-base-layer', type: 'raster', source: 'esri-light-gray-base' },
    { id: 'esri-light-gray-labels-layer', type: 'raster', source: 'esri-light-gray-labels' },
  ],
  // MapLibre's public demo glyph server — needed for commune name labels.
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
};

// Pin colors per category, in the logo palette.
export const PIN_COLORS: Record<string, string> = {
  kin_food: '#D21C2E',
  kin_places: '#1A82F5',
  kin_culture: '#E5A800',
  kin_style: '#C2185B',
  kin_securite: '#0A2A66',
};
