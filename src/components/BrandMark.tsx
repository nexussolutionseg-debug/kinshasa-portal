// Kinshasa Label brand mark — v4 (2026-10-04).
//
// The client supplied a new logo (Ferris wheel in the Congo flag colors,
// a blue tower, a red "K" with a yellow sun-pin, and a blue river wave)
// as a JPEG. It has been redrawn as clean vector art in /public/logo.svg
// (full detail) and /src/app/icon.svg (simplified, thicker strokes, for
// the browser tab). Rendered through <img> rather than inline SVG so the
// logo's gradient ids can never collide or disappear when several copies
// are on one page (e.g. header + footer + a hidden mobile menu).
//
//  - <KinshasaMark>: logo only, for compact spots (header, backoffice).
//  - <KinshasaSeal>: logo + wordmark stacked, for the footer/About page.
//  - <SpinningWheel>: the wheel's gondola ring on its own, slowly turning —
//    used as the loading indicator and a decorative motif.

export function KinshasaMark({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.svg"
      width={size}
      height={size}
      alt="Kinshasa Label"
      className={`shrink-0 select-none ${className}`}
      draggable={false}
    />
  );
}

export function KinshasaSeal({ size = 128 }: { size?: number }) {
  return (
    <span className="inline-flex flex-col items-center gap-1.5 shrink-0" style={{ width: size }}>
      <KinshasaMark size={size} />
      <span className="font-display font-extrabold tracking-tight text-brand-ink leading-none text-center" style={{ fontSize: Math.max(12, size * 0.14) }}>
        Kinshasa <span className="text-brand-red">Label</span>
      </span>
    </span>
  );
}

const WHEEL_COLORS = ['#D21C2E', '#FCD933', '#1A82F5'];

export function SpinningWheel({ size = 48, spin = true, className = '' }: { size?: number; spin?: boolean; className?: string }) {
  const n = 18;
  return (
    <svg
      width={size}
      height={size}
      viewBox="-50 -50 100 100"
      aria-hidden="true"
      className={`${spin ? 'animate-wheel-spin' : ''} ${className}`}
    >
      <circle r="38" fill="none" stroke="#1A82F5" strokeWidth="3" />
      <circle r="33" fill="none" stroke="#FCD933" strokeWidth="2" />
      {Array.from({ length: n }).map((_, i) => {
        const a = (i / n) * Math.PI * 2;
        const c = WHEEL_COLORS[i % 3];
        return (
          <g key={i}>
            <line x1={Math.cos(a) * 9} y1={Math.sin(a) * 9} x2={Math.cos(a) * 33} y2={Math.sin(a) * 33} stroke={c} strokeWidth="1.6" />
            <rect
              x={Math.cos(a) * 42 - 4}
              y={Math.sin(a) * 42 - 4}
              width="8"
              height="8"
              rx="2"
              fill={c}
              stroke="#fff"
              strokeWidth="1"
            />
          </g>
        );
      })}
      <circle r="7" fill="#D21C2E" stroke="#fff" strokeWidth="2" />
    </svg>
  );
}
