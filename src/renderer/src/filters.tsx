// Camera-feed looks. Each is an SVG filter applied with CSS `filter: url(#id)`.
//
// An ordinary camera sees light, not heat: bright walls and windows would read
// "hot" and faces "cold". So every look first builds a fake heat image:
//   heat = 0.75 × skin + 0.30 × brightness + 0.05
// Skin is detected by colour (YCbCr chroma), so faces and hands come out hot and
// the room cool, with a little brightness kept for texture. This needs a colour
// camera; with a black-and-white camera only the brightness term remains.
// A gradient map then turns heat into the palette: each table lists one colour
// channel at evenly spaced heat stops, coldest first.

export const FEED_FILTERS = ['green', 'thermal', 'whitehot'] as const;
export type FeedFilter = (typeof FEED_FILTERS)[number];
/** Look used when none is chosen with --filter. */
export const DEFAULT_FILTER: FeedFilter = 'thermal';

export const isFeedFilter = (s: string | null): s is FeedFilter =>
  (FEED_FILTERS as readonly string[]).includes(s ?? '');

// Band-pass lookup over 20 equal steps (0.05 each): 1 inside the band, 0 outside.
const band = (fromStep: number, toStep: number) =>
  Array.from({ length: 20 }, (_, i) => (i >= fromStep && i <= toStep ? 1 : 0)).join(' ');
// Typical skin chroma: Cr ≈ 0.55–0.70, Cb ≈ 0.30–0.50.
const CR_SKIN = band(11, 13);
const CB_SKIN = band(6, 9);

// Fake heat image, left in every channel. `id` keeps result names unique per filter.
function Heat({ id }: { id: string }) {
  const r = (name: string) => `${id}-${name}`;
  return (
    <>
      {/* Thermal sensors are low resolution; soften a little. */}
      {/* edgeMode="duplicate" stops the blur pulling in transparent pixels at the frame edge. */}
      <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" edgeMode="duplicate" result={r('src')} />
      {/* Brightness (Rec. 709 luma) in every channel */}
      <feColorMatrix
        in={r('src')}
        type="matrix"
        values="0.2126 0.7152 0.0722 0 0
                0.2126 0.7152 0.0722 0 0
                0.2126 0.7152 0.0722 0 0
                0      0      0      1 0"
        result={r('lum')}
      />
      {/* Chroma: Cr into red, Cb into green, then keep only skin-coloured values */}
      <feColorMatrix
        in={r('src')}
        type="matrix"
        values=" 0.500 -0.419 -0.081 0 0.5
                -0.169 -0.331  0.500 0 0.5
                 0      0      0     0 0
                 0      0      0     1 0"
      />
      <feComponentTransfer result={r('chroma')}>
        <feFuncR type="discrete" tableValues={CR_SKIN} />
        <feFuncG type="discrete" tableValues={CB_SKIN} />
      </feComponentTransfer>
      {/* skin = Cr-in-band × Cb-in-band, spread into every channel */}
      <feColorMatrix in={r('chroma')} type="matrix" values="1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 1 0" result={r('cr')} />
      <feColorMatrix in={r('chroma')} type="matrix" values="0 1 0 0 0  0 1 0 0 0  0 1 0 0 0  0 0 0 1 0" result={r('cb')} />
      <feComposite in={r('cr')} in2={r('cb')} operator="arithmetic" k1="1" />
      {/* Body heat bleeds outward a little */}
      <feGaussianBlur stdDeviation="4" edgeMode="duplicate" result={r('skin')} />
      <feComposite in={r('skin')} in2={r('lum')} operator="arithmetic" k2="0.75" k3="0.30" k4="0.05" />
      {/* The arithmetic step also blends alpha; make the result fully opaque. */}
      <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0 1" />
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
        <Heat id="green" />
        <GradientMap r="0 0 0.05 0.35 0.85 1" g="0 0.30 0.60 0.90 1 1" b="0 0.03 0.08 0.15 0.45 1" />
      </filter>

      {/* thermal: colour heat map, "Predator" style; cold is dark blue,
          then cyan, green, yellow, red, and the hottest areas white */}
      <filter id="thermal" x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB">
        <Heat id="thermal" />
        <GradientMap r="0 0 0 0 1 1 1" g="0 0 0.9 1 1 0.15 1" b="0.25 1 1 0 0 0 1" />
      </filter>

      {/* whitehot: black-and-white infrared, hot is white. A bright tone
          curve, then a glow taken from just the hottest parts so they bloom. */}
      <filter id="whitehot" x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB">
        <Heat id="whitehot" />
        <GradientMap
          r="0.04 0.20 0.42 0.68 0.90 1"
          g="0.04 0.20 0.42 0.68 0.90 1"
          b="0.04 0.20 0.42 0.68 0.90 1"
          result="whitehot-base"
        />
        <GradientMap r="0 0 0 0.2 0.7 1" g="0 0 0 0.2 0.7 1" b="0 0 0 0.2 0.7 1" />
        <feGaussianBlur stdDeviation="8" edgeMode="duplicate" result="whitehot-glow" />
        <feBlend in="whitehot-base" in2="whitehot-glow" mode="screen" />
      </filter>
    </svg>
  );
}
