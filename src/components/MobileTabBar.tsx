// Bottom tab bar for phones (hidden from lg up, and on the backoffice /
// login screens). Thumb-reachable shortcuts to the 4 things people come
// for, plus a center "Kin Actu" button with a live dot.
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconHome, IconMap, IconNews, IconCalendar, IconBuilding } from './icons';
import { useWeekendOn } from '../lib/useWeekend';

const TABS = [
  { href: '/', label: 'Accueil', Icon: IconHome },
  { href: '/#explorer', label: 'Carte', Icon: IconMap },
  { href: '/actualite', label: 'Actu', Icon: IconNews, live: true },
  { href: '/weekend', label: 'Weekend', Icon: IconCalendar, weekend: true },
  { href: '/communes', label: 'Communes', Icon: IconBuilding },
];

export function MobileTabBar() {
  const pathname = usePathname();
  const weekendOn = useWeekendOn(); // Weekend tab only with enough events (lib/events.ts)
  // 2026-11-12: the bar slides away while scrolling down and while typing in a
  // field (so it never covers what you are reading or filling in), and comes
  // back when scrolling up or at the bottom of the page.
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    let typing = false;
    const isField = (el: Element | null) => !!el && (el.matches('input, textarea, select') || (el as HTMLElement).isContentEditable);
    const onScroll = () => {
      const y = window.scrollY;
      const atBottom = window.innerHeight + y >= document.documentElement.scrollHeight - 8;
      if (!typing) {
        if (atBottom || y < 80) setHidden(false);
        else if (Math.abs(y - last) > 6) setHidden(y > last);
      }
      last = y;
    };
    const onFocusIn = (e: FocusEvent) => {
      if (isField(e.target as Element)) {
        typing = true;
        setHidden(true);
      }
    };
    const onFocusOut = () => {
      setTimeout(() => {
        if (!isField(document.activeElement)) {
          typing = false;
          setHidden(false);
        }
      }, 50);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);
  useEffect(() => setHidden(false), [pathname]);
  if (pathname?.startsWith('/backoffice') || pathname?.startsWith('/login') || pathname?.startsWith('/stats') || pathname?.startsWith('/rapport')) return null;
  const tabs = TABS.filter((t) => !t.weekend || weekendOn);

  return (
    <nav
      aria-label="Navigation rapide"
      className={`lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur border-t border-brand-line pb-[env(safe-area-inset-bottom)] transition-transform duration-200 ${hidden ? 'translate-y-full' : 'translate-y-0'}`}
    >
      <ul className={`grid ${tabs.length === 5 ? 'grid-cols-5' : 'grid-cols-4'} list-none m-0 p-0`}>
        {tabs.map(({ href, label, Icon, live }) => {
          const active = href === pathname;
          return (
            <li key={label}>
              <Link
                href={href}
                className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold no-underline ${
                  active ? 'text-brand-red' : 'text-brand-ink/70'
                }`}
              >
                <span className={`relative inline-flex items-center justify-center w-10 h-7 rounded-full ${active ? 'bg-brand-red-soft' : ''}`}>
                  <Icon size={20} />
                  {live && <span className="absolute top-0.5 right-1.5 w-2 h-2 rounded-full bg-brand-red ring-2 ring-white animate-live-dot" />}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
