// Social-media icon row. The client's accounts aren't live yet, so every
// entry ships with href: null and renders as a greyed-out, non-clickable
// placeholder with a "Bientôt disponible" tooltip. The moment a real
// account exists, just fill in its href below — no other code changes
// needed, the icon lights up and becomes a link automatically.
import { IconFacebook, IconInstagram, IconX, IconLinkedin, IconTiktok } from './icons';
import type { ComponentType } from 'react';

type SocialLink = {
  name: string;
  Icon: ComponentType<{ size?: number }>;
  href: string | null;
};

const SOCIAL_LINKS: SocialLink[] = [
  { name: 'Facebook', Icon: IconFacebook, href: null },
  { name: 'Instagram', Icon: IconInstagram, href: null },
  { name: 'X (Twitter)', Icon: IconX, href: null },
  { name: 'LinkedIn', Icon: IconLinkedin, href: null },
  { name: 'TikTok', Icon: IconTiktok, href: null },
];

export function SocialLinks({ size = 17 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      {SOCIAL_LINKS.map(({ name, Icon, href }) =>
        href ? (
          <a
            key={name}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={name}
            className="w-8 h-8 inline-flex items-center justify-center rounded-full border border-brand-navy-border text-brand-cream/80 hover:text-brand-gold hover:border-brand-gold transition-colors"
          >
            <Icon size={size} />
          </a>
        ) : (
          <span
            key={name}
            title={`${name} — bientôt disponible`}
            aria-label={`${name} — bientôt disponible`}
            className="w-8 h-8 inline-flex items-center justify-center rounded-full border border-brand-navy-border text-brand-muted/50 cursor-not-allowed"
          >
            <Icon size={size} />
          </span>
        )
      )}
    </div>
  );
}
