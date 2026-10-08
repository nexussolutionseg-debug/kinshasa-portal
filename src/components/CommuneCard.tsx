// Commune card (homepage "communes" block and /communes page).
import Link from 'next/link';
import { canonicalCommune, communeHref } from '../lib/communes';
import { communeBrief } from '../data/communeDetails';
import { getTrafficLevel, TRAFFIC_COLORS, TRAFFIC_LABELS } from '../lib/traffic';
import { SpinningWheel } from './BrandMark';

const COMMUNE_GRADIENTS = ['linear-gradient(160deg,#1A82F5,#0A2A66)', 'linear-gradient(160deg,#F04A3A,#A60E1D)', 'linear-gradient(160deg,#FFE36B,#F5B400)'];

/** Commune card (homepage and /communes): district, name, character line, places and traffic. */
export function CommuneCard({ commune, index, count }: { commune: { name: string; district: string }; index: number; count: number }) {
  const display = canonicalCommune(commune.name) || commune.name;
  const brief = communeBrief(commune.name);
  const level = getTrafficLevel(commune.name);
  const yellow = index % 3 === 2;
  return (
    <Link
      href={communeHref(commune.name)}
      className={`relative h-[190px] md:h-[210px] flex flex-col justify-end p-4 rounded-3xl overflow-hidden no-underline shadow-card hover:shadow-lift hover:-translate-y-1 transition-all ${yellow ? 'text-brand-ink' : 'text-white'}`}
      style={{ background: COMMUNE_GRADIENTS[index % 3] }}
    >
      <span className="absolute -right-8 -top-8 opacity-30 pointer-events-none">
        <SpinningWheel size={130} spin={false} />
      </span>
      <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">District {commune.district}</span>
      <span className="font-display text-xl md:text-2xl font-extrabold leading-tight">{display}</span>
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
}
