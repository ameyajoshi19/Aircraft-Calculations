/**
 * Types shaped to match how a Cessna POH actually tabulates performance,
 * rather than how the app happens to want to consume it.
 *
 * Three differences from the earlier placeholder model matter:
 *
 * 1. Cruise is indexed by the controls the pilot actually sets, and yields
 *    percent power, KTAS and GPH. You do not look up "65% power" and get a
 *    setting back — many settings produce a given percent power.
 * 2. Which controls those are depends on the propeller. A constant-speed
 *    aircraft (182T) is indexed by RPM *and* manifold pressure. A fixed-pitch
 *    one (172S, 162) has no propeller control and no MP to set, so its table
 *    has no MP column at all. That is a different table, not a table with
 *    values missing.
 * 3. Takeoff/landing tables are indexed by *actual OAT* (0/10/20/30/40 °C),
 *    not by deviation from ISA. Cruise tables are the opposite — they use
 *    ISA-relative columns. Conflating the two silently produces wrong
 *    distances on a non-standard day.
 */

/**
 * A single cruise cell: [percent power, KTAS, GPH]. `null` where the POH
 * prints "---" for a setting it does not publish.
 */
export type CruiseCell = readonly [percentPower: number, ktas: number, gph: number] | null;

/**
 * Constant-speed propeller. The book indexes each line by RPM *and* manifold
 * pressure, because the pilot sets both: RPM with the propeller control, MP
 * with the throttle.
 */
export type ConstantSpeedCruiseRow = readonly [
  rpm: number,
  mp: number,
  cold: CruiseCell,
  std: CruiseCell,
  hot: CruiseCell,
];

/**
 * Fixed-pitch propeller. There is one control — the throttle — and RPM is
 * what it reads out, so RPM alone indexes the line.
 */
export type FixedPitchCruiseRow = readonly [
  rpm: number,
  cold: CruiseCell,
  std: CruiseCell,
  hot: CruiseCell,
];

export type CruiseRow = ConstantSpeedCruiseRow | FixedPitchCruiseRow;

/** One published cruise sheet: a pressure altitude and its three temperature columns. */
export interface CruiseAltitudeBlock<Row extends CruiseRow = CruiseRow> {
  pressureAltitudeFt: number;
  /** The actual OAT the POH prints above each of its three temperature columns. */
  tempsC: { cold: number; std: number; hot: number };
  rows: readonly Row[];
}

/**
 * A whole cruise table, tagged by propeller type so the solver and the screens
 * cannot silently treat one kind as the other.
 *
 * `maxCruisePercentPower` is the cap printed in the table's own NOTE (80% for
 * the 182T, 75% for the 172S and 162) — settings above it are tabulated only
 * to aid interpolation and must not be offered as a cruise setting. It lives
 * here rather than as a global constant because it genuinely differs by
 * aircraft.
 *
 * `percentPowerLabel` is how that column is headed: the 182T and 172S print
 * "% MCP", the 162 prints "% BHP". The screens show whichever the book uses.
 */
export type CruiseTable =
  | {
      propeller: 'constant-speed';
      maxCruisePercentPower: number;
      percentPowerLabel: 'MCP' | 'BHP';
      blocks: readonly CruiseAltitudeBlock<ConstantSpeedCruiseRow>[];
    }
  | {
      propeller: 'fixed-pitch';
      maxCruisePercentPower: number;
      percentPowerLabel: 'MCP' | 'BHP';
      blocks: readonly CruiseAltitudeBlock<FixedPitchCruiseRow>[];
    };

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
  /**
   * The standard temperature the sheet is computed at. The 172S prints this
   * as a column; the 182T states "Standard Temperature" in the conditions and
   * leaves it out, so it is optional.
   */
  standardTempC?: number;
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
  cruise: CruiseTable;
  takeoff: readonly FieldWeightBlock[];
  landing: readonly FieldWeightBlock[];
  climbMaxRate: readonly ClimbRow[];
  climbNormal: readonly ClimbRow[];
}
