// Shared site header (public pages): white, sticky, logo + wordmark, nav
// with a live "Kin Actualité" link, and a mobile drawer. Phones also get
// the bottom tab bar (MobileTabBar, mounted in the root layout).
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconClose, IconMenu } from './icons';
import { KinshasaMark } from './BrandMark';

const NAV_LINKS = [
  { href: '/', label: 'Accueil' },
  { href: '/actualite', label: 'Kin Actualité', live: true },
  { href: '/#explorer', label: 'Carte' },
  { href: '/#kin-weekend', label: 'Kin Weekend' },
  { href: '/#communes', label: 'Communes' },
  { href: '/qui-sommes-nous', label: 'Qui sommes-nous' },
  { href: '/contact', label: 'Contact' },
];

export function LiveDot({ className = '' }: { className?: string }) {
  return (
    <span className={`relative inline-flex w-2 h-2 ${className}`} aria-hidden="true">
      <span className="absolute inset-0 rounded-full bg-brand-red animate-live-dot" />
    </span>
  );
}

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-brand-line">
      {/* flag-color strip */}
      <div className="h-1 w-full flex" aria-hidden="true">
        <span className="flex-1 bg-brand-blue" />
        <span className="flex-1 bg-brand-yellow" />
        <span className="flex-1 bg-brand-red" />
      </div>
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 h-16 md:h-[72px] flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 no-underline shrink-0" aria-label="Kinshasa Label — accueil">
          <KinshasaMark size={48} />
          <span className="flex flex-col leading-none">
            <span className="font-display text-xl md:text-2xl font-extrabold text-brand-ink tracking-tight">
              Kinshasa <span className="text-brand-red">Label</span>
            </span>
            <span className="hidden sm:block text-[10px] uppercase tracking-[2px] text-brand-blue font-bold mt-1">
              Vis Kin autrement
            </span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1" aria-label="Navigation principale">
          {NAV_LINKS.map((link) => {
            const active = link.href === pathname;
            return (
              <Link
                key={link.label}
                href={link.href}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold no-underline transition-colors ${
                  active ? 'bg-brand-blue-soft text-brand-blue-deep' : 'text-brand-ink/75 hover:text-brand-ink hover:bg-brand-bg'
                }`}
              >
                {link.live && <LiveDot />}
                {link.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-full shrink-0 text-brand-ink hover:bg-brand-bg"
        >
          {menuOpen ? <IconClose size={22} /> : <IconMenu size={22} />}
        </button>
      </div>

      {menuOpen && (
        <div className="lg:hidden border-t border-brand-line bg-white px-4 py-3 flex flex-col">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="inline-flex items-center gap-2 py-3 text-base font-semibold text-brand-ink no-underline border-b border-brand-line last:border-0"
            >
              {link.live && <LiveDot />}
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
