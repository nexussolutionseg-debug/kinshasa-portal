// Coloured page header shared by the category, communes and weekend pages
// (same look as the Kin Actualité page header).
import type { ReactNode } from 'react';
import { SpinningWheel } from './BrandMark';

export function PageHero({ eyebrow, title, intro, gradient, dark = true, children }: {
  eyebrow?: ReactNode;
  title: ReactNode;
  intro?: ReactNode;
  gradient: string;
  dark?: boolean;
  children?: ReactNode;
}) {
  return (
    <section className={`relative overflow-hidden ${dark ? 'text-white' : 'text-brand-ink'}`} style={{ background: gradient }}>
      <span className="absolute -right-24 -top-28 opacity-30 pointer-events-none">
        <SpinningWheel size={420} />
      </span>
      <div className="relative max-w-[1400px] mx-auto px-4 md:px-6 py-10 md:py-14">
        {eyebrow}
        <h1 className="font-display text-4xl md:text-6xl font-extrabold m-0 mt-3 tracking-tight">{title}</h1>
        {intro && <p className={`text-base md:text-lg m-0 mt-2 max-w-2xl ${dark ? 'text-white/90' : 'text-brand-ink/80'}`}>{intro}</p>}
        {children}
      </div>
    </section>
  );
}
