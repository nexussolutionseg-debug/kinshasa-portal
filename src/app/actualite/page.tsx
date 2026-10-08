// Kin Actualité (server). The headlines are fetched on the server and
// already in the HTML (client audit: Google must see the news, not a
// "Chargement…" message). Rebuilt every 15 minutes, like the feed itself.
import { ActualiteClient } from './ActualiteClient';
import { getNewsFeedSafe } from '../../lib/newsFeed';
import { getRate } from '../../lib/rates';

export const revalidate = 900;

export const metadata = {
  title: 'Kin Actualité — L’info de Kinshasa en direct',
  description:
    "Toute l'actualité sociale de Kinshasa réunie depuis les médias congolais (Radio Okapi, Actualite.cd, Mediacongo, Le Point.cd…), mise à jour en continu, commune par commune.",
  alternates: { canonical: '/actualite' },
};

export default async function ActualitePage() {
  const [news, rate] = await Promise.all([getNewsFeedSafe(), getRate()]);
  return (
    <ActualiteClient
      initialNews={news ? { items: news.items, sources: news.sources, updatedAt: news.updatedAt } : null}
      initialRate={rate}
    />
  );
}
