// Bottom tab bar for phones (hidden from lg up, and on the backoffice /
// login screens). Thumb-reachable shortcuts to the 4 things people come
// for, plus a center "Kin Actu" button with a live dot.
'use client';

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
  if (pathname?.startsWith('/backoffice') || pathname?.startsWith('/login')) return null;
  const tabs = TABS.filter((t) => !t.weekend || weekendOn);

  return (
    <nav
      aria-label="Navigation rapide"
      className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur border-t border-brand-line pb-[env(safe-area-inset-bottom)]"
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
