// Kin Stats partner page (2026-11-01): /stats/<signed token>, created from
// Backoffice → Statistiques → « Partager avec un partenaire ». Read-only,
// no login, not indexed, no cookie banner or Google Analytics on it.
import type { Metadata } from 'next';
import Link from 'next/link';
import { KinshasaMark } from '../../../components/BrandMark';
import { StatsDashboard } from '../../../components/stats/StatsDashboard';
import { verifyShare } from '../../../lib/statsShare';
import { gaConfigured } from '../../../lib/ga4';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Statistiques',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};

export default async function PartnerStatsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const p = token === 'demo' && !gaConfigured() ? { n: 'Démo (données d’exemple)' } : verifyShare(decodeURIComponent(token));

  return (
    <main className="min-h-screen bg-brand-bg text-brand-ink">
      <header className="bg-white border-b border-brand-line">
        <div className="max-w-[1150px] mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="no-underline"><KinshasaMark size={44} /></Link>
          <div className="min-w-0">
            <p className="font-display text-xl md:text-2xl font-extrabold m-0 leading-tight">
              Kin Stats <span className="text-brand-red">·</span> Kinshasa Label
            </p>
            <p className="text-sm text-brand-muted m-0 truncate">
              {p ? <>Tableau de bord partagé avec <b className="text-brand-ink">{p.n}</b></> : 'Tableau de bord partenaire'}
            </p>
          </div>
        </div>
      </header>
      <div className="max-w-[1150px] mx-auto px-4 py-6 md:py-8">
        {p ? (
          <StatsDashboard share={decodeURIComponent(token)} />
        ) : (
          <div className="rounded-2xl border border-brand-line bg-white p-6 text-sm font-semibold">
            Ce lien de statistiques a expiré ou n’est plus valide. Demande un nouveau lien à l’équipe Kinshasa Label
            (<a href="mailto:contact@kinshasalabel.com" className="text-brand-blue-deep">contact@kinshasalabel.com</a>).
          </div>
        )}
      </div>
    </main>
  );
}
