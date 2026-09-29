/**
 * Cessna 172S NAV III / GFC 700 AFCS — CRUISE PERFORMANCE, Figure 5-8.
 * POH document 172SPHBUS-00, pages 5-19 and 5-20 (sheets 1 and 2).
 *
 * Table conditions (both sheets):
 *   2550 pounds · Recommended Lean Mixture
 *
 * POH notes carried on both sheets:
 *   - Maximum cruise power using recommended lean mixture is 75% MCP.
 *     Settings above 75% are listed to aid interpolation; operating above
 *     75% requires full rich mixture, so they are not cruise settings.
 *   - Speeds are for an airplane WITH speed fairings. Without them, subtract
 *     2 knots. (The 162's table is the other way round — it publishes the
 *     no-fairing speeds and tells you to add 2.)
 *
 * The 172S has a FIXED-PITCH propeller, so each line is indexed by RPM alone:
 * there is no manifold pressure column in this table at all.
 *
 * Extracted from the POH PDF's own text layer rather than read by eye, then
 * checked by `npm run check:poh` and re-compared against the same text layer
 * by `npm run verify:172s`. Spot-checked against rendered page images.
 */
import type { CruiseAltitudeBlock, CruiseTable, FixedPitchCruiseRow } from './types.ts';

/**
 * Column temperatures.
 *
 * Unlike the 182T, these sheets head their columns "20°C BELOW STANDARD TEMP /
 * STANDARD TEMPERATURE / 20°C ABOVE STANDARD TEMP" without printing the actual
 * OAT. The standard temperature comes from this same book: Figure 5-7 (page
 * 5-18) tabulates it per pressure altitude, 15°C at sea level falling 2°C per
 * 1000 ft. So the numbers below are the book's own, not an outside assumption.
 */
const standardTempC = (pressureAltitudeFt: number) => 15 - (pressureAltitudeFt / 1000) * 2;


// 2,000 ft. Standard temperature 11°C.
const FT_2000: FixedPitchCruiseRow[] = [
  [2550, [83, 117, 11.1], [77, 118, 10.5], [72, 117, 9.9]],
  [2500, [78, 115, 10.6], [73, 115, 9.9], [68, 115, 9.4]],
  [2400, [69, 111, 9.6], [64, 110, 9.0], [60, 109, 8.5]],
  [2300, [61, 105, 8.6], [57, 104, 8.1], [53, 102, 7.7]],
  [2200, [53, 99, 7.7], [50, 97, 7.3], [47, 95, 6.9]],
  [2100, [47, 92, 6.9], [44, 90, 6.6], [42, 89, 6.3]],
];

// 4,000 ft. Standard temperature 7°C.
const FT_4000: FixedPitchCruiseRow[] = [
  [2600, [83, 120, 11.1], [77, 120, 10.4], [72, 119, 9.8]],
  [2550, [79, 118, 10.6], [73, 117, 9.9], [68, 117, 9.4]],
  [2500, [74, 115, 10.1], [69, 115, 9.5], [64, 114, 8.9]],
  [2400, [65, 110, 9.1], [61, 109, 8.5], [57, 107, 8.1]],
  [2300, [58, 104, 8.2], [54, 102, 7.7], [51, 101, 7.3]],
  [2200, [51, 98, 7.4], [48, 96, 7.0], [45, 94, 6.7]],
  [2100, [45, 91, 6.6], [42, 89, 6.4], [40, 87, 6.1]],
];

// 6,000 ft. Standard temperature 3°C.
const FT_6000: FixedPitchCruiseRow[] = [
  [2650, [83, 122, 11.1], [77, 122, 10.4], [72, 121, 9.8]],
  [2600, [78, 120, 10.6], [73, 119, 9.9], [68, 118, 9.4]],
  [2500, [70, 115, 9.6], [65, 114, 9.0], [60, 112, 8.5]],
  [2400, [62, 109, 8.6], [57, 108, 8.2], [54, 106, 7.7]],
  [2300, [54, 103, 7.8], [51, 101, 7.4], [48, 99, 7.0]],
  [2200, [48, 96, 7.1], [45, 94, 6.7], [43, 92, 6.4]],
];

// 8,000 ft. Standard temperature -1°C.
const FT_8000: FixedPitchCruiseRow[] = [
  [2700, [83, 125, 11.1], [77, 124, 10.4], [71, 123, 9.7]],
  [2650, [78, 122, 10.5], [72, 122, 9.9], [67, 120, 9.3]],
  [2600, [74, 120, 10.0], [68, 119, 9.4], [64, 117, 8.9]],
  [2500, [65, 114, 9.1], [61, 112, 8.6], [57, 111, 8.1]],
  [2400, [58, 108, 8.2], [54, 106, 7.8], [51, 104, 7.4]],
  [2300, [52, 101, 7.5], [48, 99, 7.1], [46, 97, 6.8]],
  [2200, [46, 94, 6.8], [43, 92, 6.5], [41, 90, 6.2]],
];

// 10,000 ft. Standard temperature -5°C.
const FT_10000: FixedPitchCruiseRow[] = [
  [2700, [78, 124, 10.5], [72, 123, 9.8], [67, 122, 9.3]],
  [2650, [73, 122, 10.0], [68, 120, 9.4], [63, 119, 8.9]],
  [2600, [69, 119, 9.5], [64, 117, 9.0], [60, 115, 8.5]],
  [2500, [62, 113, 8.7], [57, 111, 8.2], [54, 109, 7.8]],
  [2400, [55, 106, 7.9], [51, 104, 7.5], [49, 102, 7.1]],
  [2300, [49, 100, 7.2], [46, 97, 6.8], [44, 95, 6.5]],
];

// 12,000 ft. Standard temperature -9°C.
const FT_12000: FixedPitchCruiseRow[] = [
  [2650, [69, 121, 9.5], [64, 119, 8.9], [60, 117, 8.5]],
  [2600, [65, 118, 9.1], [61, 116, 8.5], [57, 114, 8.1]],
  [2500, [58, 111, 8.3], [54, 109, 7.8], [51, 107, 7.4]],
  [2400, [52, 105, 7.5], [49, 102, 7.1], [46, 100, 6.8]],
  [2300, [47, 98, 6.9], [44, 95, 6.6], [41, 92, 6.3]],
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

export const c172sCruise: CruiseTable = {
  propeller: 'fixed-pitch',
  // NOTE on both sheets: "Maximum cruise power using recommended lean mixture
  // is 75% MCP. Power settings above 75% MCP are listed to aid interpolation.
  // Operations above 75% MCP must use full rich mixture."
  maxCruisePercentPower: 75,
  percentPowerLabel: 'MCP',
  blocks,
};

/**
 * Figure 5-8 note: the tabulated speeds assume speed fairings are fitted.
 * Subtract this from KTAS for an airframe without them.
 */
export const C172S_NO_SPEED_FAIRINGS_KTAS_PENALTY = 2;

/**
 * POH Figure 4-3 note (page 4-34): the cruise charts assume maximum gross
 * weight. Below it, TAS increases by roughly 1 knot per 150 lb under at
 * 55-75% power, or 1 knot per 125 lb under at powers below 65%.
 */
export function trueAirspeedWeightCorrectionKts(
  weightLbs: number,
  maxGrossWeightLbs: number,
  percentPower: number
): number {
  const under = Math.max(maxGrossWeightLbs - weightLbs, 0);
  return under / (percentPower < 65 ? 125 : 150);
}
