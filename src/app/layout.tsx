import './globals.css';
import '@fontsource-variable/outfit';
import { Analytics } from '@vercel/analytics/next';
import { CookieConsentBanner } from '../components/CookieConsentBanner';
import { MobileTabBar } from '../components/MobileTabBar';

export const metadata = {
  title: 'Kinshasa Label — Vis Kin autrement',
  description:
    "Le guide joyeux de Kinshasa : les meilleures adresses, la culture, les sorties du week-end et l'actualité de la ville en direct, commune par commune sur une carte interactive.",
};

export const viewport = {
  themeColor: '#1A82F5',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="bg-brand-bg text-brand-ink pb-16 lg:pb-0">
        {children}
        <MobileTabBar />
        {/* Vercel Web Analytics — page views, referrers, devices, no cookies. */}
        <Analytics />
        {/* Google Analytics — only actually loads once a visitor accepts in
            the banner; see src/components/CookieConsentBanner.tsx. */}
        <CookieConsentBanner />
      </body>
    </html>
  );
}
