import { SiteHeader } from '../../components/SiteHeader';
import { SiteFooter } from '../../components/SiteFooter';
import { SocialLinks } from '../../components/SocialLinks';
import { IconMail, IconGlobe } from '../../components/icons';

const CONTACT_EMAIL = 'contact@kinshasalabel.com';

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-brand-navy text-brand-cream flex flex-col">
      <SiteHeader />

      <div className="max-w-[640px] mx-auto px-4 md:px-6 py-14 md:py-20 flex-1 w-full text-center">
        <h1 className="font-display text-3xl md:text-4xl font-semibold text-brand-cream mb-3">
          Contactez-nous
        </h1>
        <p className="text-base text-brand-cream/70 leading-relaxed mb-10">
          Une question, une suggestion, un lieu à signaler ? Écrivez-nous directement — nous vous
          répondons au plus vite.
        </p>

        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="inline-flex items-center gap-2.5 bg-brand-navy-light border border-brand-navy-border rounded-xl px-6 py-4 text-lg font-semibold text-brand-gold-light no-underline hover:border-brand-gold hover:text-brand-gold transition-colors"
        >
          <IconMail size={20} /> {CONTACT_EMAIL}
        </a>

        <div className="flex items-center justify-center gap-2 text-sm text-brand-muted mt-8 mb-3">
          <IconGlobe size={15} /> Kinshasa, République Démocratique du Congo
        </div>

        <div className="mt-8 flex flex-col items-center gap-3">
          <p className="text-xs uppercase tracking-wide text-brand-muted font-semibold m-0">
            Suivez-nous
          </p>
          <SocialLinks />
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
