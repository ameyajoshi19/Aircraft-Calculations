/**
 * Data model for an aircraft's POH-derived performance and weight & balance
 * figures. `dataSource: 'placeholder'` marks tables that hold demo values
 * only (not from a real POH) so the UI can warn the pilot not to rely on them.
 */

export type DataSource = 'placeholder' | 'poh';

export interface WeightBalanceStation {
  id: string;
  label: string;
  /** Arm, inches aft of datum. */
  arm: number;
  /** Optional per-station weight limit (e.g. baggage compartment max). */
  maxWeight?: number;
}

/** One row of a CG envelope: at this weight, CG must fall within [forwardArm, aftArm]. */
export interface EnvelopePoint {
  weight: number;
  forwardArm: number;
  aftArm: number;
}

/** One sampled point from a POH cruise performance table. */
export interface CruiseDataPoint {
  pressureAltitudeFt: number;
  /** Degrees C relative to ISA standard temperature at this altitude. */
  isaDeviationC: number;
  percentPower: number;
  rpm: number;
  manifoldPressureInHg: number;
  ktas: number;
  fuelFlowGph: number;
}

/** One sampled point from a POH takeoff or landing distance table. */
export interface FieldPerformanceDataPoint {
  pressureAltitudeFt: number;
  isaDeviationC: number;
  weightLbs: number;
  groundRollFt: number;
  distanceOver50ftFt: number;
}

export interface AircraftProfile {
  id: string;
  tailNumber?: string;
  displayName: string;
  model: string;

  engineHp: number;
  maxSpeedKts: number;
  serviceCeilingFt: number;

  emptyWeightLbs: number;
  emptyWeightArm: number;
  maxGrossWeightLbs: number;
  usableFuelGal: number;
  fuelLbsPerGal: number;
  fuelArm: number;

  stations: WeightBalanceStation[];
  envelope: EnvelopePoint[];

  /** Discrete %power settings the cruise UI lets the pilot pick between. */
  availablePowerSettings: number[];
  cruiseTable: CruiseDataPoint[];
  takeoffTable: FieldPerformanceDataPoint[];
  landingTable: FieldPerformanceDataPoint[];

  performanceDataSource: DataSource;
  weightBalanceDataSource: DataSource;
  /** Free-text note shown in the Aircraft screen, e.g. POH revision date once real data lands. */
  sourceNote: string;
}
