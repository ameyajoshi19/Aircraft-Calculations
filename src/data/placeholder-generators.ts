/**
 * These generators exist for exactly one reason: to give the app *something*
 * interpolatable to demo the calculators with before real POH tables are
 * transcribed. Every number they produce is synthetic — smooth curves shaped
 * to look like a plausible normally-aspirated single, nothing more. Nothing
 * here should ever be read as, or replace, actual POH performance data.
 * Delete this file's callers once real `CruiseDataPoint[]` /
 * `FieldPerformanceDataPoint[]` tables are transcribed from the aircraft's
 * POH Section 5.
 */
import type { CruiseDataPoint, FieldPerformanceDataPoint } from '@/types/aircraft';

export interface CruiseTableSeed {
  altitudesFt: number[];
  isaDeviationsC: number[];
  /** percentPower -> { rpm, manifoldPressureInHg, ktas, fuelFlowGph } at sea level, standard day. */
  powerBaselines: Record<number, { rpm: number; manifoldPressureInHg: number; ktas: number; fuelFlowGph: number }>;
}

export function generatePlaceholderCruiseTable(seed: CruiseTableSeed): CruiseDataPoint[] {
  const points: CruiseDataPoint[] = [];
  for (const percentPower of Object.keys(seed.powerBaselines).map(Number)) {
    const base = seed.powerBaselines[percentPower];
    for (const pressureAltitudeFt of seed.altitudesFt) {
      // Normally-aspirated engines need less manifold pressure at altitude to
      // hold a given %power (ambient pressure is already lower); true
      // airspeed rises with altitude at a fixed %power/IAS.
      const altitudeFactor = pressureAltitudeFt / 1000;
      const manifoldPressureInHg = Math.max(base.manifoldPressureInHg - altitudeFactor * 0.25, 15);
      const ktasAtAltitude = base.ktas + altitudeFactor * 1.6;

      for (const isaDeviationC of seed.isaDeviationsC) {
        // Warmer-than-standard air is less dense: modest TAS gain, modest fuel-flow loss.
        const tempFactor = isaDeviationC / 20;
        points.push({
          pressureAltitudeFt,
          isaDeviationC,
          percentPower,
          rpm: base.rpm,
          manifoldPressureInHg: Math.round(manifoldPressureInHg * 10) / 10,
          ktas: Math.round(ktasAtAltitude + tempFactor * 1.5),
          fuelFlowGph: Math.round((base.fuelFlowGph - tempFactor * 0.2) * 10) / 10,
        });
      }
    }
  }
  return points;
}

export interface FieldTableSeed {
  altitudesFt: number[];
  isaDeviationsC: number[];
  weightsLbs: number[];
  /** At the lightest listed weight, sea level, standard day. */
  baseGroundRollFt: number;
  baseDistanceOver50ftFt: number;
}

export function generatePlaceholderFieldTable(seed: FieldTableSeed): FieldPerformanceDataPoint[] {
  const points: FieldPerformanceDataPoint[] = [];
  const lightestWeight = Math.min(...seed.weightsLbs);

  for (const weightLbs of seed.weightsLbs) {
    const weightFactor = weightLbs / lightestWeight;
    for (const pressureAltitudeFt of seed.altitudesFt) {
      const altitudeFactor = 1 + pressureAltitudeFt / 10000;
      for (const isaDeviationC of seed.isaDeviationsC) {
        const tempFactor = 1 + Math.max(isaDeviationC, 0) / 100;
        const combined = weightFactor * altitudeFactor * tempFactor;
        points.push({
          pressureAltitudeFt,
          isaDeviationC,
          weightLbs,
          groundRollFt: Math.round(seed.baseGroundRollFt * combined),
          distanceOver50ftFt: Math.round(seed.baseDistanceOver50ftFt * combined),
        });
      }
    }
  }
  return points;
}
