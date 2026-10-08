// Structured data (schema.org) so Google understands places and events.
// Only our own visitor ratings are used for aggregateRating.
import { SITE_URL } from './utm';
import { categoryOf, getAverageRating } from './categories';

const BUSINESS_TYPE: Record<string, string> = {
  kin_food: 'Restaurant',
  kin_places: 'LocalBusiness',
  kin_culture: 'TouristAttraction',
  kin_style: 'Store',
  kin_securite: 'PoliceStation',
};

export function placeJsonLd(p: any) {
  const avg = getAverageRating(p);
  const type = /h[ôo]tel|flat|r[ée]sidence|guest|appartement|motel|pension|logement|maison d/i.test(p.place_type || '')
    ? 'LodgingBusiness'
    : BUSINESS_TYPE[p.vertical] || 'LocalBusiness';
  return {
    '@type': type,
    name: p.name,
    description: p.description || undefined,
    image: p.image_url || undefined,
    telephone: p.phone || undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: p.address || undefined,
      addressLocality: p.commune ? `${p.commune}, Kinshasa` : 'Kinshasa',
      addressCountry: 'CD',
    },
    geo: p.lat && p.lng ? { '@type': 'GeoCoordinates', latitude: Number(p.lat), longitude: Number(p.lng) } : undefined,
    hasMap: p.google_maps_url || undefined,
    priceRange: p.budget || undefined,
    aggregateRating:
      avg !== null && p.rating_count > 0
        ? { '@type': 'AggregateRating', ratingValue: Number(avg.toFixed(1)), reviewCount: p.rating_count, bestRating: 5, worstRating: 1 }
        : undefined,
    additionalType: categoryOf(p.vertical).label,
  };
}

export function placesListJsonLd(places: any[], name: string, path: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    url: `${SITE_URL}${path}`,
    numberOfItems: places.length,
    itemListElement: places.slice(0, 100).map((p, i) => ({ '@type': 'ListItem', position: i + 1, item: placeJsonLd(p) })),
  };
}

export function eventsJsonLd(events: any[]) {
  return events.slice(0, 50).map((e) => ({
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: e.title,
    description: e.description || undefined,
    startDate: e.event_date || undefined,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: { '@type': 'Place', name: e.commune ? `${e.commune}, Kinshasa` : 'Kinshasa', address: { '@type': 'PostalAddress', addressLocality: e.commune || 'Kinshasa', addressRegion: 'Kinshasa', addressCountry: 'CD' } },
    organizer: { '@type': 'Organization', name: 'Kinshasa Label', url: SITE_URL },
  }));
}

/** <script type="application/ld+json"> content, with "<" escaped so text can't break out of the tag. */
export const ldJson = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c');
