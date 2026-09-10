// Hand-drawn Kinshasa Label brand mark — no external image asset, no icon
// library. Per client feedback (2026-09-10: "use Kinshasa flag instead of
// the blue logo"), the mark's interior is the actual national flag of the
// Democratic Republic of the Congo — the flag the client linked to —
// clipped into a circular badge, rather than the earlier river-wave/star
// emblem on a plain navy disc.
//
// Flag geometry (per the flag's official specification): a sky blue
// field, a red diagonal stripe fimbriated (bordered) in yellow running
// from the lower hoist corner to the upper fly corner, and a yellow
// five-point star in the upper hoist canton. Official colors:
// blue #007FFF, red #CE1021, yellow #F7D618.
//
//  - <KinshasaMark>: compact icon-only badge for small spaces (site header,
//    favicon-scale use).
//  - <KinshasaSeal>: the full circular "quality seal" treatment — curved
//    wordmark and tagline set along the rim, like a certification stamp.
//    Reserved for places with room to breathe (site footer, share cards).
//
// Both keep the gold "seal" ring from the previous mark so they still read
// as a certification/quality mark rather than a plain flag icon — that
// framing is the point of "Kinshasa Label". Both are pure vector paths,
// so they render pixel-crisp at any size with no image file, no external
// font, and no network fetch.

const FLAG_BLUE = '#007FFF';
const FLAG_RED = '#CE1021';
const FLAG_YELLOW = '#F7D618';

// A five-point star, outer radius 1, centered on the origin — scale and
// translate this to place it at any size or position.
const STAR_UNIT_PATH =
  'M0,-1 L0.2245,-0.309 L0.9511,-0.309 L0.3633,0.118 L0.5878,0.809 L0,0.382 L-0.5878,0.809 L-0.3633,0.118 L-0.9511,-0.309 L-0.2245,-0.309 Z';

// Renders the flag clipped into a circle of a given center/radius. Used at
// two different sizes (compact mark, full seal); the clip id is derived
// from the circle's own geometry so two different-sized discs on the same
// page never collide, without needing a hook or a mutable counter.
function FlagDisc({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const clipId = `flag-clip-${cx}-${cy}-${r}`;
  const d = r * 2;
  const x0 = cx - r;
  const y0 = cy - r;
  const starScale = r * 0.22;
  const starX = cx - r * 0.52;
  const starY = cy - r * 0.48;

  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect x={x0} y={y0} width={d} height={d} fill={FLAG_BLUE} />
        {/* Diagonal band: lower-hoist (bottom-left) to upper-fly (top-right),
            drawn as a wide yellow line with a narrower red line on top —
            the standard way to fake a fimbriated (bordered) stripe. */}
        <line x1={x0} y1={y0 + d} x2={x0 + d} y2={y0} stroke={FLAG_YELLOW} strokeWidth={r * 0.34} />
        <line x1={x0} y1={y0 + d} x2={x0 + d} y2={y0} stroke={FLAG_RED} strokeWidth={r * 0.2} />
        <path d={STAR_UNIT_PATH} fill={FLAG_YELLOW} transform={`translate(${starX} ${starY}) scale(${starScale})`} />
      </g>
    </g>
  );
}

export function KinshasaMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <FlagDisc cx={24} cy={24} r={21} />
      <circle cx="24" cy="24" r="21" fill="none" stroke="#C8992E" strokeWidth="1.75" />
      <circle cx="24" cy="24" r="17.5" fill="none" stroke="#C8992E" strokeWidth="0.6" opacity="0.5" />
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

      <FlagDisc cx={cx} cy={cy} r={innerR - 4} />

      <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="#C8992E" strokeWidth="3" />
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
    </svg>
  );
}
