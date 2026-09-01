// Shared, persistent site header used on the public-facing pages (home,
// commune pages). Gives the app a real multi-page-website presence: a
// logo lockup, a horizontal nav row, a primary CTA, and a mobile menu.
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from './Button';
import { IconPin, IconClose, IconMenu } from './icons';

const NAV_LINKS = [
  { href: '/', label: 'Accueil' },
  { href: '/commune/Gombe', label: 'Communes' },
  { href: '/#explorer', label: 'Explorer Kin' },
  { href: '/#kin-weekend', label: 'Kin Weekend' },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-brand-navy/95 backdrop-blur supports-[backdrop-filter]:bg-brand-navy/80 border-b border-brand-navy-border">
      <div className="max-w-[1650px] mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between gap-4">
        <Link href="/" className="flex flex-col leading-none no-underline shrink-0">
          <span className="font-display text-xl md:text-2xl font-bold text-brand-cream tracking-tight">
            Kinshasa Label
          </span>
          <span className="hidden sm:block text-[10px] uppercase tracking-[2px] text-brand-gold font-semibold mt-1">
            Le Média-Guide de Référence
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-7">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-brand-cream/80 no-underline hover:text-brand-gold transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:block shrink-0">
          <Button href="/backoffice" variant="primary" size="sm">
            <IconPin size={14} /> Proposer un Lieu
          </Button>
        </div>

        <button
          type="button"
          aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="lg:hidden inline-flex items-center justify-center w-9 h-9 shrink-0 text-brand-cream"
        >
          {menuOpen ? <IconClose size={22} /> : <IconMenu size={22} />}
        </button>
      </div>

      {menuOpen && (
        <div className="lg:hidden border-t border-brand-navy-border bg-brand-navy-light px-4 py-4 flex flex-col gap-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="text-sm font-medium text-brand-cream no-underline"
            >
              {link.label}
            </Link>
          ))}
          <Button href="/backoffice" variant="primary" size="sm" fullWidth>
            <IconPin size={14} /> Proposer un Lieu
          </Button>
        </div>
      )}
    </header>
  );
}
