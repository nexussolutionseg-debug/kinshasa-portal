// /communes — the 24 communes of Kinshasa (client audit: the homepage
// shows six, this page has them all). Server-rendered, rebuilt every 5 min.
import type { Metadata } from 'next';
import { SiteHeader } from '../../components/SiteHeader';
import { SiteTicker } from '../../components/SiteTicker';
import { SiteFooter } from '../../components/SiteFooter';
import { PageHero } from '../../components/PageHero';
import { CommuneCard } from '../../components/CommuneCard';
import communesData from '../../data/communes.json';
import { sameCommune } from '../../lib/communes';
import { serverPlaces } from '../../lib/supabaseServer';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Les 24 communes de Kinshasa',
  description: 'Gombe, Limete, Ngaliema, Bandalungwa, Kalamu, Masina… Les 24 communes de Kinshasa : caractère, bonnes adresses, circulation et actualité de chacune.',
  alternates: { canonical: '/communes' },
};

const COMMUNES: { name: string; district: string }[] = (communesData as any).communes;

export default async function CommunesPage() {
  const places = await serverPlaces();
  const districts = [...new Set(COMMUNES.map((c) => c.district))];
  let i = 0;
  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader below={<SiteTicker />} />
      <PageHero
        gradient="linear-gradient(120deg,#0A2A66 0%,#0E5FC9 45%,#1A82F5 100%)"
        eyebrow={<span className="inline-flex bg-white/15 text-white text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full">4 districts · 24 communes</span>}
        title="Les 24 communes de Kin"
        intro="Chaque commune a son caractère. Laquelle est la tienne ?"
      />
      <div className="max-w-[1400px] w-full mx-auto px-4 md:px-6 py-8 pb-16 flex flex-col gap-10">
        {districts.map((d) => (
          <section key={d} aria-labelledby={`d-${d}`}>
            <h2 id={`d-${d}`} className="font-display text-2xl md:text-3xl font-extrabold text-brand-ink m-0 mb-4">District {d}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
              {COMMUNES.filter((c) => c.district === d).map((c) => (
                <CommuneCard key={c.name} commune={c} index={i++} count={places.filter((p) => sameCommune(p.commune, c.name)).length} />
              ))}
            </div>
          </section>
        ))}
      </div>
      <SiteFooter />
    </main>
  );
}
