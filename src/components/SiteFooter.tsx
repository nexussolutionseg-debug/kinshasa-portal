// Shared site footer used on the public-facing pages. A real footer
// (brand column, sitemap columns, copyright bar) signals a finished,
// professional site rather than a single-screen prototype.
import Link from 'next/link';
import { KinshasaSeal } from './BrandMark';

const FOOTER_COMMUNES = ['Gombe', 'Limete', 'Ngaliema', 'Kalamu', 'Lemba', 'Masina'];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-brand-navy-border bg-brand-navy-light">
      <div className="max-w-[1650px] mx-auto px-4 md:px-6 py-10 md:py-12 grid grid-cols-1 gap-9 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="flex gap-5">
          <KinshasaSeal size={84} />
          <div>
            <span className="font-display text-xl font-bold text-brand-cream">Kinshasa Label</span>
            <p className="text-sm text-brand-cream/60 mt-3 max-w-sm leading-relaxed">
              Le guide de référence des meilleures adresses, de la culture et des événements de
              Kinshasa — commune par commune, sur une carte interactive.
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-xs uppercase tracking-wide text-brand-muted font-semibold mb-3.5">
            Communes
          </h3>
          <ul className="flex flex-col gap-2.5 list-none p-0 m-0">
            {FOOTER_COMMUNES.map((c) => (
              <li key={c}>
                <Link
                  href={`/commune/${encodeURIComponent(c)}`}
                  className="text-sm text-brand-cream/70 no-underline hover:text-brand-gold transition-colors"
                >
                  {c}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-xs uppercase tracking-wide text-brand-muted font-semibold mb-3.5">
            Kinshasa Label
          </h3>
          <ul className="flex flex-col gap-2.5 list-none p-0 m-0">
            <li>
              <Link href="/" className="text-sm text-brand-cream/70 no-underline hover:text-brand-gold transition-colors">
                Accueil
              </Link>
            </li>
            <li>
              <Link href="/backoffice" className="text-sm text-brand-cream/70 no-underline hover:text-brand-gold transition-colors">
                Proposer un lieu
              </Link>
            </li>
            <li>
              <Link href="/login" className="text-sm text-brand-cream/70 no-underline hover:text-brand-gold transition-colors">
                Backoffice
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-brand-navy-border">
        <div className="max-w-[1650px] mx-auto px-4 md:px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-brand-muted text-center md:text-left">
          <span>© {year} Kinshasa Label. Tous droits réservés.</span>
          <span>Fait avec fierté à Kinshasa.</span>
        </div>
      </div>
    </footer>
  );
}
