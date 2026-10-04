// Shared site header (public pages): white, sticky, logo + wordmark, nav
// with a live "Kin Actualité" link.
//
// Phones/tablets (< lg): the menu button sits on the LEFT and opens a
// drawer that slides in from the left (client request 2026-10-04) — big
// tap targets with icons, the live news dot, quick commune shortcuts, and
// contact at the bottom. Dimmed backdrop, Escape / backdrop tap / any link
// closes it, page scroll is locked while open, focus moves into the drawer
// and back to the button on close. The bottom tab bar (MobileTabBar) stays
// for one-tap access to the main sections.
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  IconClose, IconMenu, IconHome, IconNews, IconMap, IconCalendar, IconBuilding, IconUser, IconMail, IconSparkle, IconPin, IconChevronRight,
} from './icons';
import { KinshasaMark } from './BrandMark';

const NAV_LINKS = [
  { href: '/', label: 'Accueil', Icon: IconHome },
  { href: '/actualite', label: 'Kin Actualité', live: true, Icon: IconNews },
  { href: '/#explorer', label: 'Carte', Icon: IconMap },
  { href: '/#kin-weekend', label: 'Kin Weekend', Icon: IconCalendar },
  { href: '/#communes', label: 'Communes', Icon: IconBuilding },
  { href: '/qui-sommes-nous', label: 'Qui sommes-nous', Icon: IconUser },
  { href: '/contact', label: 'Contact', Icon: IconMail },
];

const QUICK_COMMUNES = ['Gombe', 'Limete', 'Ngaliema', 'Bandalungwa', 'Kintambo', 'Lemba'];

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
  const buttonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on route change.
  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    const t = window.setTimeout(() => drawerRef.current?.querySelector<HTMLElement>('a,button')?.focus(), 50);
    const btn = buttonRef.current;
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(t);
      btn?.focus();
    };
  }, [menuOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-brand-line">
        <div className="h-1 w-full flex" aria-hidden="true">
          <span className="flex-1 bg-brand-blue" />
          <span className="flex-1 bg-brand-yellow" />
          <span className="flex-1 bg-brand-red" />
        </div>
        <div className="max-w-[1400px] mx-auto px-3 md:px-6 h-16 md:h-[72px] flex items-center gap-2 md:gap-4">
          <button
            ref={buttonRef}
            type="button"
            aria-label="Ouvrir le menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-drawer"
            onClick={() => setMenuOpen(true)}
            className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-full shrink-0 text-brand-ink hover:bg-brand-bg cursor-pointer"
          >
            <IconMenu size={24} />
          </button>

          <Link href="/" className="flex items-center gap-2 md:gap-2.5 no-underline shrink-0 min-w-0" aria-label="Kinshasa Label — accueil">
            <KinshasaMark size={44} />
            <span className="flex flex-col leading-none min-w-0">
              <span className="font-display text-[19px] md:text-2xl font-extrabold text-brand-ink tracking-tight whitespace-nowrap">
                Kinshasa <span className="text-brand-red">Label</span>
              </span>
              <span className="hidden sm:block text-[10px] uppercase tracking-[2px] text-brand-blue font-bold mt-1">
                Vis Kin autrement
              </span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 ml-auto" aria-label="Navigation principale">
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

          <Link
            href="/actualite"
            className="lg:hidden ml-auto inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-brand-red-soft text-brand-red text-xs font-extrabold no-underline shrink-0"
          >
            <LiveDot /> Actu
          </Link>
        </div>
      </header>

      {/* MOBILE DRAWER (left) */}
      <div className={`lg:hidden fixed inset-0 z-[65] ${menuOpen ? '' : 'pointer-events-none'}`} aria-hidden={!menuOpen}>
        <button
          type="button"
          aria-label="Fermer le menu"
          tabIndex={-1}
          onClick={() => setMenuOpen(false)}
          className={`absolute inset-0 bg-brand-ink/50 backdrop-blur-[2px] transition-opacity duration-300 cursor-default ${menuOpen ? 'opacity-100' : 'opacity-0'}`}
        />
        <div
          id="mobile-drawer"
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          {...(!menuOpen ? { inert: '' as unknown as boolean } : {})}
          className={`absolute top-0 bottom-0 left-0 w-[84%] max-w-[340px] bg-white shadow-lift flex flex-col transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)] ${
            menuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="h-1 w-full flex shrink-0" aria-hidden="true">
            <span className="flex-1 bg-brand-blue" />
            <span className="flex-1 bg-brand-yellow" />
            <span className="flex-1 bg-brand-red" />
          </div>
          <div className="flex items-center justify-between px-4 h-16 shrink-0 border-b border-brand-line">
            <Link href="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 no-underline">
              <KinshasaMark size={40} />
              <span className="font-display text-lg font-extrabold text-brand-ink">
                Kinshasa <span className="text-brand-red">Label</span>
              </span>
            </Link>
            <button
              type="button"
              aria-label="Fermer le menu"
              onClick={() => setMenuOpen(false)}
              className="w-11 h-11 rounded-full inline-flex items-center justify-center text-brand-ink hover:bg-brand-bg cursor-pointer"
            >
              <IconClose size={22} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Menu mobile">
            <ul className="list-none m-0 p-0 flex flex-col gap-1">
              {NAV_LINKS.map(({ href, label, Icon, live }) => {
                const active = href === pathname;
                return (
                  <li key={label}>
                    <Link
                      href={href}
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-3 h-12 px-3 rounded-2xl text-[16px] font-bold no-underline ${
                        active ? 'bg-brand-blue-soft text-brand-blue-deep' : 'text-brand-ink hover:bg-brand-bg'
                      }`}
                    >
                      <span className={`w-9 h-9 rounded-xl inline-flex items-center justify-center ${live ? 'bg-brand-red-soft text-brand-red' : 'bg-brand-bg text-brand-blue-deep'}`}>
                        <Icon size={18} />
                      </span>
                      <span className="flex-1">{label}</span>
                      {live ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-brand-red uppercase">
                          <LiveDot /> Live
                        </span>
                      ) : (
                        <IconChevronRight size={16} className="text-brand-muted" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <p className="text-[11px] font-extrabold uppercase tracking-wider text-brand-muted px-3 mt-5 mb-2">Communes populaires</p>
            <div className="flex flex-wrap gap-2 px-3">
              {QUICK_COMMUNES.map((c) => (
                <Link
                  key={c}
                  href={`/commune/${encodeURIComponent(c)}`}
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex items-center gap-1 h-9 px-3 rounded-full border border-brand-line text-sm font-semibold text-brand-ink no-underline hover:border-brand-blue"
                >
                  <IconPin size={13} /> {c}
                </Link>
              ))}
            </div>

            <Link
              href="/devenir-partenaire"
              onClick={() => setMenuOpen(false)}
              className="mx-3 mt-5 flex items-center gap-3 rounded-2xl p-4 no-underline text-brand-ink"
              style={{ background: 'linear-gradient(135deg,#FFF7D1,#FDE8EA)' }}
            >
              <IconSparkle size={22} className="text-brand-red shrink-0" />
              <span className="text-sm font-bold leading-snug">Vous avez un lieu ou un événement ? Devenez partenaire</span>
            </Link>
          </nav>

          <div className="shrink-0 border-t border-brand-line px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-sm">
            <a href="mailto:contact@kinshasalabel.com" className="inline-flex items-center gap-2 text-brand-blue-deep font-semibold no-underline">
              <IconMail size={16} /> contact@kinshasalabel.com
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
