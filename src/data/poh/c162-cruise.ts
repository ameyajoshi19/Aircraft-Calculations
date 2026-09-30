/**
 * Cessna 162 Skycatcher / Garmin G300 — CRUISE PERFORMANCE, Figure 5-8.
 * POH document 162PHUS-04, page 5-17.
 *
 * Table conditions:
 *   1320 pounds · Recommended Lean Mixture at All Altitudes
 *
 * POH notes on the sheet:
 *   - Maximum cruise power using recommended lean mixture is 75% MCP.
 *     Values above 75% are shown for interpolation purposes only;
 *     operating above 75% requires full rich mixture.
 *   - Speeds are for an airplane WITHOUT speed fairings. With fairings,
 *     ADD 2 knots. (The 172S sheet is the other way round — it publishes the
 *     with-fairings speeds and tells you to subtract 2.)
 *
 * The 162 has a FIXED-PITCH propeller: each line is indexed by RPM alone.
 *
 * READ BY EYE FROM PAGE RENDERS. This book has no text layer over its
 * performance tables — they are scanned bitmaps — so there is no machine
 * comparison available as there is for the 182T and 172S. Instead every cell
 * was read twice, independently: once from a 200 dpi full-page render and
 * again from 300 dpi crops. `npm run check:poh` then checks the physical
 * relationships the table must obey.
 *
 * One cell has a third, independent confirmation: the sample problem on page
 * 5-6, which IS in the text layer, works 6000 ft at 20°C above standard and
 * 2750 RPM and prints 64% / 108 knots / 6.0 GPH — exactly the cell below.
 * `npm run check:cruise` asserts the solver reproduces it.
 */
import type { CruiseAltitudeBlock, CruiseTable, FixedPitchCruiseRow } from './types.ts';

/**
 * Column temperatures.
 *
 * The sheet heads its columns "20°C BELOW STANDARD TEMP / STANDARD
 * TEMPERATURE / 20°C ABOVE STANDARD TEMP" without printing an actual OAT.
 * This book defines the standard itself, in the Section 1 glossary: "Standard
 * Temperature is 15°C at sea level pressure altitude and decreases by 2°C for
 * each 1000 feet of altitude." So these are the book's own numbers.
 */
const standardTempC = (pressureAltitudeFt: number) => 15 - (pressureAltitudeFt / 1000) * 2;


// 2,000 ft. Standard temperature 11°C.
const FT_2000: FixedPitchCruiseRow[] = [
  [2750, null, [84, 113, 7.3], [75, 110, 6.6]],
  [2550, [68, 102, 6.3], [62, 101, 5.8], [58, 99, 5.5]],
  [2350, [52, 91, 5.0], [49, 90, 4.7], [46, 89, 4.5]],
  [2150, [41, 81, 4.0], [39, 79, 3.8], [38, 78, 3.7]],
];

// 4,000 ft. Standard temperature 7°C.
const FT_4000: FixedPitchCruiseRow[] = [
  [2750, [88, 115, 7.5], [75, 111, 6.7], [69, 109, 6.3]],
  [2550, [63, 101, 5.9], [59, 100, 5.5], [55, 98, 5.2]],
  [2350, [50, 90, 4.7], [47, 89, 4.5], [44, 88, 4.3]],
  [2150, [40, 80, 3.9], [38, 78, 3.7], [37, 77, 3.6]],
];

// 6,000 ft. Standard temperature 3°C.
const FT_6000: FixedPitchCruiseRow[] = [
  [2750, [77, 111, 6.8], [69, 109, 6.3], [64, 108, 6.0]],
  [2550, [59, 100, 5.6], [55, 99, 5.2], [52, 97, 4.9]],
  [2350, [47, 89, 4.5], [45, 88, 4.3], [43, 87, 4.1]],
  [2150, [38, 79, 3.7], [37, 77, 3.6], [36, 76, 3.6]],
];

// 8,000 ft. Standard temperature -1°C.
const FT_8000: FixedPitchCruiseRow[] = [
  [2750, [71, 110, 6.4], [65, 108, 6.0], [61, 107, 5.7]],
  [2550, [56, 99, 5.3], [52, 97, 5.0], [49, 96, 4.7]],
  [2350, [45, 88, 4.4], [43, 87, 4.2], [41, 85, 4.0]],
  [2150, [37, 78, 3.6], [36, 76, 3.6], [36, 75, 3.6]],
];

// 10,000 ft. Standard temperature -5°C.
const FT_10000: FixedPitchCruiseRow[] = [
  [2650, [59, 103, 5.5], [55, 101, 5.2], [52, 100, 4.9]],
  [2450, [48, 92, 4.6], [45, 91, 4.4], [43, 90, 4.2]],
  [2250, [39, 82, 3.9], [38, 80, 3.7], [38, 79, 3.7]],
];

// 12,000 ft. Standard temperature -9°C.
const FT_12000: FixedPitchCruiseRow[] = [
  [2650, [56, 102, 5.3], [52, 100, 5.0], [50, 99, 4.8]],
  [2450, [46, 91, 4.4], [43, 90, 4.2], [42, 88, 4.1]],
  [2250, [38, 81, 3.8], [38, 79, 3.7], [37, 78, 3.7]],
];

const blocks: CruiseAltitudeBlock<FixedPitchCruiseRow>[] = [
  {
    pressureAltitudeFt: 2000,
    tempsC: { cold: standardTempC(2000) - 20, std: standardTempC(2000), hot: standardTempC(2000) + 20 },
    rows: FT_2000,
  },
  {
    pressureAltitudeFt: 4000,
    tempsC: { cold: standardTempC(4000) - 20, std: standardTempC(4000), hot: standardTempC(4000) + 20 },
    rows: FT_4000,
  },
  {
    pressureAltitudeFt: 6000,
    tempsC: { cold: standardTempC(6000) - 20, std: standardTempC(6000), hot: standardTempC(6000) + 20 },
    rows: FT_6000,
  },
  {
    pressureAltitudeFt: 8000,
    tempsC: { cold: standardTempC(8000) - 20, std: standardTempC(8000), hot: standardTempC(8000) + 20 },
    rows: FT_8000,
  },
  {
    pressureAltitudeFt: 10000,
    tempsC: { cold: standardTempC(10000) - 20, std: standardTempC(10000), hot: standardTempC(10000) + 20 },
    rows: FT_10000,
  },
  {
    pressureAltitudeFt: 12000,
    tempsC: { cold: standardTempC(12000) - 20, std: standardTempC(12000), hot: standardTempC(12000) + 20 },
    rows: FT_12000,
  },
];

export const c162Cruise: CruiseTable = {
  propeller: 'fixed-pitch',
  // The sheet's NOTE caps cruise at 75%, though its column is headed "% BHP"
  // rather than "% MCP" — the note and the column heading disagree in the
  // book itself. The cap is what matters and 75% is what it says.
  maxCruisePercentPower: 75,
  percentPowerLabel: 'BHP',
  blocks,
};

/**
 * Figure 5-8 note: the tabulated speeds assume NO speed fairings. Add this to
 * KTAS for an airframe that has them.
 */
export const C162_SPEED_FAIRINGS_KTAS_BONUS = 2;
