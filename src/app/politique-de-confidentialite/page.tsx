import { SiteHeader } from '../../components/SiteHeader';
import { SiteFooter } from '../../components/SiteFooter';

// Added in response to a security scan flagging the absence of any
// privacy policy link. This is a general-purpose, plain-language policy
// covering what this app actually does (it has no user accounts and no
// tracking cookies — it stores a browser-local rating history and a
// login for the backoffice). It is NOT a substitute for legal review:
// have a lawyer confirm this against whichever data-protection law
// actually applies to your audience/operator before treating it as
// compliant with any specific regulation.
export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-brand-navy text-brand-cream flex flex-col">
      <SiteHeader />
      <div className="max-w-[760px] mx-auto px-4 md:px-6 py-12 md:py-16 flex-1 w-full">
        <h1 className="font-display text-3xl md:text-4xl font-semibold text-brand-cream mb-2">
          Politique de confidentialité
        </h1>
        <p className="text-sm text-brand-muted mb-10">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>

        <div className="flex flex-col gap-7 text-sm md:text-base text-brand-cream/80 leading-relaxed">
          <section>
            <h2 className="font-display text-xl text-brand-river font-semibold mb-2">1. Quelles données sont collectées</h2>
            <p>
              Kinshasa Label ne demande pas de créer de compte et ne vous identifie pas personnellement pour
              consulter le site. Les seules données traitées sont :
            </p>
            <ul className="list-disc pl-5 mt-2 flex flex-col gap-1.5">
              <li>Les notes (1 à 5 étoiles) que vous attribuez à un lieu — enregistrées sur nos serveurs de manière anonyme (aucun nom, e-mail ou identifiant personnel n&apos;y est associé).</li>
              <li>Une liste des lieux déjà notés depuis votre navigateur, conservée localement sur votre appareil (« localStorage »), afin d&apos;éviter un double vote. Cette liste n&apos;est jamais transmise ailleurs qu&apos;à votre propre navigateur.</li>
              <li>Les informations que vous choisissez de soumettre via « Proposer un Lieu » (nom du lieu, description, photo, adresse) — utilisées uniquement pour publier ou mettre à jour la sélection de lieux.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl text-brand-river font-semibold mb-2">2. Cookies et suivi</h2>
            <p>
              Ce site n&apos;utilise pas de cookies publicitaires ni d&apos;outils de suivi tiers (pas de pixels
              publicitaires, pas d&apos;analytics tiers à ce jour). Le stockage local du navigateur mentionné
              ci-dessus n&apos;est pas un cookie et n&apos;est pas partagé avec des tiers.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-brand-river font-semibold mb-2">3. Partage des données</h2>
            <p>
              Les données sont hébergées chez Supabase (base de données) et Vercel (hébergement du site). Elles
              ne sont ni vendues, ni partagées avec des annonceurs. Les lieux, notes et actualités publiés sur le
              site sont publics par nature — c&apos;est le but du service.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-brand-river font-semibold mb-2">4. Vos droits</h2>
            <p>
              Pour toute question sur les données présentes sur ce site, ou pour demander le retrait d&apos;un
              contenu que vous avez soumis, contactez l&apos;équipe éditoriale via les coordonnées indiquées sur
              la page d&apos;accueil.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-brand-river font-semibold mb-2">5. Modifications</h2>
            <p>
              Cette politique peut être mise à jour à mesure que le site évolue. La date de dernière mise à jour
              figure en haut de cette page.
            </p>
          </section>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
