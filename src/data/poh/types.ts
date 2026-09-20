/**
 * Types shaped to match how a Cessna POH actually tabulates performance,
 * rather than how the app happens to want to consume it.
 *
 * Two differences from the earlier placeholder model matter:
 *
 * 1. Cruise is indexed by RPM *and* manifold pressure, and yields %MCP,
 *    KTAS and GPH. You do not look up "65% power" and get an RPM/MP back —
 *    many RPM/MP combinations produce a given %MCP.
 * 2. Takeoff/landing tables are indexed by *actual OAT* (0/10/20/30/40 °C),
 *    not by deviation from ISA. Cruise tables are the opposite — they use
 *    ISA-relative columns. Conflating the two silently produces wrong
 *    distances on a non-standard day.
 */

/** A single cruise cell: [%MCP, KTAS, GPH]. `null` where the POH prints "---". */
export type CruiseCell = readonly [percentMcp: number, ktas: number, gph: number] | null;

/** One tabulated line: [RPM, MP inHg, 20°C-below cell, standard cell, 20°C-above cell]. */
export type CruiseRow = readonly [rpm: number, mp: number, cold: CruiseCell, std: CruiseCell, hot: CruiseCell];

export interface CruiseAltitudeBlock {
  pressureAltitudeFt: number;
  /** The actual OAT the POH prints above each of its three temperature columns. */
  tempsC: { cold: number; std: number; hot: number };
  rows: readonly CruiseRow[];
}

/** [pressure altitude ft, ground roll ft, total ft to clear a 50 ft obstacle]. */
export type FieldRow = readonly [pressureAltitudeFt: number, groundRollFt: number | null, over50ftFt: number | null];

export interface FieldWeightBlock {
  weightLbs: number;
  liftOffKias?: number;
  overObstacleKias?: number;
  /** Keyed by the POH's actual-OAT columns, in °C. */
  byOatC: Record<number, readonly FieldRow[]>;
}

export interface ClimbRow {
  pressureAltitudeFt: number;
  climbSpeedKias: number;
  rateOfClimbFpm: number;
  timeMin: number;
  fuelGal: number;
  distanceNm: number;
}

/** Piecewise CG envelope: forward limit varies with weight, aft limit may be constant. */
export interface CgEnvelopePoint {
  weightLbs: number;
  forwardArmIn: number;
  aftArmIn: number;
}

export interface PohDocument {
  /** The POH's own document number, so a transcription can be traced to its source. */
  documentNumber: string;
  model: string;
  maxRampWeightLbs: number;
  maxTakeoffWeightLbs: number;
  maxLandingWeightLbs: number;
  standardEmptyWeightLbs: number;
  maxUsefulLoadLbs: number;
  cgEnvelope: readonly CgEnvelopePoint[];
  cruise: readonly CruiseAltitudeBlock[];
  takeoff: readonly FieldWeightBlock[];
  landing: readonly FieldWeightBlock[];
  climbMaxRate: readonly ClimbRow[];
  climbNormal: readonly ClimbRow[];
}
