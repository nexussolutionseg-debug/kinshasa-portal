// MapLibre GL v6 runs map rendering in a module Web Worker loaded from
// `maplibre-gl-worker.mjs` (which imports `maplibre-gl-shared.mjs`) next to
// the main script. Once Next.js bundles the library, that relative path
// points into /_next/static/chunks/ where the file doesn't exist, so the
// map silently fails ("Worker failed to load"). We copy both files to
// /public/maplibre/ before every build/dev run (always matching the
// installed version) and src/lib/maplibre.ts calls setWorkerUrl() on them.
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const dist = path.dirname(require.resolve('maplibre-gl/package.json')) + '/dist';
const out = path.resolve('public/maplibre');
mkdirSync(out, { recursive: true });
for (const f of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  copyFileSync(path.join(dist, f), path.join(out, f));
}
console.log('maplibre worker files copied to public/maplibre');
