// Camera-feed looks. Each is an SVG filter applied with CSS `filter: url(#id)`.
// All three reduce the camera image to brightness with extra contrast. green and
// thermal then pass it through a gradient map, using brightness as stand-in
// "heat": each table lists one colour channel at evenly spaced brightness
// stops, darkest first.

export const FEED_FILTERS = ['green', 'thermal', 'bw'] as const;
export type FeedFilter = (typeof FEED_FILTERS)[number];
/** Look used when none is chosen with --filter. */
export const DEFAULT_FILTER: FeedFilter = 'thermal';

export const isFeedFilter = (s: string | null): s is FeedFilter =>
  (FEED_FILTERS as readonly string[]).includes(s ?? '');

// Brightness (Rec. 709 luma) in every channel, then a linear contrast stretch.
function Brightness({ slope, intercept }: { slope: number; intercept: number }) {
  return (
    <>
      <feColorMatrix
        type="matrix"
        values="0.2126 0.7152 0.0722 0 0
                0.2126 0.7152 0.0722 0 0
                0.2126 0.7152 0.0722 0 0
                0      0      0      1 0"
      />
      <feComponentTransfer>
        <feFuncR type="linear" slope={slope} intercept={intercept} />
        <feFuncG type="linear" slope={slope} intercept={intercept} />
        <feFuncB type="linear" slope={slope} intercept={intercept} />
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
      <filter id="green" x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB">
        <Brightness slope={1.4} intercept={-0.2} />
        <GradientMap r="0 0 0.05 0.35 0.85 1" g="0 0.30 0.60 0.90 1 1" b="0 0.03 0.08 0.15 0.45 1" />
      </filter>

      {/* thermal: colour heat map, "Predator" style; cold is dark blue,
          then cyan, green, yellow, red, and the hottest areas white */}
      <filter id="thermal" x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB">
        <Brightness slope={1.4} intercept={-0.2} />
        <GradientMap r="0 0 0 0 1 1 1" g="0 0 0.9 1 1 0.15 1" b="0.25 1 1 0 0 0 1" />
      </filter>

      {/* bw: plain black-and-white feed with a little extra contrast */}
      <filter id="bw" x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB">
        <Brightness slope={1.2} intercept={-0.05} />
      </filter>
    </svg>
  );
}
