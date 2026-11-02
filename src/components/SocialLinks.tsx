// Social-media + email icon row (footer, contact page). Updated 2026-11-02:
// Facebook, Instagram and TikTok are live. Only accounts with a real link are
// shown: an account without one is simply not listed (no greyed-out icons).
// To add one later (X, LinkedIn, YouTube, WhatsApp…), add it to SOCIAL_URLS
// in src/lib/social.ts and an icon here.
import { IconFacebook, IconInstagram, IconTiktok, IconMail } from './icons';
import type { ComponentType } from 'react';
import { SOCIAL_URLS, CONTACT_EMAIL } from '../lib/social';

type SocialLink = { name: string; Icon: ComponentType<{ size?: number }>; href: string | null; external: boolean };

const LINKS: SocialLink[] = [
  { name: 'Facebook', Icon: IconFacebook, href: SOCIAL_URLS.facebook, external: true },
  { name: 'Instagram', Icon: IconInstagram, href: SOCIAL_URLS.instagram, external: true },
  { name: 'TikTok', Icon: IconTiktok, href: SOCIAL_URLS.tiktok, external: true },
  { name: `E-mail : ${CONTACT_EMAIL}`, Icon: IconMail, href: `mailto:${CONTACT_EMAIL}`, external: false },
];

export function SocialLinks({ size = 17 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      {LINKS.filter((l) => l.href).map(({ name, Icon, href, external }) => (
        <a
          key={name}
          href={href!}
          {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          aria-label={name}
          title={name}
          className="w-8 h-8 inline-flex items-center justify-center rounded-full border border-brand-line text-brand-ink/80 hover:text-brand-red hover:border-brand-red transition-colors"
        >
          <Icon size={size} />
        </a>
      ))}
    </div>
  );
}
