import { SiteHeader } from '../../components/SiteHeader';
import { SiteTicker } from '../../components/SiteTicker';
import { SiteFooter } from '../../components/SiteFooter';
import { SocialLinks } from '../../components/SocialLinks';
import { IconMail, IconGlobe } from '../../components/icons';

export const metadata = {
  title: 'Contact',
  description: 'Une question, une suggestion, un lieu à signaler ? Écris à l’équipe Kinshasa Label.',
  alternates: { canonical: '/contact' },
};

const CONTACT_EMAIL = 'contact@kinshasalabel.com';

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-brand-bg text-brand-ink flex flex-col">
      <SiteHeader below={<SiteTicker />} />

      <div className="max-w-[640px] mx-auto px-4 md:px-6 py-14 md:py-20 flex-1 w-full text-center">
        <h1 className="font-display text-3xl md:text-4xl font-semibold text-brand-ink mb-3">
          Écris-nous
        </h1>
        <p className="text-base text-brand-ink/70 leading-relaxed mb-10">
          Une question, une suggestion, un lieu à signaler ? Écris-nous directement — on te
          répond au plus vite.
        </p>

        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="inline-flex items-center gap-2.5 bg-brand-surface border border-brand-line rounded-xl px-6 py-4 text-lg font-semibold text-brand-red-dark no-underline hover:border-brand-red hover:text-brand-red transition-colors"
        >
          <IconMail size={20} /> {CONTACT_EMAIL}
        </a>

        <div className="flex items-center justify-center gap-2 text-sm text-brand-muted mt-8 mb-3">
          <IconGlobe size={15} /> Kinshasa, République Démocratique du Congo
        </div>

        <div className="mt-8 flex flex-col items-center gap-3">
          <p className="text-xs uppercase tracking-wide text-brand-muted font-semibold m-0">
            Suis-nous
          </p>
          <SocialLinks />
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
