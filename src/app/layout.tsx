
import './globals.css';

export const metadata = {
  title: 'Kinshasa Label — Le Guide de Référence de Kinshasa',
  description:
    "Le guide curaté des meilleures adresses, de la culture et des événements de Kinshasa : explorez chaque commune sur une carte interactive, avec sélections, avis et sorties du week-end.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="bg-brand-navy">{children}</body>
    </html>
  );
}
