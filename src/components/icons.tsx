// Minimal hand-written stroke icons (16-20px) used across the site in place
// of decorative emoji. No icon library dependency — plain inline SVG.
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base(size: number) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
}

export function IconHeart({ size = 16, filled = false, ...props }: IconProps & { filled?: boolean }) {
  return (
    <svg {...base(size)} fill={filled ? 'currentColor' : 'none'} {...props}>
      <path d="M12 20.5s-7-4.35-9.5-8.8C.9 8.6 2.3 5 5.7 5c1.9 0 3.3 1 4.3 2.5C11 6 12.4 5 14.3 5c3.4 0 4.8 3.6 3.2 6.7C19 16.15 12 20.5 12 20.5Z" />
    </svg>
  );
}

export function IconStar({ size = 16, filled = false, ...props }: IconProps & { filled?: boolean }) {
  return (
    <svg {...base(size)} fill={filled ? 'currentColor' : 'none'} {...props}>
      <path d="M12 3.2 14.7 9l6.3.6-4.8 4.2 1.4 6.2L12 16.9l-5.6 3.1 1.4-6.2-4.8-4.2L9.3 9Z" />
    </svg>
  );
}

export function IconChat({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M4 4.5h16a1 1 0 0 1 1 1V15a1 1 0 0 1-1 1H9l-4.2 3.5a.6.6 0 0 1-1-.46V16H4a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

export function IconPin({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M12 21.5s7-6.4 7-12A7 7 0 0 0 5 9.5c0 5.6 7 12 7 12Z" />
      <circle cx="12" cy="9.5" r="2.4" />
    </svg>
  );
}

export function IconArrowRight({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M4 12h16M14 6l6 6-6 6" />
    </svg>
  );
}

export function IconChevronLeft({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

export function IconPlus({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconClose({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function IconExternalLink({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M9 5H5a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-4M14 4h6v6M20 4l-9.5 9.5" />
    </svg>
  );
}

export function IconHome({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M4 11.5 12 4l8 7.5M6 10v9.5a1 1 0 0 0 1 1h3.5v-6h3v6H17a1 1 0 0 0 1-1V10" />
    </svg>
  );
}

export function IconEdit({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-4-4L4 16v4Z M14 6.5l3 3" />
    </svg>
  );
}

export function IconTrash({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0 1 12.5a1 1 0 0 0 1 .9h6a1 1 0 0 0 1-.9L18 7" />
    </svg>
  );
}

export function IconSearch({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.3-4.3" />
    </svg>
  );
}

export function IconUser({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <circle cx="12" cy="8.3" r="3.3" />
      <path d="M5 20c0-3.6 3-6 7-6s7 2.4 7 6" />
    </svg>
  );
}

export function IconWarning({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M12 3.5 22 20H2L12 3.5Z" />
      <path d="M12 10v4M12 17.2v.1" />
    </svg>
  );
}

export function IconGlobe({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.5 2.4 3.8 5.4 3.8 8.5s-1.3 6.1-3.8 8.5c-2.5-2.4-3.8-5.4-3.8-8.5S9.5 5.9 12 3.5Z" />
    </svg>
  );
}

export function IconChevronRight({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function IconClock({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5.3l3.6 2.1" />
    </svg>
  );
}

export function IconChart({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M4 20V10M4 20h16M9.5 20V6M15 20v-8" />
    </svg>
  );
}

export function IconThumbsDown({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M7 14V4M3 4h3.2c.4 0 .8.1 1.1.3l4.4 2c.3.1.7.2 1.1.2h4.4a2 2 0 0 1 2 2.3l-1 6a2 2 0 0 1-2 1.7H9" />
    </svg>
  );
}

export function IconMenu({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function IconMail({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M4 5.5h16a1 1 0 0 1 1 1V17a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1Z" />
      <path d="m3.5 6.5 8 6.2a1 1 0 0 0 1.2 0l8-6.2" />
    </svg>
  );
}

export function IconBuilding({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M5 20.5V4.5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M15 9.5h3a1 1 0 0 1 1 1v10M3 20.5h18" />
      <path d="M8 7.5h1.5M12.5 7.5H14M8 11h1.5M12.5 11H14M8 14.5h1.5M12.5 14.5H14M17 13.5h1.5M17 17h1.5" />
    </svg>
  );
}

// Minimal line-art versions of the common social-platform marks — kept in
// the same hand-drawn stroke style as the rest of the icon set rather than
// pulling in each brand's official logo asset. Swap for real brand marks
// later if the client wants pixel-exact logos once accounts are live.
export function IconFacebook({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M14.5 21v-7.2h2.4l.4-2.9h-2.8V9.1c0-.8.2-1.4 1.4-1.4h1.5V5.1C16.9 5 16 5 15 5c-2.2 0-3.7 1.3-3.7 3.8v2.1H8.9v2.9h2.4V21" />
    </svg>
  );
}

export function IconInstagram({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconX({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M4.5 4.5l15 15M19.5 4.5l-15 15" />
    </svg>
  );
}

export function IconLinkedin({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" />
      <path d="M8 10.5V17M8 7.3v.1M12.2 17v-3.8c0-1.4 1-2.4 2.3-2.4s2 1 2 2.4V17" />
    </svg>
  );
}

export function IconTiktok({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M13 3.5v11.2a2.9 2.9 0 1 1-2.4-2.86" />
      <path d="M13 3.5c.3 2.2 2 3.9 4.2 4.2" />
    </svg>
  );
}

// ---- Added for the v4 joyful redesign (2026-10-04) -----------------------

export function IconNews({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M4 5h13v14H6a2 2 0 0 1-2-2V5Z" />
      <path d="M17 9h3v8a2 2 0 0 1-2 2h-1M7.5 9h6M7.5 12.5h6M7.5 16h4" />
    </svg>
  );
}

export function IconCalendar({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  );
}

export function IconMap({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2Z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  );
}

export function IconDice({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <circle cx="8.5" cy="8.5" r="1" fill="currentColor" />
      <circle cx="15.5" cy="15.5" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="15.5" cy="8.5" r="1" fill="currentColor" />
      <circle cx="8.5" cy="15.5" r="1" fill="currentColor" />
    </svg>
  );
}

export function IconFork({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M7 3v8a2 2 0 0 0 2 2v8M5 3v5a2 2 0 0 0 2 2M9 3v5a2 2 0 0 1-2 2M17 21V3c-2 1-3.5 3.5-3.5 7 0 2 1.2 3 3.5 3" />
    </svg>
  );
}

export function IconMask({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M4 5c3 1.5 13 1.5 16 0v6c0 5-3.6 9-8 9s-8-4-8-9Z" />
      <path d="M8.5 11.5c.7-.6 1.8-.6 2.5 0M13 11.5c.7-.6 1.8-.6 2.5 0M9.5 15.5c1.5 1.2 3.5 1.2 5 0" />
    </svg>
  );
}

export function IconShirt({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="m8 3-5 3 2 4 2-1v12h10V9l2 1 2-4-5-3c-.5 1.5-2 2.5-4 2.5S8.5 4.5 8 3Z" />
    </svg>
  );
}

export function IconShield({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.3 7.5 9.5 4.3-1.2 7.5-4.9 7.5-9.5V6Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function IconCar({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M5 16V11l2-5h10l2 5v5M3.5 16h17v3h-17Z" />
      <circle cx="7.5" cy="13.5" r=".8" fill="currentColor" />
      <circle cx="16.5" cy="13.5" r=".8" fill="currentColor" />
    </svg>
  );
}

export function IconSparkle({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M12 3c.6 4 2 5.4 6 6-4 .6-5.4 2-6 6-.6-4-2-5.4-6-6 4-.6 5.4-2 6-6ZM19 15c.3 1.7.8 2.2 2.5 2.5-1.7.3-2.2.8-2.5 2.5-.3-1.7-.8-2.2-2.5-2.5 1.7-.3 2.2-.8 2.5-2.5Z" />
    </svg>
  );
}

export function IconMoney({ size = 16, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M6 9.5v5M18 9.5v5" />
    </svg>
  );
}
