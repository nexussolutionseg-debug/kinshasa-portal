import { ActualiteClient } from './ActualiteClient';

export const metadata = {
  title: 'Kin Actualité — L’info de Kinshasa en direct | Kinshasa Label',
  description:
    "Toute l'actualité de Kinshasa réunie depuis les médias congolais (Radio Okapi, Actualite.cd, Mediacongo, Le Point.cd…), mise à jour en continu, commune par commune.",
};

export default function ActualitePage() {
  return <ActualiteClient />;
}
