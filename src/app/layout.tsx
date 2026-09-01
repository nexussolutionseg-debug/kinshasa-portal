
import './globals.css';

export const metadata = {
  title: 'Kinshasa Digital Portal',
  description: 'Interactive map and local updates for Kinshasa districts',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-brand-navy">{children}</body>
    </html>
  );
}
