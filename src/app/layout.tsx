import './globals.css';
import '@fontsource-variable/outfit';
import { Analytics } from '@vercel/analytics/next';
import { CookieConsentBanner } from '../components/CookieConsentBanner';
import { MobileTabBar } from '../components/MobileTabBar';
import { SITE_URL } from '../lib/utm';

const DESCRIPTION =
  "Le guide joyeux de Kinshasa : les meilleures adresses, la culture, les sorties du week-end et l'actualité de la ville en direct, commune par commune sur une carte interactive.";

// metadataBase + openGraph: links shared on WhatsApp / Instagram / Facebook
// show the Kinshasa Label card (src/app/opengraph-image.tsx) and the real domain.
export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Kinshasa Label — Vis Kin autrement', template: '%s · Kinshasa Label' },
  description: DESCRIPTION,
  openGraph: {
    type: 'website',
    locale: 'fr_CD',
    siteName: 'Kinshasa Label',
    title: 'Kinshasa Label — Vis Kin autrement',
    description: DESCRIPTION,
    url: SITE_URL,
  },
  twitter: { card: 'summary_large_image', title: 'Kinshasa Label — Vis Kin autrement', description: DESCRIPTION },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover', // lets env(safe-area-inset-*) work under iPhone notches / home bar
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
