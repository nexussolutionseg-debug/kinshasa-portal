// Kin Stats: the 24 communes shaded by page views (darker = more viewed).
// Outlines are the site's approximate commune areas (src/data/communes.json).
'use client';

import { useMemo, useState } from 'react';
import communesGeo from '../../data/communes.json';
import { communeKey } from '../../lib/communes';

type Feature = { properties: { name: string; district?: string }; geometry: { type: string; coordinates: any } };

const W = 520;
const fmt = new Intl.NumberFormat('fr-FR');

// Sequential single hue: brand-blue-soft → brand-blue-deep.
const LO = [0xe6, 0xf1, 0xff];
const HI = [0x0e, 0x5f, 0xc9];
const shade = (t: number) => `rgb(${LO.map((c, i) => Math.round(c + (HI[i] - c) * t)).join(',')})`;

export function CommuneMap({ rows }: { rows: { label: string; value: number }[] }) {
  const [hover, setHover] = useState<{ name: string; v: number; x: number; y: number } | null>(null);
  const byKey = useMemo(() => new Map(rows.map((r) => [communeKey(r.label), r.value])), [rows]);
  const max = Math.max(1, ...rows.map((r) => r.value));

  const { paths, H } = useMemo(() => {
    const feats = (communesGeo as { features: Feature[] }).features;
    const rings = (g: Feature['geometry']): number[][][] => (g.type === 'Polygon' ? g.coordinates : g.coordinates.flat());
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const f of feats) for (const ring of rings(f.geometry)) for (const [x, y] of ring) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    const kx = Math.cos(((minY + maxY) / 2) * Math.PI / 180);
    const scale = (W - 8) / ((maxX - minX) * kx);
    const H = Math.round((maxY - minY) * scale + 8);
    const px = (x: number) => 4 + (x - minX) * kx * scale;
    const py = (y: number) => 4 + (maxY - y) * scale;
    const paths = feats.map((f) => ({
      name: f.properties.name,
      d: rings(f.geometry).map((ring) => ring.map(([x, y], i) => `${i ? 'L' : 'M'}${px(x).toFixed(1)},${py(y).toFixed(1)}`).join('') + 'Z').join(''),
    }));
    return { paths, H };
  }, []);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" role="img" aria-label="Carte des communes de Kinshasa colorée selon les pages vues">
        {paths.map((p) => {
          const v = byKey.get(communeKey(p.name)) || 0;
          const fill = v ? shade(Math.sqrt(v / max)) : '#F5F8FE';
          return (
            <path
              key={p.name}
              d={p.d}
              fill={fill}
              stroke="#FFFFFF"
              strokeWidth={1.5}
              className="cursor-pointer transition-opacity hover:opacity-80"
              onPointerMove={(e) => {
                const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                setHover({ name: p.name, v, x: e.clientX - r.left, y: e.clientY - r.top });
              }}
              onPointerLeave={() => setHover(null)}
            >
              <title>{`${p.name} : ${fmt.format(v)} vues`}</title>
            </path>
          );
        })}
      </svg>
      {hover && (
        <div className="pointer-events-none absolute rounded-xl bg-brand-ink text-white text-xs px-3 py-2 shadow-lift whitespace-nowrap"
          style={{ left: Math.max(0, hover.x - 60), top: Math.max(0, hover.y - 48) }}>
          <b>{hover.name}</b> · {fmt.format(hover.v)} vues
        </div>
      )}
      <div className="flex items-center gap-2 mt-2 text-[11px] text-brand-muted">
        <span>Moins vue</span>
        <span className="h-2 w-24 rounded-full" style={{ background: `linear-gradient(90deg, ${shade(0.05)}, ${shade(1)})` }} aria-hidden />
        <span>Plus vue</span>
        <span className="ml-auto">Contours approximatifs</span>
      </div>
    </div>
  );
}
