/**
 * The aircraft the app can compute for.
 *
 * The 182T runs on the transcribed POH (document 182TPHBUS-00). The 172S is
 * still on synthetic stand-in data and is flagged as such everywhere it
 * appears, until its book is transcribed too.
 *
 * Imports here are relative and carry their .ts extension, like the POH data
 * files, so `scripts/check-cruise.ts` can load this module under plain Node
 * and check the profiles against their own books.
 */
import { generatePlaceholderCruise, generatePlaceholderField } from './placeholder-generators.ts';
import {
  C182T_BAGGAGE_LIMITS,
  C182T_STATIONS,
  C182T_USABLE_FUEL_ARM_IN,
  C182T_USABLE_FUEL_GAL,
  c182tPohBase,
} from './poh/c182t.ts';
import { c182tCruise } from './poh/c182t-cruise.ts';
import type { AircraftProfile } from '../types/aircraft.ts';

/**
 * The three cruise modes. Section 4 puts normal cruise between 55% and 80%
 * of rated MCP; these sit in the usual part of that band, each paired with
 * the RPM it is flown at.
 */
const C182T_TARGET_POWER_PRESETS = [
  { percentPower: 65, rpm: 2000, label: 'Economy' },
  { percentPower: 70, rpm: 2200, label: 'Balanced' },
  { percentPower: 75, rpm: 2400, label: 'Performance' },
];

/** Labels the cruise RPM dropdown shows beside each setting. */
const RPM_PRESETS = [
  { rpm: 2000, label: 'Economy' },
  { rpm: 2100 },
  { rpm: 2200, label: 'Balanced' },
  { rpm: 2300 },
  { rpm: 2400, label: 'Performance' },
];

const cessna182t: AircraftProfile = {
  id: 'c182t-g1000',
  tailNumber: 'N32LP',
  shortName: 'C182T',
  model: 'Cessna 182T G1000 (Skylane)',

  engineHp: 230,
  maxSpeedKts: 145,
  serviceCeilingFt: 18100,

  // Section 1 page 1-8. This is the *standard* empty weight from the book;
  // N32LP's actual weighing record will differ and should replace it.
  emptyWeightLbs: c182tPohBase.standardEmptyWeightLbs,
  emptyWeightArm: 39.0,
  maxGrossWeightLbs: c182tPohBase.maxTakeoffWeightLbs,
  maxLandingWeightLbs: c182tPohBase.maxLandingWeightLbs,
  usableFuelGal: C182T_USABLE_FUEL_GAL.standard,
  fuelLbsPerGal: 6,
  fuelArm: C182T_USABLE_FUEL_ARM_IN,

  stations: C182T_STATIONS.standardSeating.map((s) => ({
    id: s.id,
    label: s.label,
    arm: s.armIn,
    maxWeight: 'maxWeightLbs' in s ? s.maxWeightLbs : undefined,
  })),
  envelope: c182tPohBase.cgEnvelope.map((p) => ({
    weight: p.weightLbs,
    forwardArm: p.forwardArmIn,
    aftArm: p.aftArmIn,
  })),
  combinedWeightLimits: C182T_BAGGAGE_LIMITS.combined.map((c) => ({
    stationIds: [...c.areaIds],
    maxWeightLbs: c.maxWeightLbs,
    label: c.areaIds.map((id) => id.replace('baggage-', '').toUpperCase()).join(' + '),
  })),

  cruise: c182tCruise,
  rpmPresets: RPM_PRESETS,
  targetPowerPresets: C182T_TARGET_POWER_PRESETS,
  takeoff: c182tPohBase.takeoff,
  landing: c182tPohBase.landing,

  performanceDataSource: 'poh',
  weightBalanceDataSource: 'poh',
  pohDocumentNumber: c182tPohBase.documentNumber,
  sourceNote:
    'Performance and W&B limits transcribed from POH 182TPHBUS-00. Empty weight is the ' +
    "book's standard figure — replace it with this airframe's weighing record before flight planning.",
};

const cessna172sp: AircraftProfile = {
  id: 'c172sp-g1000',
  tailNumber: 'N234FF',
  shortName: 'C172SP',
  model: 'Cessna 172SP G1000 (Skyhawk)',

  engineHp: 180,
  maxSpeedKts: 125,
  serviceCeilingFt: 14000,

  emptyWeightLbs: 1680,
  emptyWeightArm: 39.0,
  maxGrossWeightLbs: 2550,
  maxLandingWeightLbs: 2550,
  usableFuelGal: 53,
  fuelLbsPerGal: 6,
  fuelArm: 46.5,

  stations: [
    { id: 'front-seats', label: 'Pilot & Front Passenger', arm: 37.0 },
    { id: 'rear-seats', label: 'Rear Passengers', arm: 73.0 },
    { id: 'baggage-a', label: 'Baggage Area 1', arm: 95.0, maxWeight: 120 },
    { id: 'baggage-b', label: 'Baggage Area 2', arm: 123.0, maxWeight: 50 },
  ],
  envelope: [
    { weight: 1680, forwardArm: 35.0, aftArm: 40.5 },
    { weight: 2000, forwardArm: 35.6, aftArm: 40.8 },
    { weight: 2550, forwardArm: 37.5, aftArm: 41.0 },
  ],
  combinedWeightLimits: [],

  // Fixed-pitch propeller: no manifold pressure, so the placeholder table has
  // no MP column either. Max cruise is 75% MCP, per the note on Figure 5-8.
  cruise: generatePlaceholderCruise({
    altitudesFt: [2000, 4000, 6000, 8000, 10000, 12000],
    rpms: [2100, 2200, 2300, 2400, 2500, 2600],
    basePercentPower: 45,
    baseKtas: 90,
    baseGph: 6.0,
    maxCruisePercentPower: 75,
    percentPowerLabel: 'MCP',
  }),
  rpmPresets: [
    { rpm: 2100, label: 'Economy' },
    { rpm: 2200 },
    { rpm: 2300, label: 'Balanced' },
    { rpm: 2400 },
    { rpm: 2500 },
    { rpm: 2600, label: 'Performance' },
  ],
  // On a fixed-pitch aircraft the RPM is the answer, not a second choice, so
  // these RPMs are never used — they are here only to satisfy the shared
  // shape, and the solver works the RPM out from the target power.
  targetPowerPresets: [
    { percentPower: 55, rpm: 2200, label: 'Economy' },
    { percentPower: 65, rpm: 2400, label: 'Balanced' },
    { percentPower: 75, rpm: 2600, label: 'Performance' },
  ],
  takeoff: generatePlaceholderField({
    weightsLbs: [2200, 2550],
    altitudesFt: [0, 2000, 4000, 6000, 8000],
    oatsC: [0, 10, 20, 30, 40],
    baseGroundRollFt: 860,
    baseOver50ftFt: 1500,
  }),
  landing: generatePlaceholderField({
    weightsLbs: [2550],
    altitudesFt: [0, 2000, 4000, 6000, 8000],
    oatsC: [0, 10, 20, 30, 40],
    baseGroundRollFt: 600,
    baseOver50ftFt: 1350,
  }),

  performanceDataSource: 'placeholder',
  weightBalanceDataSource: 'placeholder',
  sourceNote:
    'Engine, fuel and speed figures come from the N234FF rental sheet. All performance ' +
    'tables and W&B arms are synthetic placeholders — transcribe the 172S POH to replace them.',
};

export const aircraftProfiles: AircraftProfile[] = [cessna182t, cessna172sp];

export const defaultAircraftProfileId = cessna182t.id;
