import { SiteHeader } from '../../components/SiteHeader';
import { SiteFooter } from '../../components/SiteFooter';
import { ManageCookiesLink } from '../../components/ManageCookiesLink';

// Plain-language privacy policy describing what the site ACTUALLY does
// (updated 2026-10-04: Google Analytics behind consent, newsletter,
// comments, partner form, browser storage, UTM links, map tiles).
// Not legal advice: have a lawyer confirm it against the data-protection
// law that applies to the operator and audience before relying on it.
// Keep LAST_UPDATED in sync whenever the content changes.
const LAST_UPDATED = '4 octobre 2026';
const CONTACT = 'contact@kinshasalabel.com';

export const metadata = {
  title: 'Politique de confidentialité — Kinshasa Label',
  description: 'Quelles données Kinshasa Label collecte, pourquoi, combien de temps, et comment exercer vos droits.',
};

function H2({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="font-display text-xl md:text-2xl font-extrabold text-brand-ink mt-0 mb-2">
      <span className="text-brand-red mr-1.5">{n}.</span>
      {children}
    </h2>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="max-w-[780px] mx-auto px-4 md:px-6 py-10 md:py-14 flex-1 w-full">
        <h1 className="font-display text-3xl md:text-5xl font-extrabold text-brand-ink m-0">Politique de confidentialité</h1>
        <p className="text-sm text-brand-muted mt-2 mb-6">Dernière mise à jour : {LAST_UPDATED}</p>

        <div className="rounded-2xl bg-brand-blue-soft p-4 md:p-5 text-[15px] text-brand-ink/85 leading-relaxed mb-8">
          <strong>En bref :</strong> pas de compte à créer, pas de publicité, aucune donnée vendue. Google Analytics ne
          fonctionne que si vous l&apos;acceptez. Votre e-mail n&apos;est utilisé que pour la newsletter, si vous vous y
          abonnez, et vous pouvez vous désinscrire à tout moment.
        </div>

        <div className="flex flex-col gap-8 text-[15px] md:text-base text-brand-ink/80 leading-relaxed">
          <section>
            <H2 n={1}>Qui sommes-nous</H2>
            <p className="m-0">
              Kinshasa Label (kinshasalabel.com) est un guide en ligne des lieux, sorties et de l&apos;actualité de Kinshasa.
              Pour toute question sur vos données : <a href={`mailto:${CONTACT}`} className="text-brand-blue-deep font-semibold">{CONTACT}</a>.
            </p>
          </section>

          <section>
            <H2 n={2}>Les données que nous collectons</H2>
            <ul className="list-disc pl-5 m-0 flex flex-col gap-2">
              <li>
                <strong>Navigation sans compte.</strong> Vous pouvez consulter tout le site sans vous inscrire ni donner votre nom.
              </li>
              <li>
                <strong>Avis (1 à 5 étoiles + commentaire facultatif).</strong> La note, le prénom ou pseudo que vous saisissez
                (facultatif) et votre texte sont publiés sous le lieu concerné. N&apos;y indiquez pas d&apos;informations
                personnelles. Pour limiter les abus (votes multiples, spam), nous conservons avec chaque avis une empreinte
                chiffrée et irréversible de votre adresse IP — jamais l&apos;adresse elle-même. L&apos;équipe peut masquer ou
                supprimer un avis abusif.
              </li>
              <li>
                <strong>Newsletter.</strong> Votre adresse e-mail et la date d&apos;inscription, uniquement si vous vous abonnez.
              </li>
              <li>
                <strong>Formulaire « Devenir partenaire ».</strong> Les coordonnées et le message que vous nous envoyez
                (entreprise, nom, e-mail, téléphone), pour vous répondre.
              </li>
              <li>
                <strong>Mesure d&apos;audience.</strong> Voir la section 4 (Vercel Web Analytics, et Google Analytics avec votre accord).
              </li>
            </ul>
          </section>

          <section>
            <H2 n={3}>Ce qui est stocké dans votre navigateur</H2>
            <p className="m-0 mb-2">Sans cookie, dans le stockage local de votre navigateur, et jamais transmis à des tiers :</p>
            <ul className="list-disc pl-5 m-0 flex flex-col gap-1.5">
              <li>la liste des lieux que vous avez déjà notés (pour éviter les doubles votes) ;</li>
              <li>votre choix concernant Google Analytics (accepté / refusé) ;</li>
              <li>le fait que vous soyez déjà abonné(e) à la newsletter, ou que l&apos;invitation ait déjà été affichée pendant votre visite.</li>
            </ul>
            <p className="m-0 mt-2">Vous pouvez tout effacer à tout moment depuis les réglages de votre navigateur.</p>
          </section>

          <section>
            <H2 n={4}>Cookies et mesure d&apos;audience</H2>
            <p className="m-0">
              <strong>Vercel Web Analytics</strong> (toujours actif) compte les visites de façon agrégée — pages vues, pays,
              type d&apos;appareil — <strong>sans cookie</strong> et sans permettre de vous identifier ou de vous suivre sur
              d&apos;autres sites.
            </p>
            <p className="m-0 mt-3">
              <strong>Google Analytics 4</strong> (uniquement avec votre accord) nous aide à comprendre quelles pages et quelles
              sources (Instagram, WhatsApp, autres sites…) amènent des visiteurs. Tant que vous n&apos;avez pas cliqué sur
              « Accepter », le script de Google n&apos;est <strong>pas chargé</strong> et aucun cookie n&apos;est déposé. Si vous
              acceptez :
            </p>
            <ul className="list-disc pl-5 m-0 mt-2 flex flex-col gap-1.5">
              <li>Google dépose les cookies <code>_ga</code> et <code>_ga_*</code> (durée de vie : jusqu&apos;à 2 ans) qui distinguent les visiteurs de façon pseudonyme ;</li>
              <li>sont mesurés : pages vues, durée de visite, provenance, type d&apos;appareil, navigateur et pays/ville approximatifs ;</li>
              <li>Google Analytics 4 n&apos;enregistre pas votre adresse IP complète ; les données sont traitées par Google LLC, y compris aux États-Unis ;</li>
              <li>les données détaillées sont conservées par Google 14 mois au maximum, puis supprimées ;</li>
              <li>nous n&apos;utilisons pas les fonctions publicitaires de Google et ne partageons pas ces données avec des annonceurs.</li>
            </ul>
            <p className="m-0 mt-3">
              Vous pouvez changer d&apos;avis à tout moment : <ManageCookiesLink />. En cas de refus, le site fonctionne exactement de la même façon.
            </p>
            <p className="m-0 mt-3">
              <strong>Liens de suivi (UTM).</strong> Certains liens vers notre site (par exemple depuis Instagram) et vers
              d&apos;autres sites (articles de presse, partenaires) contiennent des paramètres « utm_ » qui indiquent seulement
              d&apos;où vient la visite. Ils ne contiennent aucune information personnelle.
            </p>
          </section>

          <section>
            <H2 n={5}>Services tiers chargés par votre navigateur</H2>
            <ul className="list-disc pl-5 m-0 flex flex-col gap-1.5">
              <li><strong>Esri</strong> (fonds de carte) et <strong>MapLibre</strong> (noms de lieux sur la carte) : votre navigateur télécharge les images de la carte depuis leurs serveurs, qui voient donc votre adresse IP, comme pour tout site web.</li>
              <li><strong>Liens externes</strong> : les articles de Kin Actualité, Google Maps et Instagram s&apos;ouvrent sur leurs propres sites, soumis à leurs propres politiques de confidentialité.</li>
            </ul>
          </section>

          <section>
            <H2 n={6}>Hébergement et partage</H2>
            <p className="m-0">
              Le site est hébergé par <strong>Vercel</strong> et les données (lieux, notes, avis, abonnés, demandes de
              partenariat) par <strong>Supabase</strong>. Lorsque nous envoyons la newsletter, les adresses peuvent être
              transmises à un service d&apos;envoi d&apos;e-mails (par exemple Brevo ou Mailchimp) agissant pour notre compte.
              Nous ne vendons ni ne louons aucune donnée.
            </p>
          </section>

          <section>
            <H2 n={7}>Durées de conservation</H2>
            <ul className="list-disc pl-5 m-0 flex flex-col gap-1.5">
              <li>E-mail newsletter : jusqu&apos;à votre désinscription.</li>
              <li>Demandes de partenariat : 24 mois après notre dernier échange.</li>
              <li>Avis publiés (et leur empreinte anti-spam) : tant qu&apos;ils sont en ligne, ou jusqu&apos;à votre demande de suppression.</li>
              <li>Google Analytics : 14 mois maximum (voir section 4).</li>
            </ul>
          </section>

          <section>
            <H2 n={8}>Vos droits</H2>
            <p className="m-0">
              Vous pouvez demander à consulter, corriger ou supprimer les données vous concernant (par exemple votre e-mail
              newsletter ou un avis publié), ou vous opposer à leur utilisation. Écrivez-nous à{' '}
              <a href={`mailto:${CONTACT}`} className="text-brand-blue-deep font-semibold">{CONTACT}</a> : nous répondons dans un
              délai d&apos;un mois. Chaque newsletter contient aussi un lien de désinscription en un clic.
            </p>
          </section>

          <section>
            <H2 n={9}>Sécurité</H2>
            <p className="m-0">
              Le site est servi uniquement en HTTPS. La liste des abonnés et les demandes de partenariat ne sont lisibles que
              par l&apos;équipe Kinshasa Label connectée à l&apos;espace d&apos;administration.
            </p>
          </section>

          <section>
            <H2 n={10}>Modifications</H2>
            <p className="m-0">
              Nous mettrons cette page à jour si le site évolue (par exemple l&apos;ajout de Google Maps). La date de dernière
              mise à jour figure en haut de la page.
            </p>
          </section>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
