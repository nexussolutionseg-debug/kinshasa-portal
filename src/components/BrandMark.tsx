// Hand-drawn Kinshasa Label brand mark — no external image asset, no icon
// library. Two variants sharing one emblem (a five-point star over three
// river waves, echoing the wavy river band and gold stars on the historic
// Kinshasa/Léopoldville coat of arms, and the Congo's navy/gold/river
// palette) rendered as crisp inline SVG:
//
//  - <KinshasaMark>: compact icon-only badge for small spaces (site header,
//    favicon-scale use). No text — curved lettering doesn't hold up below
//    ~48px, so small sizes stay legible by keeping just the symbol.
//  - <KinshasaSeal>: the full circular "quality seal" treatment — curved
//    wordmark and tagline set along the rim, like a certification stamp.
//    Reserved for places with room to breathe (site footer, share cards).
//
// Both are pure vector paths so they render pixel-crisp at any size and
// pick up currentColor-independent brand colors directly (no external
// font, no network fetch, no build dependency).

const STAR_PATH =
  'M24,11 L25.47,14.98 L29.71,15.15 L26.38,17.77 L27.53,21.85 L24,19.5 L20.47,21.85 L21.62,17.77 L18.29,15.15 L22.53,14.98 Z';

const WAVE_PATHS = [
  'M9,27 Q14,24 19,27 T29,27 T39,27',
  'M8,32 Q13,29 18,32 T28,32 T38,32',
  'M11,37 Q15,34.5 19,37 T27,37 T35,37',
];

function Emblem({ scale = 1, x = 0, y = 0 }: { scale?: number; x?: number; y?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d={STAR_PATH} fill="#C8992E" />
      {WAVE_PATHS.map((d, i) => (
        <path
          key={d}
          d={d}
          fill="none"
          stroke="#5FA8C9"
          strokeWidth={1.6}
          strokeLinecap="round"
          opacity={1 - i * 0.22}
        />
      ))}
    </g>
  );
}

export function KinshasaMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="21" fill="#0B1E3A" stroke="#C8992E" strokeWidth="1.75" />
      <circle cx="24" cy="24" r="17.5" fill="none" stroke="#C8992E" strokeWidth="0.6" opacity="0.5" />
      <Emblem />
    </svg>
  );
}

export function KinshasaSeal({ size = 128 }: { size?: number }) {
  const cx = 100;
  const cy = 100;
  const outerR = 90;
  const innerR = 78;
  const topTextR = 82;
  const bottomTextR = 82;

  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <path
          id="seal-top-arc"
          d={`M ${cx - topTextR},${cy} A ${topTextR},${topTextR} 0 1 1 ${cx + topTextR},${cy}`}
          fill="none"
        />
        <path
          id="seal-bottom-arc"
          d={`M ${cx - bottomTextR},${cy} A ${bottomTextR},${bottomTextR} 0 1 0 ${cx + bottomTextR},${cy}`}
          fill="none"
        />
      </defs>

      <circle cx={cx} cy={cy} r={outerR} fill="#0B1E3A" stroke="#C8992E" strokeWidth="3" />
      <circle cx={cx} cy={cy} r={innerR} fill="none" stroke="#C8992E" strokeWidth="1" opacity="0.55" />
      <circle cx={cx} cy={cy} r={outerR - 3.5} fill="none" stroke="#C8992E" strokeWidth="0.75" opacity="0.35" />

      <text fontSize="12.5" fontWeight={700} letterSpacing="2.5" fill="#F4F1E9">
        <textPath href="#seal-top-arc" startOffset="50%" textAnchor="middle">
          ★ KINSHASA · LABEL ★
        </textPath>
      </text>

      <text fontSize="8" fontWeight={600} letterSpacing="1.5" fill="#9C9284">
        <textPath href="#seal-bottom-arc" startOffset="50%" textAnchor="middle">
          LE MÉDIA-GUIDE DE RÉFÉRENCE
        </textPath>
      </text>

      <Emblem scale={1.9} x={55} y={54} />
    </svg>
  );
}
