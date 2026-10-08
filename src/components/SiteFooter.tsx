// Shared site footer used on the public-facing pages. A real footer
// (brand column, sitemap columns, copyright bar) signals a finished,
// professional site rather than a single-screen prototype.
import Link from 'next/link';
import { KinshasaMark } from './BrandMark';
import { NewsletterSignup } from './NewsletterSignup';
import { SocialLinks } from './SocialLinks';
import { ManageCookiesLink } from './ManageCookiesLink';
import { IconMail } from './icons';
import { CATEGORY_PATH, PLACE_CATEGORY_IDS, categoryOf } from '../lib/categories';

const CONTACT_EMAIL = 'contact@kinshasalabel.com';

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative bg-white mt-auto">
      {/* river wave edge + flag strip */}
      <div className="wave-edge h-6 md:h-10 -mt-6 md:-mt-10 bg-white" aria-hidden="true" />
      <div className="h-1.5 w-full flex" aria-hidden="true">
        <span className="flex-1 bg-brand-blue" />
        <span className="flex-1 bg-brand-yellow" />
        <span className="flex-1 bg-brand-red" />
      </div>
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 border-b border-brand-line">
        <NewsletterSignup />
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-10 md:py-12 grid grid-cols-1 gap-9 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="flex gap-5">
          <KinshasaMark size={96} />
          <div>
            <span className="font-display text-2xl font-extrabold text-brand-ink">Kinshasa <span className="text-brand-red">Label</span></span>
            <p className="text-sm text-brand-ink/60 mt-3 max-w-sm leading-relaxed">
              Le guide joyeux de Kinshasa : bonnes adresses, sorties, culture et actualité de la ville —
              commune par commune, sur une carte interactive.
            </p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex items-center gap-1.5 text-sm text-brand-red-dark no-underline hover:text-brand-red mt-3.5"
            >
              <IconMail size={14} /> {CONTACT_EMAIL}
            </a>
            <div className="mt-4">
              <SocialLinks />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xs uppercase tracking-wide text-brand-muted font-semibold mb-3.5">
            Rubriques
          </h3>
          <ul className="flex flex-col gap-2.5 list-none p-0 m-0">
            {[...PLACE_CATEGORY_IDS, 'kin_traffic' as const].map((id) => (
              <li key={id}>
                <Link href={CATEGORY_PATH[id]} className="text-sm text-brand-ink/70 no-underline hover:text-brand-red transition-colors">
                  {categoryOf(id).label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/communes" className="text-sm text-brand-ink/70 no-underline hover:text-brand-red transition-colors">
                Les 24 communes
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs uppercase tracking-wide text-brand-muted font-semibold mb-3.5">
            Kinshasa Label
          </h3>
          <ul className="flex flex-col gap-2.5 list-none p-0 m-0">
            <li>
              <Link href="/" className="text-sm text-brand-ink/70 no-underline hover:text-brand-red transition-colors">
                Accueil
              </Link>
            </li>
            <li>
              <Link href="/actualite" className="text-sm text-brand-ink/70 no-underline hover:text-brand-red transition-colors">
                Kin Actualité
              </Link>
            </li>
            <li>
              <Link href="/qui-sommes-nous" className="text-sm text-brand-ink/70 no-underline hover:text-brand-red transition-colors">
                Qui sommes-nous
              </Link>
            </li>
            <li>
              <Link href="/contact" className="text-sm text-brand-ink/70 no-underline hover:text-brand-red transition-colors">
                Contact
              </Link>
            </li>
            <li>
              <Link href="/devenir-partenaire" className="text-sm text-brand-ink/70 no-underline hover:text-brand-red transition-colors">
                Deviens partenaire
              </Link>
            </li>
            <li>
              <Link href="/politique-de-confidentialite" className="text-sm text-brand-ink/70 no-underline hover:text-brand-red transition-colors">
                Politique de confidentialité
              </Link>
            </li>
            <li>
              <ManageCookiesLink />
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-brand-line">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-brand-muted text-center md:text-left">
          <span>© {year} Kinshasa Label. Tous droits réservés.</span>
          <span>Fait avec fierté à Kinshasa.</span>
        </div>
      </div>
    </footer>
  );
}
