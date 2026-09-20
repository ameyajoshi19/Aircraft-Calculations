import { interpolate1D, interpolate2D } from '@/lib/interpolation';
import type { AircraftProfile, FieldPerformanceDataPoint } from '@/types/aircraft';

const ISA_SEA_LEVEL_C = 15;
/** Standard atmosphere lapse rate, °C per 1000 ft (ISA approximation used throughout POH tables). */
const ISA_LAPSE_RATE_C_PER_1000FT = 1.98;

/** Standard ISA temperature (°C) at a given pressure altitude. */
export function isaTemperatureC(pressureAltitudeFt: number): number {
  return ISA_SEA_LEVEL_C - (pressureAltitudeFt / 1000) * ISA_LAPSE_RATE_C_PER_1000FT;
}

/** ISA deviation (°C) implied by an outside air temperature at a given pressure altitude. */
export function isaDeviationFromOat(pressureAltitudeFt: number, outsideAirTempC: number): number {
  return outsideAirTempC - isaTemperatureC(pressureAltitudeFt);
}

export interface CruiseResult {
  rpm: number;
  manifoldPressureInHg: number;
  percentMcp: number;
  ktas: number;
  fuelFlowGph: number;
}

/**
 * Looks up cruise performance for a chosen %power setting by interpolating
 * the profile's cruise table across pressure altitude and ISA deviation.
 * %power itself is NOT interpolated — like a real POH, it's read from a
 * matching discrete column (see `AircraftProfile.availablePowerSettings`).
 */
export function lookupCruisePerformance(
  profile: AircraftProfile,
  pressureAltitudeFt: number,
  isaDeviationC: number,
  percentPower: number
): CruiseResult | null {
  const rows = profile.cruiseTable.filter((p) => p.percentPower === percentPower);
  if (rows.length === 0) return null;

  const toGrid = (value: (p: (typeof rows)[number]) => number) =>
    rows.map((p) => ({
      gridX: p.pressureAltitudeFt,
      gridY: p.isaDeviationC,
      value: value(p),
    }));

  const rpm = interpolate2D(pressureAltitudeFt, isaDeviationC, toGrid((p) => p.rpm));
  const manifoldPressureInHg = interpolate2D(
    pressureAltitudeFt,
    isaDeviationC,
    toGrid((p) => p.manifoldPressureInHg)
  );
  const ktas = interpolate2D(pressureAltitudeFt, isaDeviationC, toGrid((p) => p.ktas));
  const fuelFlowGph = interpolate2D(pressureAltitudeFt, isaDeviationC, toGrid((p) => p.fuelFlowGph));
  const maxPower = Math.max(...profile.availablePowerSettings);

  return {
    rpm: Math.round(rpm),
    manifoldPressureInHg: Math.round(manifoldPressureInHg * 10) / 10,
    percentMcp: Math.round((percentPower / maxPower) * 100),
    ktas: Math.round(ktas),
    fuelFlowGph: Math.round(fuelFlowGph * 10) / 10,
  };
}

export interface FuelPlan {
  fuelFlowGph: number;
  usableFuelGal: number;
  reserveMinutes: number;
  totalEnduranceHours: number;
  reserveGal: number;
  flightFuelGal: number;
  flightEnduranceHours: number;
  rangeNm: number;
}

export function computeFuelPlan(
  usableFuelGal: number,
  fuelFlowGph: number,
  ktas: number,
  reserveMinutes: number
): FuelPlan {
  const totalEnduranceHours = fuelFlowGph > 0 ? usableFuelGal / fuelFlowGph : 0;
  const reserveGal = (reserveMinutes / 60) * fuelFlowGph;
  const flightFuelGal = Math.max(usableFuelGal - reserveGal, 0);
  const flightEnduranceHours = fuelFlowGph > 0 ? flightFuelGal / fuelFlowGph : 0;
  const rangeNm = flightEnduranceHours * ktas;

  return {
    fuelFlowGph,
    usableFuelGal,
    reserveMinutes,
    totalEnduranceHours,
    reserveGal,
    flightFuelGal,
    flightEnduranceHours,
    rangeNm,
  };
}

