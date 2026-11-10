// One Kin Weekend event on its own page (2026-11-10): full description,
// photo, date, commune, optional ticket/info link, WhatsApp share.
// Opened from the event cards (/weekend, commune pages) and from the
// backoffice ("Voir"). Works whatever the number of upcoming events.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteHeader } from '../../../components/SiteHeader';
import { SiteTicker } from '../../../components/SiteTicker';
import { SiteFooter } from '../../../components/SiteFooter';
import { serverEvent, serverPlace } from '../../../lib/supabaseServer';
import { placeHref } from '../../../lib/places';
import { communeHref, canonicalCommune } from '../../../lib/communes';
import { eventsJsonLd, ldJson } from '../../../lib/jsonld';
import { withUtm } from '../../../lib/utm';

export const revalidate = 60;

const SITE = 'https://www.kinshasalabel.com';
const safeImg = (u: unknown) => (typeof u === 'string' && /^https:\/\//.test(u) ? u : null);
const frDate = (d: string) =>
  new Date(`${String(d).slice(0, 10)}T12:00:00Z`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const e = await serverEvent(Number(id));
  if (!e) return { title: 'Événement introuvable — Kinshasa Label' };
  const description = String(e.description || '').replace(/\s+/g, ' ').slice(0, 160);
  const img = safeImg(e.image_url);
  return {
    title: `${e.title} — Kin Weekend`,
    description,
    alternates: { canonical: `/weekend/${e.id}` },
    openGraph: { title: e.title, description, type: 'article', ...(img ? { images: [img] } : {}) },
  };
}

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = await serverEvent(Number(id));
  if (!e) notFound();
  const img = safeImg(e.image_url);
  const commune = canonicalCommune(e.commune);
  const url = `${SITE}/weekend/${e.id}`;
  const share = `https://wa.me/?text=${encodeURIComponent(`${e.title} — Kin Weekend\n${url}`)}`;
  const past = e.event_date && new Date(`${String(e.event_date).slice(0, 10)}T23:59:59`) < new Date();
  const place = e.place_id ? await serverPlace(Number(e.place_id)) : null;
  const link = typeof e.url === 'string' && /^https?:\/\//.test(e.url) ? e.url : null;

  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader below={<SiteTicker />} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(eventsJsonLd([{ ...e, image_url: img }])[0]) }} />
      <article className="max-w-[760px] w-full mx-auto px-4 md:px-6 py-8 md:py-12 flex-1">
        <nav className="text-sm text-brand-muted mb-4" aria-label="Fil d’Ariane">
          <Link href="/weekend" className="text-brand-blue-deep font-semibold no-underline">Kin Weekend</Link> <span aria-hidden="true">›</span> Événement
        </nav>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {e.category && (
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-brand-yellow text-brand-ink px-2.5 py-1 rounded-full">{e.category}</span>
          )}
          {e.event_date && <span className="text-sm text-brand-muted first-letter:uppercase">{frDate(e.event_date)}</span>}
          {commune && (
            <Link href={communeHref(commune)} className="text-sm font-semibold text-brand-blue-deep no-underline">· {commune}</Link>
          )}
        </div>
        {past && (
          <p className="text-sm font-semibold bg-brand-bg border border-brand-line rounded-xl px-3 py-2 mb-4">Cet événement est passé.</p>
        )}
        <h1 className="font-display text-3xl md:text-5xl font-extrabold text-brand-ink leading-tight m-0 mb-5 break-words">{e.title}</h1>
        {img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={e.title} className="w-full max-h-[70vh] object-contain rounded-3xl bg-brand-bg border border-brand-line mb-6" />
        )}
        {place && (
          <p className="m-0 mb-5 text-base">
            <strong>Lieu :</strong>{' '}
            <Link href={placeHref(place)} className="text-brand-blue-deep font-bold">{place.name}{place.address ? `, ${place.address}` : ''} →</Link>
          </p>
        )}
        {e.description && (
          <div className="text-[17px] md:text-lg text-brand-ink/85 leading-relaxed whitespace-pre-line break-words">{e.description}</div>
        )}
        <div className="mt-8 flex flex-wrap gap-3">
          {link && (
            <a href={withUtm(link, 'kin_weekend')} target="_blank" rel="noopener noreferrer" className="inline-flex items-center h-11 px-5 rounded-full bg-brand-ink text-white font-bold no-underline">
              Billets / infos ↗
            </a>
          )}
          <a href={share} target="_blank" rel="noopener noreferrer" className="inline-flex items-center h-11 px-5 rounded-full bg-[#25D366] text-white font-bold no-underline">
            Partager sur WhatsApp
          </a>
          <Link href="/weekend" className="inline-flex items-center h-11 px-5 rounded-full border-2 border-brand-line text-brand-ink font-bold no-underline">
            ← Tout le programme
          </Link>
        </div>
      </article>
      <SiteFooter />
    </main>
  );
}
