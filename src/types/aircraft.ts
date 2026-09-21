/**
 * Data model for an aircraft the app can compute with.
 *
 * Performance tables use the same shapes the POH itself uses (see
 * `data/poh/types.ts`), so real transcriptions and placeholder stand-ins
 * flow through one code path. `dataSource: 'placeholder'` marks an aircraft
 * whose numbers are demo values, so every screen can warn on it.
 */
import type { CruiseAltitudeBlock, FieldWeightBlock } from '@/data/poh/types';

export type DataSource = 'placeholder' | 'poh';

export interface WeightBalanceStation {
  id: string;
  label: string;
  /** Arm, inches aft of datum. */
  arm: number;
  /** Per-station weight limit, e.g. a baggage compartment maximum. */
  maxWeight?: number;
}

/** At this weight, CG must fall within [forwardArm, aftArm]. */
export interface EnvelopePoint {
  weight: number;
  forwardArm: number;
  aftArm: number;
}

/**
 * A limit spanning several stations at once — the 182T caps baggage areas
 * A+B+C at 200 lb and B+C at 80 lb, which per-station maximums cannot say.
 */
export interface CombinedWeightLimit {
  stationIds: string[];
  maxWeightLbs: number;
  label: string;
}

/** An RPM the cruise dropdown offers, with the POH-free label the pilot sees. */
export interface RpmPreset {
  rpm: number;
  label?: string;
}

/** One of the target power settings the cruise screen offers. */
export interface TargetPowerPreset {
  percentMcp: number;
  label: string;
}

export interface AircraftProfile {
  id: string;
  tailNumber?: string;
  /** Compact type designation shown in screen subtitles, e.g. "C182T". */
  shortName: string;
  model: string;

  engineHp: number;
  maxSpeedKts: number;
  serviceCeilingFt: number;

  emptyWeightLbs: number;
  emptyWeightArm: number;
  maxGrossWeightLbs: number;
  maxLandingWeightLbs: number;
  usableFuelGal: number;
  fuelLbsPerGal: number;
  fuelArm: number;

  stations: WeightBalanceStation[];
  envelope: EnvelopePoint[];
  combinedWeightLimits: CombinedWeightLimit[];

  cruise: readonly CruiseAltitudeBlock[];
  rpmPresets: RpmPreset[];
  targetPowerPresets: TargetPowerPreset[];
  takeoff: readonly FieldWeightBlock[];
  landing: readonly FieldWeightBlock[];

  performanceDataSource: DataSource;
  weightBalanceDataSource: DataSource;
  /** POH document number, once the data comes from a real book. */
  pohDocumentNumber?: string;
  /** Shown on the Aircraft screen to explain where the numbers came from. */
  sourceNote: string;
}
