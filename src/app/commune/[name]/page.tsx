// Commune page (server). Clean addresses (client audit): /commune/mont-ngafula,
// /commune/ndjili… Any other spelling (/commune/Mont%20Ngafula, /commune/N'djili)
// is permanently redirected to the clean one; an unknown commune is a 404.
// Places, events and news are rendered on the server (with schema.org data)
// and rebuilt every 5 minutes.
import { notFound, permanentRedirect } from 'next/navigation';
import { CommuneClient } from '../CommuneClient';
import { COMMUNE_NAMES, canonicalCommune, communeSlug, sameCommune } from '../../../lib/communes';
import { serverEvents, serverPlaces } from '../../../lib/supabaseServer';
import { getNewsFeedSafe } from '../../../lib/newsFeed';
import { ldJson, placesListJsonLd } from '../../../lib/jsonld';

export const revalidate = 300;

export function generateStaticParams() {
  return COMMUNE_NAMES.map((n) => ({ name: communeSlug(n) }));
}

export default async function CommunePage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  let raw = name;
  try {
    raw = decodeURIComponent(name);
  } catch {
    /* keep as is */
  }
  const commune = canonicalCommune(raw.trim());
  if (!commune) notFound();
  if (name !== communeSlug(commune)) permanentRedirect(`/commune/${communeSlug(commune)}`);

  const [allPlaces, allEvents, news] = await Promise.all([serverPlaces(), serverEvents(), getNewsFeedSafe()]);
  const places = allPlaces.filter((p) => sameCommune(p.commune, commune));
  const events = allEvents.filter((e) => sameCommune(e.commune, commune));
  return (
    <>
      {places.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(placesListJsonLd(places, `Bonnes adresses à ${commune}, Kinshasa`, `/commune/${communeSlug(commune)}`)) }} />
      )}
      <CommuneClient
        communeName={commune}
        initialPlaces={places}
        initialEvents={events}
        initialNews={news ? { items: news.items, sources: news.sources, updatedAt: news.updatedAt } : null}
      />
    </>
  );
}
