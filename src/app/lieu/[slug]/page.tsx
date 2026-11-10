// A place's own page (2026-11-10): /lieu/<id>-<name-slug>.
// Photo, category, commune, address, hours, budget, ratings, description,
// contact buttons (call, WhatsApp, directions, website, Instagram, Facebook),
// the place's upcoming events, reviews, and other places in the commune.
// The pop-up sheet links here (« Voir la page »); the sitemap lists every
// published place. Hidden places (published = false) return 404.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { SiteHeader } from '../../../components/SiteHeader';
import { SiteTicker } from '../../../components/SiteTicker';
import { SiteFooter } from '../../../components/SiteFooter';
import { PlaceImage, CategoryIcon, Stars } from '../../../components/PlaceCard';
import { PlaceReviews } from '../../../components/PlaceReviews';
import { PlaceTracker } from '../../../components/PlaceTracker';
import { EventCard } from '../../../components/EventCard';
import { serverPlace, serverPlaceEvents, serverPlaces } from '../../../lib/supabaseServer';
import { categoryOf, getAverageRating, CATEGORY_PATH } from '../../../lib/categories';
import { communeHref, canonicalCommune, sameCommune } from '../../../lib/communes';
import { placeHref, placeIdFromParam, telHref, whatsappHref, directionsHref, osmHref, socialHref, websiteHref } from '../../../lib/places';
import { withUtm } from '../../../lib/utm';
import { ldJson } from '../../../lib/jsonld';
import { IconPin, IconPhone, IconExternalLink, IconArrowRight, IconStar, IconClock } from '../../../components/icons';

export const revalidate = 300;

