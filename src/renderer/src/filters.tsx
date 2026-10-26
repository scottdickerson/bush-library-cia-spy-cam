// Camera-feed looks. Each is an SVG filter applied with CSS `filter: url(#id)`.
// green, thermal and bw reduce the camera image to brightness with extra
// contrast. green and thermal then pass it through a gradient map, using
// brightness as stand-in "heat": each table lists one colour channel at evenly
// spaced brightness stops, darkest first. thermal-skin uses the thermal
// palette but makes skin the heat source (see SkinHeat). none shows the raw
// camera image, with no SVG filter. thermal-plain is thermal without the
// satellite overlay.

export const FEED_FILTERS = ['green', 'thermal', 'thermal-plain', 'thermal-skin', 'bw', 'none'] as const;
export type FeedFilter = (typeof FEED_FILTERS)[number];
/** Look used when none is chosen with --filter. */
export const DEFAULT_FILTER: FeedFilter = 'thermal-plain';

export const isFeedFilter = (s: string | null): s is FeedFilter =>
  (FEED_FILTERS as readonly string[]).includes(s ?? '');

/** CSS filter for a look: its SVG filter, or none for the raw camera. */
export const cssFilter = (f: FeedFilter) =>
  f === 'none' ? undefined : `url(#${f === 'thermal-plain' ? 'thermal' : f})`;

/** Whether a look draws the satellite overlay (crosshair, brackets, text). */
export const showsOverlay = (f: FeedFilter) => f !== 'thermal-plain';

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

// Band-pass lookup over 20 equal steps (0.05 each): 1 inside the band, 0 outside.
const band = (fromStep: number, toStep: number) =>
  Array.from({ length: 20 }, (_, i) => (i >= fromStep && i <= toStep ? 1 : 0)).join(' ');
// Typical skin chroma: Cr ≈ 0.55–0.70, Cb ≈ 0.30–0.50.
const CR_SKIN = band(11, 13);
const CB_SKIN = band(6, 9);

// A normal camera sees light, not heat, so estimate heat instead:
//   heat = 0.75 × skin + 0.30 × brightness + 0.05
// Skin is detected by colour (YCbCr chroma), so faces and hands come out hot
// and the room cool, with a little brightness kept for texture. Needs a colour
// camera; with a black-and-white camera only the brightness term remains.
function SkinHeat() {
  return (
    <>
      <feColorMatrix
        in="SourceGraphic"
        type="matrix"
        values="0.2126 0.7152 0.0722 0 0
                0.2126 0.7152 0.0722 0 0
                0.2126 0.7152 0.0722 0 0
                0      0      0      1 0"
        result="skin-lum"
      />
      {/* Chroma: Cr into red, Cb into green, then keep only skin-coloured values */}
      <feColorMatrix
        in="SourceGraphic"
        type="matrix"
        values=" 0.500 -0.419 -0.081 0 0.5
                -0.169 -0.331  0.500 0 0.5
                 0      0      0     0 0
                 0      0      0     1 0"
      />
      <feComponentTransfer result="skin-chroma">
        <feFuncR type="discrete" tableValues={CR_SKIN} />
        <feFuncG type="discrete" tableValues={CB_SKIN} />
      </feComponentTransfer>
      {/* skin = Cr-in-band × Cb-in-band, spread into every channel */}
      <feColorMatrix in="skin-chroma" type="matrix" values="1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 1 0" result="skin-cr" />
      <feColorMatrix in="skin-chroma" type="matrix" values="0 1 0 0 0  0 1 0 0 0  0 1 0 0 0  0 0 0 1 0" result="skin-cb" />
      <feComposite in="skin-cr" in2="skin-cb" operator="arithmetic" k1="1" result="skin-mask" />
      <feComposite in="skin-mask" in2="skin-lum" operator="arithmetic" k2="0.75" k3="0.30" k4="0.05" />
      {/* The arithmetic step also blends alpha; make the result fully opaque. */}
      <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0 1" />
    </>
  );
}

const THERMAL = { r: '0 0 0 0 1 1 1', g: '0 0 0.9 1 1 0.15 1', b: '0.25 1 1 0 0 0 1' };

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
        <GradientMap {...THERMAL} />
      </filter>

      {/* thermal-skin: the thermal palette with skin as the heat source */}
      <filter id="thermal-skin" x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB">
        <SkinHeat />
        <GradientMap {...THERMAL} />
      </filter>

      {/* bw: plain black-and-white feed with a little extra contrast */}
      <filter id="bw" x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB">
        <Brightness slope={1.2} intercept={-0.05} />
      </filter>
    </svg>
  );
}
