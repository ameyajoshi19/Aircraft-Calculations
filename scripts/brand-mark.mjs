/**
 * The Green Arc mark, as geometry.
 *
 * Single source of truth for every brand asset: app icons, the Android
 * adaptive layers, the splash image and the favicon are all rendered from
 * the functions here, so the mark cannot drift between them.
 *
 * WHAT IT IS
 * A Cessna airspeed indicator. The scale gap sits at twelve o'clock with
 * 40 kt just clockwise of it, running clockwise to 200 at about eleven —
 * which is what puts the green arc down the right side, the caution range
 * on the left, Vne at upper-left and the needle down-right.
 *
 * WHERE THE NUMBERS COME FROM
 * Cessna 172S NAV III POH, Section 2, Figure 2-2 (page 2-5):
 *
 *   White arc    40 - 85    full flap operating range
 *   Green arc    48 - 129   normal operating range
 *   Yellow arc  129 - 163   caution, smooth air only
 *   Red line        163     Vne, maximum for all operations
 *
 * The needle rests at 105 KIAS, a normal cruise, so it sits in the green.
 *
 * The scale is drawn linearly. A real indicator compresses its low end, but
 * the dial carries no numerals, so the difference cannot be seen.
 */

export const KT = { lo: 40, hi: 200 };
export const ARC = { white: [40, 85], green: [48, 129], yellow: [129, 163], vne: 163 };
export const NEEDLE_KT = 105;

const GAP_AT_TOP = 30;   // degrees clockwise from twelve where the scale starts
const SWEEP = 300;       // degrees of travel from KT.lo to KT.hi
const CX = 50, CY = 50;

// Rings, outermost in. Each clears the next, which is what keeps the rim
// from turning to grain when the icon is scaled down.
const R_TICK_OUT = 47, R_TICK_MAJOR = 41.5, R_TICK_MINOR = 44;
const R_WHITE = 37.5, W_WHITE = 4.5;
const R_BAND = 29.5, W_BAND = 9.5;

export const COLOURS = {
  face: '#121214',
  green: '#3E9E68',
  yellow: '#D9B13C',
  red: '#D64A35',
  white: '#EDE6DA',
  needle: '#F2EBDF',
  tick: '#8C877F',
};

const deg = (kt) => GAP_AT_TOP + ((kt - KT.lo) / (KT.hi - KT.lo)) * SWEEP;
const xy = (r, d) => {
  const t = ((d - 90) * Math.PI) / 180;
  return [CX + r * Math.cos(t), CY + r * Math.sin(t)];
};

function band(r, k0, k1, colour, w, cap = 'butt') {
  const [x0, y0] = xy(r, deg(k0));
  const [x1, y1] = xy(r, deg(k1));
  const big = deg(k1) - deg(k0) > 180 ? 1 : 0;
  return `<path d="M${x0.toFixed(3)} ${y0.toFixed(3)} A${r} ${r} 0 ${big} 1 ${x1.toFixed(3)} ${y1.toFixed(3)}" fill="none" stroke="${colour}" stroke-width="${w}" stroke-linecap="${cap}"/>`;
}
function spoke(r0, r1, kt, colour, w, cap = 'butt') {
  const [x0, y0] = xy(r0, deg(kt));
  const [x1, y1] = xy(r1, deg(kt));
  return `<path d="M${x0.toFixed(3)} ${y0.toFixed(3)} L${x1.toFixed(3)} ${y1.toFixed(3)}" stroke="${colour}" stroke-width="${w}" stroke-linecap="${cap}"/>`;
}

/** Tapered blade with the counterweight tail the reference instrument has. */
function needle(colour, length = 27, tail = 10.5) {
  const d = `M ${CX} ${CY - length} L ${CX + 3.4} ${CY + 2} L ${CX + 2.3} ${CY + tail} `
          + `L ${CX - 2.3} ${CY + tail} L ${CX - 3.4} ${CY + 2} Z`;
  return `<g transform="rotate(${deg(NEEDLE_KT).toFixed(3)} ${CX} ${CY})"><path d="${d}" fill="${colour}"/></g>`
       + `<circle cx="${CX}" cy="${CY}" r="5.2" fill="${colour}"/>`;
}

function ticks(colour) {
  let out = '';
  for (let kt = KT.lo; kt <= KT.hi; kt += 10) {
    const major = (kt - KT.lo) % 20 === 0;
    out += spoke(major ? R_TICK_MAJOR : R_TICK_MINOR, R_TICK_OUT, kt, colour, major ? 2.6 : 1.7);
  }
  return out;
}

/** The full colour dial, without a background. */
export function markBody(c = COLOURS) {
  return ticks(c.tick)
    + band(R_WHITE, ARC.white[0], ARC.white[1], c.white, W_WHITE)
    + band(R_BAND, ARC.green[0], ARC.green[1], c.green, W_BAND)
    + band(R_BAND, ARC.yellow[0], ARC.yellow[1], c.yellow, W_BAND)
    + spoke(R_BAND - W_BAND / 2 - 1.5, R_BAND + W_BAND / 2 + 1.5, ARC.vne, c.red, 5)
    + needle(c.needle);
}

/**
 * The single-colour mark, for the Android themed-icon layer and the tab bar.
 *
 * The arc is broken either side of 129 kt so the handover from the normal
 * range to the caution range still reads once the colour that used to carry
 * it is gone, and it is drawn thinner than the colour mark: a fixed angular
 * gap shows up better against a lighter stroke.
 */
const MONO_BREAK_KT = 5;
const MONO_VNE_GAP_KT = 6;
const MONO_STROKE = 6.5;

export function monoBody(colour = '#000000') {
  const w = MONO_STROKE;
  return band(R_BAND, ARC.green[0], ARC.yellow[0] - MONO_BREAK_KT, colour, w, 'round')
    + band(R_BAND, ARC.yellow[0] + MONO_BREAK_KT, ARC.vne - MONO_VNE_GAP_KT, colour, w, 'round')
    + spoke(R_BAND - w / 2 - 2, R_BAND + w / 2 + 2, ARC.vne, colour, 5, 'round')
    + needle(colour);
}

const svg = (viewBox, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>`;

/**
 * Square, opaque, mark on the instrument face. The face is the whole square
 * rather than a circle: iOS and the web both round the corners themselves.
 * Padded so the tick ring clears the rounding.
 */
export const squareIcon = () =>
  svg('-14 -14 128 128', `<rect x="-14" y="-14" width="128" height="128" fill="${COLOURS.face}"/>${markBody()}`);

/**
 * Android adaptive foreground: transparent, with the background layer
 * supplying the face.
 *
 * Android shows 72dp of a 108dp canvas, so the dial is drawn to about 66%
 * of the width. That is the visible area rather than the smaller 66dp
 * guaranteed-safe circle, which is a deliberate choice: every coloured arc
 * finishes inside 48% of the width, so the only thing an aggressive mask
 * can reach is the tip of a tick mark. Sizing to the safe circle instead
 * left the dial visibly smaller than the iOS icon for no gain.
 */
export const androidForeground = () => svg('-23 -23 146 146', markBody());
export const androidMonochrome = () => svg('-23 -23 146 146', monoBody('#000000'));

/** Splash: the dial keeps its own face so it reads on either background. */
export const splashIcon = () =>
  svg('-8 -8 116 116', `<circle cx="${CX}" cy="${CY}" r="49" fill="${COLOURS.face}"/>${markBody()}`);

/** Standalone mark for the .icon bundle, which composites its own backdrop. */
export const bundleMark = () => svg('0 0 100 100', markBody());
