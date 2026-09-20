/**
 * Aircraft profiles used by the calculators.
 *
 * `engineHp`, `maxSpeedKts`, `usableFuelGal`, and `serviceCeilingFt` come
 * from the rental spec sheets the user uploaded for N234FF (172SP) and
 * N32LP (182T) — real numbers for those two airframes, but only a summary
 * sheet, not the POH itself.
 *
 * Everything else — cruise/takeoff/landing tables, W&B stations, arms, and
 * the CG envelope — is synthetic placeholder data (see
 * `placeholder-generators.ts`) standing in until the real POH Section 5
 * (Performance) and Section 6 (Weight & Balance) are transcribed. Do not
 * use this app for actual flight planning until `dataSource` reads 'poh'.
 */
import {
  generatePlaceholderCruiseTable,
  generatePlaceholderFieldTable,
} from '@/data/placeholder-generators';
import type { AircraftProfile } from '@/types/aircraft';

const cessna172sp: AircraftProfile = {
  id: 'c172sp-g1000',
  tailNumber: 'N234FF',
  displayName: 'C172SP Cruise Advisor',
  model: 'Cessna 172SP G1000 (Skyhawk)',

  engineHp: 180,
  maxSpeedKts: 125,
  serviceCeilingFt: 14000,

  emptyWeightLbs: 1680,
  emptyWeightArm: 41.0,
  maxGrossWeightLbs: 2550,
  usableFuelGal: 53,
  fuelLbsPerGal: 6,
  fuelArm: 48.0,

  stations: [
    { id: 'front-seats', label: 'Front Seats (Pilot + Pax)', arm: 37.0 },
    { id: 'rear-seats', label: 'Rear Seats', arm: 73.0 },
    { id: 'baggage-1', label: 'Baggage Area 1', arm: 95.0, maxWeight: 120 },
    { id: 'baggage-2', label: 'Baggage Area 2', arm: 123.0, maxWeight: 50 },
  ],
  envelope: [
    { weight: 1680, forwardArm: 35.0, aftArm: 40.5 },
    { weight: 2000, forwardArm: 35.6, aftArm: 40.8 },
    { weight: 2550, forwardArm: 37.5, aftArm: 41.0 },
  ],

  availablePowerSettings: [65, 70, 75],
  cruiseTable: generatePlaceholderCruiseTable({
    altitudesFt: [2000, 6000, 10000],
    isaDeviationsC: [-20, 0, 20],
    powerBaselines: {
      65: { rpm: 2250, manifoldPressureInHg: 21.5, ktas: 110, fuelFlowGph: 7.8 },
      70: { rpm: 2350, manifoldPressureInHg: 22.5, ktas: 116, fuelFlowGph: 8.6 },
      75: { rpm: 2450, manifoldPressureInHg: 23.5, ktas: 122, fuelFlowGph: 9.7 },
    },
  }),
  takeoffTable: generatePlaceholderFieldTable({
    altitudesFt: [0, 4000, 8000],
    isaDeviationsC: [0, 20],
    weightsLbs: [2200, 2550],
    baseGroundRollFt: 850,
    baseDistanceOver50ftFt: 1500,
  }),
  landingTable: generatePlaceholderFieldTable({
    altitudesFt: [0, 4000, 8000],
    isaDeviationsC: [0, 20],
    weightsLbs: [2200, 2550],
    baseGroundRollFt: 600,
    baseDistanceOver50ftFt: 1350,
  }),

  performanceDataSource: 'placeholder',
  weightBalanceDataSource: 'placeholder',
  sourceNote:
    'Engine/fuel/speed specs from N234FF rental sheet. Performance tables and W&B arms are placeholder — upload the real POH to replace them.',
};

const cessna182t: AircraftProfile = {
  id: 'c182t-g1000',
  tailNumber: 'N32LP',
  displayName: 'C182T Cruise Advisor',
  model: 'Cessna 182T G1000 (Skylane)',

  engineHp: 230,
  maxSpeedKts: 145,
  serviceCeilingFt: 18100,

  emptyWeightLbs: 1970,
  emptyWeightArm: 40.5,
  maxGrossWeightLbs: 3100,
  usableFuelGal: 87,
  fuelLbsPerGal: 6,
  fuelArm: 46.0,

  stations: [
    { id: 'front-seats', label: 'Front Seats (Pilot + Pax)', arm: 37.0 },
    { id: 'rear-seats', label: 'Rear Seats', arm: 73.0 },
    { id: 'baggage-1', label: 'Baggage Area 1', arm: 95.0, maxWeight: 120 },
    { id: 'baggage-2', label: 'Baggage Area 2', arm: 116.0, maxWeight: 80 },
  ],
  envelope: [
    { weight: 1970, forwardArm: 34.0, aftArm: 46.5 },
    { weight: 2500, forwardArm: 35.4, aftArm: 46.8 },
    { weight: 3100, forwardArm: 37.9, aftArm: 47.0 },
  ],

  availablePowerSettings: [65, 70, 75],
  cruiseTable: generatePlaceholderCruiseTable({
    altitudesFt: [2000, 6000, 10000],
    isaDeviationsC: [-20, 0, 20],
    powerBaselines: {
      65: { rpm: 2200, manifoldPressureInHg: 21.0, ktas: 127, fuelFlowGph: 12.6 },
      70: { rpm: 2300, manifoldPressureInHg: 22.0, ktas: 133, fuelFlowGph: 13.7 },
      75: { rpm: 2400, manifoldPressureInHg: 23.0, ktas: 139, fuelFlowGph: 14.9 },
    },
  }),
  takeoffTable: generatePlaceholderFieldTable({
    altitudesFt: [0, 4000, 8000],
    isaDeviationsC: [0, 20],
    weightsLbs: [2700, 3100],
    baseGroundRollFt: 950,
    baseDistanceOver50ftFt: 1650,
  }),
  landingTable: generatePlaceholderFieldTable({
    altitudesFt: [0, 4000, 8000],
    isaDeviationsC: [0, 20],
    weightsLbs: [2700, 3100],
    baseGroundRollFt: 700,
    baseDistanceOver50ftFt: 1450,
  }),

  performanceDataSource: 'placeholder',
  weightBalanceDataSource: 'placeholder',
  sourceNote:
    'Engine/fuel/speed specs from N32LP rental sheet. Performance tables and W&B arms are placeholder — upload the real POH to replace them.',
};

export const aircraftProfiles: AircraftProfile[] = [cessna172sp, cessna182t];

export const defaultAircraftProfileId = cessna172sp.id;