const SITE = 'https://www.kinshasalabel.com';
const safeImg = (u: unknown) => (typeof u === 'string' && /^https:\/\//.test(u) ? u : null);

async function load(slug: string) {
  const id = placeIdFromParam(slug);
  if (id === null) return null;
  return serverPlace(id);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await load(slug);
  if (!p) return { title: 'Lieu introuvable — Kinshasa Label' };
  const cat = categoryOf(p.vertical);
  const description = (String(p.description || '').replace(/\s+/g, ' ').trim() || `${p.place_type || cat.label} à ${p.commune}, Kinshasa.`).slice(0, 160);
  const img = safeImg(p.image_url);
  return {
    title: `${p.name} — ${p.place_type || cat.label} à ${p.commune}, Kinshasa`,
    description,
    alternates: { canonical: placeHref(p) },
    openGraph: { title: p.name, description, type: 'website', ...(img ? { images: [img] } : {}) },
  };
}

function schemaType(p: any): string {
  const t = `${p.place_type || ''}`.toLowerCase();
  if (/h[oô]tel|appart|r[ée]sidence|lodge|guest|auberge|flat/.test(t)) return 'LodgingBusiness';
  if (/bar|lounge|club|nganda|terrasse/.test(t)) return 'BarOrPub';
  if (/caf[ée]|coffee/.test(t)) return 'CafeOrCoffeeShop';
  if (p.vertical === 'kin_food' || /restau|grill|pizz|fast|snack|cuisine/.test(t)) return 'Restaurant';
  return 'LocalBusiness';
}

export default async function PlacePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await load(slug);
  if (!p) notFound();
  const canonical = placeHref(p);
  if (slug !== canonical.slice('/lieu/'.length)) permanentRedirect(canonical);

  const [events, all] = await Promise.all([serverPlaceEvents(p.id), serverPlaces()]);
  const nearby = all.filter((x) => x.id !== p.id && sameCommune(x.commune, p.commune)).sort((a, b) => (a.vertical === p.vertical ? -1 : 0) - (b.vertical === p.vertical ? -1 : 0)).slice(0, 4);

  const cat = categoryOf(p.vertical);
  const commune = canonicalCommune(p.commune) || p.commune;
  const avg = getAverageRating(p);
  const img = safeImg(p.image_url);
  const tel = telHref(p.phone);
  const wa = whatsappHref(p);
  const dir = directionsHref(p);
  const osm = osmHref(p);
  const web = websiteHref(p.website);
  const ig = socialHref('instagram', p.instagram);
  const fb = socialHref('facebook', p.facebook);
  const url = `${SITE}${canonical}`;
  const share = `https://wa.me/?text=${encodeURIComponent(`${p.name} (${commune}) — via Kinshasa Label\n${url}`)}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': schemaType(p),
    name: p.name,
    url,
    ...(p.description ? { description: p.description } : {}),
    ...(img ? { image: [img] } : {}),
    ...(p.phone ? { telephone: p.phone } : {}),
    ...(p.budget ? { priceRange: p.budget } : {}),
    address: { '@type': 'PostalAddress', ...(p.address ? { streetAddress: p.address } : {}), addressLocality: commune, addressRegion: 'Kinshasa', addressCountry: 'CD' },
    ...(p.lat != null && p.lng != null ? { geo: { '@type': 'GeoCoordinates', latitude: Number(p.lat), longitude: Number(p.lng) } } : {}),
    ...(avg !== null && p.rating_count > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: avg.toFixed(1), reviewCount: p.rating_count } } : {}),
    ...([web, ig, fb].filter(Boolean).length ? { sameAs: [web, ig, fb].filter(Boolean) } : {}),
  };

  const pill = 'inline-flex items-center gap-1.5 h-11 px-5 rounded-full font-bold no-underline';

  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader below={<SiteTicker />} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(jsonLd) }} />
      <PlaceTracker placeId={p.id} />

      <div className="max-w-[1100px] w-full mx-auto px-4 md:px-6 py-6 md:py-10 flex-1">
        <nav className="text-sm text-brand-muted mb-4 flex flex-wrap gap-1" aria-label="Fil d’Ariane">
          <Link href={CATEGORY_PATH[cat.id as keyof typeof CATEGORY_PATH] || '/'} className="text-brand-blue-deep font-semibold no-underline">{cat.label}</Link>
          <span aria-hidden="true">›</span>
          <Link href={communeHref(commune)} className="text-brand-blue-deep font-semibold no-underline">{commune}</Link>
          <span aria-hidden="true">›</span>
          <span className="truncate">{p.name}</span>
        </nav>

        <div className="grid gap-6 md:gap-10 md:grid-cols-[1.2fr_1fr] items-start">
          <div className="relative aspect-[4/3] rounded-3xl overflow-hidden border border-brand-line bg-brand-bg">
            <PlaceImage src={img} alt={p.name} vertical={p.vertical} className="w-full h-full" />
          </div>

          <div className="flex flex-col gap-4 min-w-0">
            <span className="self-start inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-white border border-brand-line" style={{ color: cat.color }}>
              <CategoryIcon id={p.vertical} size={13} /> {cat.label}{p.place_type ? ` · ${p.place_type}` : ''}
            </span>
            <h1 className="font-display text-3xl md:text-5xl font-extrabold text-brand-ink leading-tight m-0 break-words">{p.name}</h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold text-brand-muted">
              <Link href={communeHref(commune)} className="inline-flex items-center gap-1 text-brand-blue-deep no-underline"><IconPin size={14} /> {commune}</Link>
              {p.budget && <span className="text-brand-ink">{p.budget}</span>}
              <span className="inline-flex items-center gap-1.5 text-brand-ink">
                <Stars value={avg ?? 0} size={15} />
                {avg !== null ? <><strong>{avg.toFixed(1)}</strong> · {p.rating_count} avis</> : 'Pas encore noté'}
              </span>
              {p.google_rating != null && (
                <span className="inline-flex items-center gap-1" title="Note relevée sur Google, indicative">
                  Google <strong className="text-brand-ink">{Number(p.google_rating).toFixed(1).replace('.', ',')}</strong>
                  <IconStar size={12} filled className="text-brand-yellow" />
                  {p.google_reviews ? <>({p.google_reviews})</> : null}
                </span>
              )}
            </div>

            {p.address && <p className="m-0 text-base text-brand-ink"><strong>Adresse :</strong> {p.address}</p>}
            {p.hours && (
              <p className="m-0 text-base text-brand-ink whitespace-pre-line inline-flex gap-2">
                <IconClock size={16} className="mt-1 shrink-0" /> <span>{p.hours}</span>
              </p>
            )}

            <div className="flex flex-wrap gap-2 mt-1">
              {wa && <a href={wa} data-track="whatsapp" data-place={p.id} target="_blank" rel="noopener noreferrer" className={`${pill} bg-[#25D366] text-white`}>WhatsApp</a>}
              {tel && <a href={tel} data-track="call" data-place={p.id} className={`${pill} bg-brand-ink text-white`}><IconPhone size={14} /> Appeler</a>}
              {dir && <a href={dir} data-track="directions" data-place={p.id} target="_blank" rel="noopener noreferrer" className={`${pill} bg-brand-blue text-white`}><IconExternalLink size={14} /> Itinéraire</a>}
            </div>
            {(web || ig || fb || osm) && (
              <div className="flex flex-wrap gap-2">
                {web && <a href={withUtm(web, 'fiche_lieu')} data-track="website" data-place={p.id} target="_blank" rel="noopener noreferrer" className={`${pill} border-2 border-brand-line text-brand-ink h-10 text-sm`}>Site web ↗</a>}
                {ig && <a href={ig} data-track="instagram" data-place={p.id} target="_blank" rel="noopener noreferrer" className={`${pill} border-2 border-brand-line text-brand-ink h-10 text-sm`}>Instagram ↗</a>}
                {fb && <a href={fb} data-track="facebook" data-place={p.id} target="_blank" rel="noopener noreferrer" className={`${pill} border-2 border-brand-line text-brand-ink h-10 text-sm`}>Facebook ↗</a>}
                {osm && <a href={osm} data-track="directions" data-place={p.id} target="_blank" rel="noopener noreferrer" className={`${pill} border-2 border-brand-line text-brand-ink h-10 text-sm`}>Voir sur la carte ↗</a>}
              </div>
            )}
          </div>
        </div>

        {p.description && (
          <section className="mt-8 max-w-[760px]">
            <h2 className="font-display text-2xl font-extrabold text-brand-ink m-0 mb-3">À propos</h2>
            <p className="text-[17px] md:text-lg text-brand-ink/85 leading-relaxed whitespace-pre-line m-0">{p.description}</p>
          </section>
        )}

        {events.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-2xl font-extrabold text-brand-ink m-0 mb-4">Événements à venir</h2>
            <ul className="list-none p-0 m-0 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {events.map((e) => (
                <li key={e.id}><EventCard evt={e} /></li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-10 max-w-[760px] flex flex-col gap-5">
          <PlaceReviews place={p} />
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <a href={share} data-track="share" data-place={p.id} target="_blank" rel="noopener noreferrer" className={`${pill} bg-[#25D366] text-white`}>Partager sur WhatsApp</a>
          <Link href={communeHref(commune)} className={`${pill} border-2 border-brand-line text-brand-ink`}>Guide de {commune} <IconArrowRight size={14} /></Link>
        </div>

        {nearby.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-2xl font-extrabold text-brand-ink m-0 mb-4">Aussi à {commune}</h2>
            <ul className="list-none p-0 m-0 grid gap-4 grid-cols-2 lg:grid-cols-4">
              {nearby.map((x) => (
                <li key={x.id}>
                  <Link href={placeHref(x)} className="block bg-white rounded-2xl border border-brand-line shadow-card overflow-hidden no-underline hover:border-brand-blue">
                    <div className="aspect-[4/3]"><PlaceImage src={safeImg(x.image_url)} alt={x.name} vertical={x.vertical} className="w-full h-full" /></div>
                    <div className="p-3">
                      <span className="text-[11px] font-bold" style={{ color: categoryOf(x.vertical).color }}>{x.place_type || categoryOf(x.vertical).label}</span>
                      <h3 className="font-display text-base font-bold text-brand-ink m-0 leading-snug line-clamp-2">{x.name}</h3>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <SiteFooter />
    </main>
  );
}

