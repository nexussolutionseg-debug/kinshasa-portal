// One « À la une » article from the team, on its own page (2026-10-28):
// shareable link, readable by Google, opened from the backoffice
// ("Voir sur le site") and from Kin Actualité. Updated within a minute of
// an edit in the backoffice.
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteHeader } from '../../../../components/SiteHeader';
import { SiteTicker } from '../../../../components/SiteTicker';
import { SiteFooter } from '../../../../components/SiteFooter';
import { serverNewsItem } from '../../../../lib/supabaseServer';
import { communeHref, canonicalCommune } from '../../../../lib/communes';
import { withUtm } from '../../../../lib/utm';

export const revalidate = 60;

const SITE = 'https://www.kinshasalabel.com';
const frDate = (d: string) =>
  new Date(`${String(d).slice(0, 10)}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const safeImg = (u: unknown) => (typeof u === 'string' && /^https:\/\//.test(u) ? u : null);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await serverNewsItem(Number(id));
  if (!a) return { title: 'Article introuvable — Kinshasa Label' };
  const description = String(a.body || '').replace(/\s+/g, ' ').slice(0, 160);
  const img = safeImg(a.image_url);
  return {
    title: `${a.title} — Kin Actualité`,
    description,
    alternates: { canonical: `/actualite/article/${a.id}` },
    openGraph: { title: a.title, description, type: 'article', ...(img ? { images: [img] } : {}) },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await serverNewsItem(Number(id));
  if (!a) notFound();
  const img = safeImg(a.image_url);
  const commune = canonicalCommune(a.commune);
  const url = `${SITE}/actualite/article/${a.id}`;
  const share = `https://wa.me/?text=${encodeURIComponent(`${a.title} — via Kinshasa Label\n${url}`)}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: a.title,
    datePublished: a.published_date,
    ...(img ? { image: [img] } : {}),
    publisher: { '@type': 'Organization', name: 'Kinshasa Label', logo: { '@type': 'ImageObject', url: `${SITE}/logo.svg` } },
    mainEntityOfPage: url,
  };

  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader below={<SiteTicker />} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <article className="max-w-[760px] w-full mx-auto px-4 md:px-6 py-8 md:py-12 flex-1">
        <nav className="text-sm text-brand-muted mb-4" aria-label="Fil d’Ariane">
          <Link href="/actualite" className="text-brand-blue-deep font-semibold no-underline">Kin Actualité</Link> <span aria-hidden="true">›</span> À la une
        </nav>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-[11px] font-extrabold uppercase tracking-wider bg-brand-yellow text-brand-ink px-2.5 py-1 rounded-full">À la une</span>
          <span className="text-sm text-brand-muted">{frDate(a.published_date)}</span>
          {commune && (
            <Link href={communeHref(commune)} className="text-sm font-semibold text-brand-blue-deep no-underline">· {commune}</Link>
          )}
        </div>
        <h1 className="font-display text-3xl md:text-5xl font-extrabold text-brand-ink leading-tight m-0 mb-5 break-words">{a.title}</h1>
        {img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" className="w-full max-h-[460px] object-cover rounded-3xl mb-6 border border-brand-line" />
        )}
        <div className="text-[17px] md:text-lg text-brand-ink/85 leading-relaxed whitespace-pre-line break-words">{a.body}</div>
        {(a.source_note || a.link_url) && (
          <p className="mt-6 text-sm text-brand-muted">
            Source : {a.source_note || ''}{' '}
            {a.link_url && /^https?:\/\//.test(a.link_url) && (
              <a href={withUtm(a.link_url, 'a_la_une')} target="_blank" rel="noopener noreferrer" className="text-brand-blue-deep font-semibold">
                voir la source ↗
              </a>
            )}
          </p>
        )}
        <div className="mt-8 flex flex-wrap gap-3">
          <a href={share} target="_blank" rel="noopener noreferrer" className="inline-flex items-center h-11 px-5 rounded-full bg-[#25D366] text-white font-bold no-underline">
            Partager sur WhatsApp
          </a>
          <Link href="/actualite" className="inline-flex items-center h-11 px-5 rounded-full border-2 border-brand-line text-brand-ink font-bold no-underline">
            ← Toute l’actualité
          </Link>
        </div>
      </article>
      <SiteFooter />
    </main>
  );
}
