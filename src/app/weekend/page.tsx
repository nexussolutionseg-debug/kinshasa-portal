// /weekend — Kin Weekend programme. Only linked from the menu, tiles and
// hero once there are WEEKEND_MIN upcoming events (client audit), but the
// page always works. Server-rendered with schema.org Event data.
import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '../../components/SiteHeader';
import { SiteTicker } from '../../components/SiteTicker';
import { SiteFooter } from '../../components/SiteFooter';
import { PageHero } from '../../components/PageHero';
import { EventCard } from '../../components/EventCard';
import { serverEvents } from '../../lib/supabaseServer';
import { upcoming } from '../../lib/events';
import { eventsJsonLd, ldJson } from '../../lib/jsonld';
import { IconArrowRight } from '../../components/icons';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Kin Weekend — Que faire à Kinshasa ce weekend ?',
  description: 'Concerts, expos, soirées, marchés : le programme des sorties du weekend à Kinshasa, commune par commune.',
  alternates: { canonical: '/weekend' },
};

export default async function WeekendPage() {
  const events = upcoming(await serverEvents());
  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader below={<SiteTicker />} />
      {events.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(eventsJsonLd(events)) }} />}
      <PageHero
        gradient="linear-gradient(120deg,#FFE36B 0%,#FCD933 50%,#F5B400 100%)"
        dark={false}
        eyebrow={<span className="inline-flex bg-brand-ink text-brand-yellow text-xs font-extrabold uppercase tracking-wider px-3 py-1.5 rounded-full">Kin Weekend</span>}
        title={<>On sort où <span className="text-brand-red">ce weekend ?</span></>}
        intro="Concerts, expos, soirées et marchés : le programme des sorties à Kinshasa."
      />
      <div className="max-w-[1400px] w-full mx-auto px-4 md:px-6 py-8 pb-16">
        {events.length > 0 ? (
          <ul className="list-none p-0 m-0 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => (
              <li key={e.id}>
                <EventCard evt={e} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-3xl bg-white border border-brand-line shadow-card p-8 md:p-12 text-center flex flex-col items-center gap-3">
            <h2 className="font-display text-2xl font-extrabold text-brand-ink m-0">Le programme se prépare</h2>
            <p className="text-brand-muted m-0 max-w-md">Tu organises un concert, une expo ou une soirée ? Envoie-le-nous, on l’ajoute au programme.</p>
            <Link href="/devenir-partenaire" className="mt-1 inline-flex items-center gap-1.5 bg-brand-ink text-white font-bold px-6 py-3 rounded-full no-underline">
              Propose un événement <IconArrowRight size={14} />
            </Link>
          </div>
        )}
      </div>
      <SiteFooter />
    </main>
  );
}
