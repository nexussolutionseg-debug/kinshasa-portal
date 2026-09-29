
import './globals.css';
import { Analytics } from '@vercel/analytics/next';

export const metadata = {
  title: 'Kinshasa Label — Le Guide de Référence de Kinshasa',
  description:
    "Le guide curaté des meilleures adresses, de la culture et des événements de Kinshasa : explorez chaque commune sur une carte interactive, avec sélections, avis et sorties du week-end.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="bg-brand-navy">
        {children}
        {/* Vercel Web Analytics — page views, referrers, devices, no cookies.
            The script is safe to ship even before Web Analytics is turned on
            for the project (it just no-ops), so this goes live the moment
            it's enabled in Vercel → Project → Analytics, no redeploy needed. */}
        <Analytics />
      </body>
    </html>
  );
}
