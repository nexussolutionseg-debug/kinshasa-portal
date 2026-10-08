// Per-commune <title> and description (the page itself is a client
// component, so its metadata lives here). Helps each commune show up in
// Google on its own ("Hôtels à Limete", "Que faire à Gombe"…).
import type { Metadata } from 'next';
import { COMMUNE_DETAILS } from '../../../data/communeDetails';
import { canonicalCommune, communeHref } from '../../../lib/communes';

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  const raw = decodeURIComponent(name);
  const commune = canonicalCommune(raw) || raw;
  const tagline = (COMMUNE_DETAILS as Record<string, { tagline?: string }>)[commune]?.tagline;
  const description = `${commune}, Kinshasa : bonnes adresses, hébergements, sorties, sécurité, circulation et actualité de la commune.${tagline ? ` ${tagline}` : ''}`;
  return {
    title: `${commune} — le guide de la commune`,
    description,
    alternates: { canonical: communeHref(commune) },
    openGraph: { title: `${commune} — Kinshasa Label`, description },
  };
}

export default function CommuneLayout({ children }: { children: React.ReactNode }) {
  return children;
}
