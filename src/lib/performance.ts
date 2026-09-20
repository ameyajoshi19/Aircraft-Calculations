import { interpolate1D } from '@/lib/interpolation';
import type { FieldWeightBlock } from '@/data/poh/types';
import type { AircraftProfile } from '@/types/aircraft';

const ISA_SEA_LEVEL_C = 15;
/** Standard atmosphere lapse rate, °C per 1000 ft. */
const ISA_LAPSE_RATE_C_PER_1000FT = 1.98;

/** Standard ISA temperature (°C) at a given pressure altitude. */
export function isaTemperatureC(pressureAltitudeFt: number): number {
  return ISA_SEA_LEVEL_C - (pressureAltitudeFt / 1000) * ISA_LAPSE_RATE_C_PER_1000FT;
}

/** The outside air temperature implied by a deviation from ISA. */
export function oatForIsaDeviation(pressureAltitudeFt: number, deviationC: number): number {
  return isaTemperatureC(pressureAltitudeFt) + deviationC;
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

  return {
    fuelFlowGph,
    usableFuelGal,
    reserveMinutes,
    totalEnduranceHours,
    reserveGal,
    flightFuelGal,
    flightEnduranceHours,
    rangeNm: flightEnduranceHours * ktas,
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
  /** Combined station limits that the current load exceeds. */
  exceededCombinedLimits: { label: string; maxWeightLbs: number; actualLbs: number }[];
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

  const exceededCombinedLimits = profile.combinedWeightLimits
    .map((limit) => ({
      label: limit.label,
      maxWeightLbs: limit.maxWeightLbs,
      actualLbs: limit.stationIds.reduce((sum, id) => sum + (stationWeights[id] ?? 0), 0),
    }))
    .filter((l) => l.actualLbs > l.maxWeightLbs);

  return {
    totalWeightLbs: Math.round(totalWeightLbs),
    totalMoment: Math.round(totalMoment),
    cgInches: Math.round(cgInches * 100) / 100,
    withinGrossWeight: totalWeightLbs <= profile.maxGrossWeightLbs,
    forwardLimitInches: Math.round(forwardLimitInches * 100) / 100,
    aftLimitInches: Math.round(aftLimitInches * 100) / 100,
    withinEnvelope: cgInches >= forwardLimitInches && cgInches <= aftLimitInches,
    exceededCombinedLimits,
  };
}

export interface FieldPerformanceResult {
  groundRollFt: number;
  distanceOver50ftFt: number;
  /** True when the conditions fall outside the weights the table publishes. */
  weightOutsideTable: boolean;
  tableWeightLbs: number;
}

/**
 * Reads a takeoff or landing table at a given weight, pressure altitude,
 * outside air temperature and wind component.
 *
 * Note these tables are indexed by ACTUAL OAT (the POH prints 0/10/20/30/40
 * °C columns), unlike the cruise tables which use ISA-relative columns.
 *
 * The wind correction is the note printed beneath the table: distances
 * decrease 10% per 9 knots of headwind, and increase 10% per 2 knots of
 * tailwind. Cells the POH leaves blank — where climb performance after
 * lift-off is below 150 fpm — yield no result rather than an extrapolation.
 */
export function lookupFieldPerformance(
  blocks: readonly FieldWeightBlock[],
  options: {
    pressureAltitudeFt: number;
    oatC: number;
    weightLbs: number;
    windComponentKts: number;
  }
): FieldPerformanceResult | null {
  if (blocks.length === 0) return null;

  const weights = blocks.map((b) => b.weightLbs).sort((a, b) => a - b);
  const bracketed = Math.min(Math.max(options.weightLbs, weights[0]), weights[weights.length - 1]);

  // Interpolate between the two bracketing weight tables.
  let lowerBlock = blocks[0];
  let upperBlock = blocks[0];
  const sortedBlocks = [...blocks].sort((a, b) => a.weightLbs - b.weightLbs);
  lowerBlock = sortedBlocks[0];
  upperBlock = sortedBlocks[sortedBlocks.length - 1];
  for (let i = 0; i < sortedBlocks.length - 1; i++) {
    if (bracketed >= sortedBlocks[i].weightLbs && bracketed <= sortedBlocks[i + 1].weightLbs) {
      lowerBlock = sortedBlocks[i];
      upperBlock = sortedBlocks[i + 1];
      break;
    }
  }

  const atBlock = (block: FieldWeightBlock) => {
    const oats = Object.keys(block.byOatC).map(Number).sort((a, b) => a - b);
    if (oats.length === 0) return null;

    const readColumn = (oat: number, field: 1 | 2): number | null => {
      const rows = block.byOatC[oat];
      const usable = rows
        .filter((r) => r[field] !== null)
        .map((r) => ({ x: r[0], y: r[field] as number }));
      if (usable.length === 0) return null;
      // Beyond the charted altitudes the POH stops: clamping is the honest read.
      if (options.pressureAltitudeFt > Math.max(...usable.map((u) => u.x))) return null;
      return interpolate1D(options.pressureAltitudeFt, usable);
    };

    const oat = Math.min(Math.max(options.oatC, oats[0]), oats[oats.length - 1]);
    let lo = oats[0];
    let hi = oats[oats.length - 1];
    for (let i = 0; i < oats.length - 1; i++) {
      if (oat >= oats[i] && oat <= oats[i + 1]) {
        lo = oats[i];
        hi = oats[i + 1];
        break;
      }
    }

    const blend = (field: 1 | 2): number | null => {
      const a = readColumn(lo, field);
      const b = readColumn(hi, field);
      if (a === null || b === null) return null;
      if (hi === lo) return a;
      return a + ((oat - lo) / (hi - lo)) * (b - a);
    };

    const roll = blend(1);
    const obstacle = blend(2);
    return roll === null || obstacle === null ? null : { roll, obstacle };
  };

  const low = atBlock(lowerBlock);
  const high = atBlock(upperBlock);
  if (!low || !high) return null;

  const span = upperBlock.weightLbs - lowerBlock.weightLbs;
  const t = span === 0 ? 0 : (bracketed - lowerBlock.weightLbs) / span;
  const windFactor =
    options.windComponentKts >= 0
      ? 1 - (options.windComponentKts / 9) * 0.1
      : 1 + (Math.abs(options.windComponentKts) / 2) * 0.1;

  return {
    groundRollFt: Math.round((low.roll + t * (high.roll - low.roll)) * windFactor),
    distanceOver50ftFt: Math.round((low.obstacle + t * (high.obstacle - low.obstacle)) * windFactor),
    weightOutsideTable: options.weightLbs > weights[weights.length - 1] || options.weightLbs < weights[0],
    tableWeightLbs: bracketed,
  };
}
