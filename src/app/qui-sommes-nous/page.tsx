import { SiteHeader } from '../../components/SiteHeader';
import { SiteFooter } from '../../components/SiteFooter';
import { KinshasaSeal } from '../../components/BrandMark';
import { IconGlobe, IconPin, IconChart, IconUser } from '../../components/icons';

// PLACEHOLDER COPY — the client said final "Qui sommes-nous" text is
// coming separately; this draft is generated from their own positioning
// mind-map (vision, tagline, value chain, audience segments) so the page
// isn't empty in the meantime. Swap the paragraphs below for the client's
// text once it arrives — the section structure/design can stay as-is.
const VALUE_CHAIN = [
  { title: 'Observer', desc: "Nous suivons ce qui se passe, commune par commune : lieux, événements, actualités." },
  { title: 'Vérifier', desc: 'Chaque information publiée est recoupée avant sa mise en ligne.' },
  { title: 'Cartographier', desc: 'Toute la ville, sur une carte interactive claire — 24 communes, une seule vue.' },
  { title: 'Informer', desc: "Actualités, sorties, sécurité, trafic : l'essentiel de la vie de la ville, au même endroit." },
  { title: 'Recommander', desc: 'Une sélection curatée des meilleures adresses, notée par la communauté.' },
  { title: 'Valoriser', desc: "Nous mettons en lumière les commerces, quartiers et opportunités de Kinshasa." },
];

const AUDIENCES = [
  { icon: IconUser, label: 'Habitants de Kinshasa', desc: 'Vivre et découvrir leur propre ville.' },
  { icon: IconGlobe, label: 'Diaspora & visiteurs', desc: 'Se repérer et redécouvrir Kinshasa en toute confiance.' },
  { icon: IconPin, label: 'Commerces & entreprises', desc: 'Être visibles et trouvés par leurs clients.' },
  { icon: IconChart, label: 'Investisseurs & institutions', desc: 'Comprendre la ville pour mieux y investir.' },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-brand-bg text-brand-ink flex flex-col">
      <SiteHeader />

      <div className="max-w-[960px] mx-auto px-4 md:px-6 py-12 md:py-20 flex-1 w-full">
        <div className="flex flex-col items-center text-center mb-14">
          <KinshasaSeal size={104} />
          <h1 className="font-display text-3xl md:text-5xl font-semibold text-brand-ink mt-6 mb-3">
            Qui sommes-nous
          </h1>
          <p className="text-sm uppercase tracking-[3px] text-brand-red font-semibold">
            Connaître. Vivre. Investir.
          </p>
        </div>

        <section className="mb-14 max-w-[720px] mx-auto text-center">
          <h2 className="font-display text-xl md:text-2xl text-brand-blue font-semibold mb-3">
            Notre vision
          </h2>
          <p className="text-base md:text-lg text-brand-ink/85 leading-relaxed">
            « Une ville connue, cartographiée et valorisée. » Kinshasa Label est né d&apos;un constat simple :
            une ville de plus de 24 communes, en forte croissance, mérite une information fiable et
            accessible à tous ceux qui la vivent, la visitent ou y investissent. Nous transformons
            l&apos;information sur Kinshasa en une ressource claire, à jour et utile — pour rendre la ville
            plus lisible, plus attractive et plus inclusive.
          </p>
        </section>

        <section className="mb-14">
          <h2 className="font-display text-xl md:text-2xl text-brand-blue font-semibold mb-6 text-center">
            Ce que nous faisons
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {VALUE_CHAIN.map((step, i) => (
              <div key={step.title} className="bg-brand-surface border border-brand-line rounded-xl p-5">
                <span className="text-xs font-bold text-brand-red">0{i + 1}</span>
                <h3 className="font-display text-base font-semibold text-brand-ink mt-1 mb-1.5">
                  {step.title}
                </h3>
                <p className="text-sm text-brand-ink/70 leading-relaxed m-0">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-14">
          <h2 className="font-display text-xl md:text-2xl text-brand-blue font-semibold mb-6 text-center">
            Pour qui
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {AUDIENCES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3.5 bg-brand-surface border border-brand-line rounded-xl p-5">
                <span className="shrink-0 w-9 h-9 rounded-full bg-brand-red/15 text-brand-red flex items-center justify-center">
                  <Icon size={18} />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-brand-ink m-0">{label}</h3>
                  <p className="text-sm text-brand-ink/65 mt-1 mb-0 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-[640px] mx-auto text-center">
          <p className="text-base text-brand-ink/80 leading-relaxed">
            Kinshasa Label, c&apos;est une approche par commune, des données locales et une vision à la fois
            culturelle et économique de la ville — pour qu&apos;on connaisse mieux Kinshasa, qu&apos;on y vive
            mieux, et qu&apos;on y investisse mieux.
          </p>
        </section>
      </div>

      <SiteFooter />
    </main>
  );
}
