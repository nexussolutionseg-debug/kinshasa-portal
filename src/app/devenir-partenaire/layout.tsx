import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Deviens partenaire',
  description: 'Commerce, institution, média ou investisseur : fais connaître ton lieu, ton événement ou ton projet auprès des Kinois avec Kinshasa Label.',
  alternates: { canonical: '/devenir-partenaire' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
