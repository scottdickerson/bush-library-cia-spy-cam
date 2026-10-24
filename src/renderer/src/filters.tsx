// Camera-feed looks. Each is an SVG filter applied with CSS `filter: url(#id)`.
// All share the same front end: soften (thermal sensors are low resolution),
// reduce to brightness, and stretch contrast so faces and hands read as "hot".
// Then a gradient map turns brightness into the palette: each table lists one
// colour channel at evenly spaced brightness stops, darkest first.

export const FEED_FILTERS = ['green', 'thermal', 'whitehot'] as const;
export type FeedFilter = (typeof FEED_FILTERS)[number];
/** Look used when none is chosen with --filter. */
export const DEFAULT_FILTER: FeedFilter = 'thermal';

export const isFeedFilter = (s: string | null): s is FeedFilter =>
  (FEED_FILTERS as readonly string[]).includes(s ?? '');

function Prelude() {
  return (
    <>
      <feGaussianBlur stdDeviation="1.2" />
      {/* Rec. 709 luma in every channel */}
      <feColorMatrix
        type="matrix"
        values="0.2126 0.7152 0.0722 0 0
                0.2126 0.7152 0.0722 0 0
                0.2126 0.7152 0.0722 0 0
                0      0      0      1 0"
      />
      <feComponentTransfer>
        <feFuncR type="linear" slope="1.4" intercept="-0.2" />
        <feFuncG type="linear" slope="1.4" intercept="-0.2" />
        <feFuncB type="linear" slope="1.4" intercept="-0.2" />
      </feComponentTransfer>
    </>
  );
}

function GradientMap({ r, g, b, result }: { r: string; g: string; b: string; result?: string }) {
  return (
    <feComponentTransfer result={result}>
      <feFuncR type="table" tableValues={r} />
      <feFuncG type="table" tableValues={g} />
      <feFuncB type="table" tableValues={b} />
    </feComponentTransfer>
  );
}

export function FeedFilters() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
      {/* green: the original night-vision green, with hot areas going
          bright yellow-green to white */}
      <filter id="green" colorInterpolationFilters="sRGB">
        <Prelude />
        <GradientMap r="0 0 0.05 0.35 0.85 1" g="0 0.30 0.60 0.90 1 1" b="0 0.03 0.08 0.15 0.45 1" />
      </filter>

      {/* thermal: colour heat map, "Predator" style; cold is dark blue,
          then cyan, green, yellow, red, and the hottest areas white */}
      <filter id="thermal" colorInterpolationFilters="sRGB">
        <Prelude />
        <GradientMap r="0 0 0 0 1 1 1" g="0 0 0.9 1 1 0.15 1" b="0.25 1 1 0 0 0 1" />
      </filter>

      {/* whitehot: black-and-white infrared, hot is white. A tone curve
          pushes warm areas up, then a glow taken from just the brightest
          parts makes hotspots bloom white. */}
      <filter id="whitehot" colorInterpolationFilters="sRGB">
        <Prelude />
        <GradientMap r="0 0.08 0.22 0.45 0.80 1" g="0 0.08 0.22 0.45 0.80 1" b="0 0.08 0.22 0.45 0.80 1" result="base" />
        <GradientMap r="0 0 0 0 0.5 1" g="0 0 0 0 0.5 1" b="0 0 0 0 0.5 1" />
        <feGaussianBlur stdDeviation="6" result="glow" />
        <feBlend in="base" in2="glow" mode="screen" />
      </filter>
    </svg>
  );
}
