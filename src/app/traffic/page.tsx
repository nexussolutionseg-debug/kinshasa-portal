// /traffic — Kin Traffic: indicative traffic level for each commune
// (client audit, 2026-10-08: one page per category). Static content.
import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '../../components/SiteHeader';
import { SiteTicker } from '../../components/SiteTicker';
import { SiteFooter } from '../../components/SiteFooter';
import { PageHero } from '../../components/PageHero';
import { CategoryIcon } from '../../components/PlaceCard';
import { categoryOf } from '../../lib/categories';
import { TRAFFIC_COLORS, TRAFFIC_LABELS, getTrafficLevel } from '../../lib/traffic';
import { COMMUNE_NAMES, communeHref } from '../../lib/communes';
import { IconArrowRight, IconMap } from '../../components/icons';

export const metadata: Metadata = {
  title: 'Kin Traffic — Où ça bouchonne à Kinshasa ?',
  description: 'Le niveau de circulation habituel dans les 24 communes de Kinshasa : boulevard du 30 Juin, boulevard Lumumba, Rond-Point Victoire… Indicatif, pour mieux prévoir tes trajets.',
  alternates: { canonical: '/traffic' },
};

export default function TrafficPage() {
  const cat = categoryOf('kin_traffic');
  const rows = COMMUNE_NAMES.map((name) => ({ name, level: getTrafficLevel(name) })).filter((r) => r.level);
  const order = ['heavy', 'moderate', 'light'];
  const levels = [...new Set(rows.map((r) => r.level as string))].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader below={<SiteTicker />} />
      <PageHero
        gradient={cat.gradient}
        eyebrow={
          <span className="inline-flex items-center gap-2 bg-white/90 text-brand-ink text-xs font-extrabold uppercase tracking-wider px-3 py-1.5 rounded-full">
            <CategoryIcon id="kin_traffic" size={14} /> Indicatif
          </span>
        }
        title={cat.label}
        intro="Où ça bouchonne ? Le niveau de circulation habituel dans chaque commune, pour mieux prévoir tes trajets. Ce ne sont pas des données en temps réel."
      >
        <Link href="/?carte=kin_traffic#explorer" className="mt-5 inline-flex items-center gap-2 bg-white text-brand-ink font-extrabold px-6 py-3.5 rounded-full no-underline hover:bg-brand-yellow">
          <IconMap size={18} /> Voir sur la carte
        </Link>
      </PageHero>
      <div className="max-w-[1400px] w-full mx-auto px-4 md:px-6 py-8 pb-16 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {levels.map((lvl) => (
          <section key={lvl} className="bg-white rounded-3xl border border-brand-line shadow-card p-5">
            <h2 className="flex items-center gap-2 font-display text-xl font-extrabold m-0 mb-3" style={{ color: TRAFFIC_COLORS[lvl as keyof typeof TRAFFIC_COLORS] }}>
              <span className="w-3 h-3 rounded-full" style={{ background: TRAFFIC_COLORS[lvl as keyof typeof TRAFFIC_COLORS] }} />
              {TRAFFIC_LABELS[lvl as keyof typeof TRAFFIC_LABELS]}
            </h2>
            <ul className="list-none p-0 m-0 flex flex-col">
              {rows.filter((r) => r.level === lvl).map((r) => (
                <li key={r.name} className="border-b border-brand-line last:border-0">
                  <Link href={communeHref(r.name)} className="flex items-center justify-between py-2.5 text-[15px] font-semibold text-brand-ink no-underline hover:text-brand-blue-deep">
                    {r.name} <IconArrowRight size={14} className="text-brand-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <SiteFooter />
    </main>
  );
}
