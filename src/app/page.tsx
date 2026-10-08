// Homepage (server). Loads places, events, banners, settings and the news
// feed on the server so the HTML already contains the real content (for
// Google and link previews), then hands it to the interactive client part.
// Rebuilt every 5 minutes (ISR); the browser refreshes the data on load.
import { HomeClient } from './HomeClient';
import { serverBanners, serverEvents, serverPlaces, serverSettingsRaw } from '../lib/supabaseServer';
import { normalizeSettings } from '../lib/siteSettings';
import { getNewsFeedSafe } from '../lib/newsFeed';
import { ldJson } from '../lib/jsonld';
import { SITE_URL } from '../lib/utm';

export const revalidate = 300;

export default async function HomePage() {
  const [places, events, banners, settingsRaw, news] = await Promise.all([
    serverPlaces(),
    serverEvents(),
    serverBanners(),
    serverSettingsRaw(),
    getNewsFeedSafe(),
  ]);
  const site = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Kinshasa Label',
    alternateName: 'Vis Kin autrement',
    url: SITE_URL,
    inLanguage: 'fr-CD',
    publisher: { '@type': 'Organization', name: 'Kinshasa Label', url: SITE_URL, logo: `${SITE_URL}/logo.svg`, sameAs: ['https://www.instagram.com/kinshasalabel'] },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(site) }} />
      <HomeClient
        initial={{
          places,
          events,
          banners,
          settings: normalizeSettings(settingsRaw),
          news: news ? { items: news.items, sources: news.sources, updatedAt: news.updatedAt } : null,
        }}
      />
    </>
  );
}
