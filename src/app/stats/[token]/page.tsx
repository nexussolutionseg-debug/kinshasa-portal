// Kin Stats partner page (2026-11-01): /stats/<link>, created and managed in
// Backoffice → Statistiques → « Liens partenaires ». Read-only, no login,
// not indexed, no cookie banner or Google Analytics on it. Each opening is
// counted on the link (visible to the team).
import type { Metadata } from 'next';
import Link from 'next/link';
import { KinshasaMark } from '../../../components/BrandMark';
import { StatsDashboard } from '../../../components/stats/StatsDashboard';
import { openStatsLink } from '../../../lib/statsLinks';
import { gaConfigured } from '../../../lib/ga4';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Statistiques',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};

export default async function PartnerStatsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const demo = token === 'demo' && !gaConfigured();
  const link = demo ? null : await openStatsLink(token, true);
  const name = demo ? 'Démo (données d’exemple)' : link?.name;

  return (
    <main className="min-h-screen bg-brand-bg text-brand-ink">
      <header className="bg-white border-b border-brand-line">
        <div className="max-w-[1200px] mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="no-underline"><KinshasaMark size={44} /></Link>
          <div className="min-w-0">
            <p className="font-display text-xl md:text-2xl font-extrabold m-0 leading-tight">
              Kin Stats <span className="text-brand-red">·</span> Kinshasa Label
            </p>
            <p className="text-sm text-brand-muted m-0 truncate">
              {name ? <>Tableau de bord partagé avec <b className="text-brand-ink">{name}</b></> : 'Tableau de bord partenaire'}
            </p>
          </div>
        </div>
      </header>
      <div className="max-w-[1200px] mx-auto px-4 py-6 md:py-8">
        {name ? (
          <StatsDashboard share={token} />
        ) : (
          <div className="rounded-2xl border border-brand-line bg-white p-6 text-sm font-semibold">
            Ce lien de statistiques a expiré ou a été désactivé. Demande un nouveau lien à l’équipe Kinshasa Label
            (<a href="mailto:contact@kinshasalabel.com" className="text-brand-blue-deep">contact@kinshasalabel.com</a>).
          </div>
        )}
      </div>
    </main>
  );
}