export interface WeightBalanceResult {
  totalWeightLbs: number;
  totalMoment: number;
  cgInches: number;
  withinGrossWeight: boolean;
  forwardLimitInches: number;
  aftLimitInches: number;
  withinEnvelope: boolean;
}

export function computeWeightAndBalance(
  profile: AircraftProfile,
  stationWeights: Record<string, number>,
  fuelGal: number
): WeightBalanceResult {
  let totalWeightLbs = profile.emptyWeightLbs;
  let totalMoment = profile.emptyWeightLbs * profile.emptyWeightArm;

  for (const station of profile.stations) {
    const weight = stationWeights[station.id] ?? 0;
    totalWeightLbs += weight;
    totalMoment += weight * station.arm;
  }

  const fuelWeight = fuelGal * profile.fuelLbsPerGal;
  totalWeightLbs += fuelWeight;
  totalMoment += fuelWeight * profile.fuelArm;

  const cgInches = totalWeightLbs > 0 ? totalMoment / totalWeightLbs : profile.emptyWeightArm;

  const envelope = [...profile.envelope].sort((a, b) => a.weight - b.weight);
  const forwardLimitInches = interpolate1D(
    totalWeightLbs,
    envelope.map((e) => ({ x: e.weight, y: e.forwardArm }))
  );
  const aftLimitInches = interpolate1D(
    totalWeightLbs,
    envelope.map((e) => ({ x: e.weight, y: e.aftArm }))
  );

  return {
    totalWeightLbs: Math.round(totalWeightLbs),
    totalMoment: Math.round(totalMoment),
    cgInches: Math.round(cgInches * 100) / 100,
    withinGrossWeight: totalWeightLbs <= profile.maxGrossWeightLbs,
    forwardLimitInches: Math.round(forwardLimitInches * 100) / 100,
    aftLimitInches: Math.round(aftLimitInches * 100) / 100,
    withinEnvelope: cgInches >= forwardLimitInches && cgInches <= aftLimitInches,
  };
}

export interface FieldPerformanceResult {
  groundRollFt: number;
  distanceOver50ftFt: number;
}

/**
 * Interpolates ground roll / 50ft-obstacle distance across pressure
 * altitude and ISA deviation for a fixed weight bracket (nearest table
 * weight), then applies the standard Cessna-style headwind/tailwind note:
 * roughly -10% distance per 9 kt headwind, +10% per 2 kt tailwind.
 * The exact percentages are a POH-specific note — verify against the real
 * POH once uploaded.
 */
export function lookupFieldPerformance(
  table: FieldPerformanceDataPoint[],
  pressureAltitudeFt: number,
  isaDeviationC: number,
  weightLbs: number,
  windComponentKts: number
): FieldPerformanceResult | null {
  if (table.length === 0) return null;

  const weights = [...new Set(table.map((p) => p.weightLbs))].sort((a, b) => a - b);
  const nearestWeight = weights.reduce((closest, w) =>
    Math.abs(w - weightLbs) < Math.abs(closest - weightLbs) ? w : closest
  );
  const rows = table.filter((p) => p.weightLbs === nearestWeight);

  const toGrid = (value: (p: FieldPerformanceDataPoint) => number) =>
    rows.map((p) => ({
      gridX: p.pressureAltitudeFt,
      gridY: p.isaDeviationC,
      value: value(p),
    }));

  let groundRollFt = interpolate2D(pressureAltitudeFt, isaDeviationC, toGrid((p) => p.groundRollFt));
  let distanceOver50ftFt = interpolate2D(
    pressureAltitudeFt,
    isaDeviationC,
    toGrid((p) => p.distanceOver50ftFt)
  );

  const windFactor =
    windComponentKts >= 0
      ? 1 - (windComponentKts / 9) * 0.1
      : 1 + (Math.abs(windComponentKts) / 2) * 0.1;

  groundRollFt *= windFactor;
  distanceOver50ftFt *= windFactor;

  return {
    groundRollFt: Math.round(groundRollFt),
    distanceOver50ftFt: Math.round(distanceOver50ftFt),
  };
}
