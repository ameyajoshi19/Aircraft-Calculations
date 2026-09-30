/**
 * The aircraft the app can compute for.
 *
 * Both aircraft now run on their own POH: the 182T on 182TPHBUS-00 and the
 * 172S on 172SPHBUS-00.
 *
 * Imports here are relative and carry their .ts extension, like the POH data
 * files, so `scripts/check-cruise.ts` can load this module under plain Node
 * and check the profiles against their own books.
 */
import {
  C162_BAGGAGE_LIMITS,
  C162_FIELD_CORRECTIONS,
  C162_STATIONS,
  C162_USABLE_FUEL_ARM_IN,
  C162_USABLE_FUEL_GAL,
  c162PohBase,
} from './poh/c162.ts';
import { c162Cruise } from './poh/c162-cruise.ts';
import {
  C172S_BAGGAGE_LIMITS,
  C172S_FIELD_CORRECTIONS,
  C172S_STATIONS,
  C172S_USABLE_FUEL_ARM_IN,
  C172S_USABLE_FUEL_GAL,
  c172sPohBase,
} from './poh/c172s.ts';
import { c172sCruise } from './poh/c172s-cruise.ts';
import {
  C182T_BAGGAGE_LIMITS,
  C182T_FIELD_CORRECTIONS,
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

/**
 * RPMs the cruise dropdown offers for the 172S, covering the span its sheets
 * publish (2100 low down, up to 2700 at altitude). Pinning one here overrides
 * the solver's own choice.
 */
const RPM_PRESETS_172S = [
  { rpm: 2100 },
  { rpm: 2200 },
  { rpm: 2300, label: 'Economy' },
  { rpm: 2400 },
  { rpm: 2500, label: 'Balanced' },
  { rpm: 2600 },
  { rpm: 2650, label: 'Performance' },
  { rpm: 2700 },
];

/** Labels the cruise RPM dropdown shows beside each 182T setting. */
const RPM_PRESETS_182T = [
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
  rpmPresets: RPM_PRESETS_182T,
  targetPowerPresets: C182T_TARGET_POWER_PRESETS,
  takeoff: c182tPohBase.takeoff,
  landing: c182tPohBase.landing,
  fieldCorrections: C182T_FIELD_CORRECTIONS,

  performanceDataSource: 'poh',
  weightBalanceDataSource: 'poh',
  pohDocumentNumber: c182tPohBase.documentNumber,
  sourceNote:
    'Performance and W&B limits transcribed from POH 182TPHBUS-00. Empty weight is the ' +
    "book's standard figure — replace it with this airframe's weighing record before flight planning.",
};

/**
 * Three cruise modes for the 172S. Section 4 puts normal cruise between 55%
 * and 75% of rated MCP, and 75% is also the table's own ceiling.
 *
 * The RPMs here are never used: on a fixed-pitch aircraft there is one control,
 * so the solver works the RPM out from the target power rather than taking it
 * from a preset. They are recorded as the RPM each mode lands near at a typical
 * cruise altitude, so the shape stays shared with the 182T.
 */
const C172S_TARGET_POWER_PRESETS = [
  { percentPower: 55, rpm: 2300, label: 'Economy' },
  { percentPower: 65, rpm: 2500, label: 'Balanced' },
  { percentPower: 75, rpm: 2650, label: 'Performance' },
];

const cessna172sp: AircraftProfile = {
  id: 'c172sp-g1000',
  tailNumber: 'N234FF',
  shortName: 'C172SP',
  model: 'Cessna 172S NAV III / GFC 700 (Skyhawk)',

  // Section 1 page 1-3: Textron Lycoming IO-360-L2A, 180 BHP at 2700 RPM,
  // fixed-pitch propeller.
  engineHp: 180,
  maxSpeedKts: 126,
  serviceCeilingFt: 14000,

  // Section 1 page 1-8. This is the book's STANDARD empty weight; N234FF's
  // actual weighing record will differ and should replace it.
  emptyWeightLbs: c172sPohBase.standardEmptyWeightLbs,
  // Arm implied by the sample loading problem on page 6-9 (1642 lb at a moment
  // of 62.6 thousand lb-in). Replace it along with the empty weight above.
  emptyWeightArm: 38.1,
  maxGrossWeightLbs: c172sPohBase.maxTakeoffWeightLbs,
  maxLandingWeightLbs: c172sPohBase.maxLandingWeightLbs,
  usableFuelGal: C172S_USABLE_FUEL_GAL.standard,
  fuelLbsPerGal: 6,
  fuelArm: C172S_USABLE_FUEL_ARM_IN,

  stations: C172S_STATIONS.standardSeating.map((s) => ({
    id: s.id,
    label: s.label,
    arm: s.armIn,
    maxWeight: 'maxWeightLbs' in s ? s.maxWeightLbs : undefined,
  })),
  envelope: c172sPohBase.cgEnvelope.map((p) => ({
    weight: p.weightLbs,
    forwardArm: p.forwardArmIn,
    aftArm: p.aftArmIn,
  })),
  combinedWeightLimits: C172S_BAGGAGE_LIMITS.combined.map((c) => ({
    stationIds: [...c.areaIds],
    maxWeightLbs: c.maxWeightLbs,
    label: c.areaIds.map((id) => id.replace('baggage-', '').toUpperCase()).join(' + '),
  })),

  cruise: c172sCruise,
  rpmPresets: RPM_PRESETS_172S,
  targetPowerPresets: C172S_TARGET_POWER_PRESETS,
  takeoff: c172sPohBase.takeoff,
  landing: c172sPohBase.landing,
  fieldCorrections: C172S_FIELD_CORRECTIONS,

  performanceDataSource: 'poh',
  weightBalanceDataSource: 'poh',
  pohDocumentNumber: c172sPohBase.documentNumber,
  sourceNote:
    'Performance and W&B limits from POH 172SPHBUS-00, NORMAL category only — the ' +
    "book's utility-category limits are not modelled. Empty weight is the book's " +
    'standard figure; replace it with this airframe\'s weighing record before flight planning.',
};

/**
 * The 162 publishes only three RPM settings per altitude, and which three
 * changes above 8000 ft, so this list spans the whole range the sheets cover.
 */
const RPM_PRESETS_162 = [
  { rpm: 2150 },
  { rpm: 2250, label: 'Economy' },
  { rpm: 2350 },
  { rpm: 2450 },
  { rpm: 2550, label: 'Balanced' },
  { rpm: 2650 },
  { rpm: 2750, label: 'Performance' },
];

/**
 * The 162's table bottoms out around 36% power, so its Economy setting sits
 * well below the 55% that counts as low cruise on the bigger Cessnas. 75% is
 * the sheet's own cap.
 */
const C162_TARGET_POWER_PRESETS = [
  { percentPower: 45, rpm: 2250, label: 'Economy' },
  { percentPower: 60, rpm: 2550, label: 'Balanced' },
  { percentPower: 75, rpm: 2750, label: 'Performance' },
];

const cessna162: AircraftProfile = {
  id: 'c162-g300',
  shortName: 'C162',
  model: 'Cessna 162 Skycatcher / Garmin G300',

  // Section 1 page 1-3: Teledyne Continental O-200D, 100 BHP at 2750 RPM,
  // fixed-pitch propeller.
  engineHp: 100,
  maxSpeedKts: 118,
  serviceCeilingFt: 14625,

  emptyWeightLbs: c162PohBase.standardEmptyWeightLbs,
  // Implied by the sample loading problem on page 6-13: 834 lb at a moment of
  // 110.1 thousand lb-in gives 132.0 in. Replace it together with the empty
  // weight when a weighing record is available.
  emptyWeightArm: 132.0,
  maxGrossWeightLbs: c162PohBase.maxTakeoffWeightLbs,
  maxLandingWeightLbs: c162PohBase.maxLandingWeightLbs,
  usableFuelGal: C162_USABLE_FUEL_GAL.standard,
  fuelLbsPerGal: 6,
  fuelArm: C162_USABLE_FUEL_ARM_IN,

  stations: C162_STATIONS.standardSeating.map((s) => ({
    id: s.id,
    label: s.label,
    arm: s.armIn,
    maxWeight: 'maxWeightLbs' in s ? s.maxWeightLbs : undefined,
  })),
  envelope: c162PohBase.cgEnvelope.map((p) => ({
    weight: p.weightLbs,
    forwardArm: p.forwardArmIn,
    aftArm: p.aftArmIn,
  })),
  // One baggage area, so the book states no combined limit.
  combinedWeightLimits: [],

  cruise: c162Cruise,
  rpmPresets: RPM_PRESETS_162,
  targetPowerPresets: C162_TARGET_POWER_PRESETS,
  takeoff: c162PohBase.takeoff,
  landing: c162PohBase.landing,
  fieldCorrections: C162_FIELD_CORRECTIONS,

  performanceDataSource: 'poh',
  weightBalanceDataSource: 'poh',
  pohDocumentNumber: c162PohBase.documentNumber,
  sourceNote:
    'Performance and W&B limits from POH 162PHUS-04. The Section 5 tables are scanned ' +
    'images in that book, so they were read by eye rather than extracted — read twice ' +
    "and consistency-checked. Empty weight is the book's standard figure; replace it " +
    "with this airframe's weighing record before flight planning.",
};

export const aircraftProfiles: AircraftProfile[] = [cessna182t, cessna172sp, cessna162];

export const defaultAircraftProfileId = cessna182t.id;
