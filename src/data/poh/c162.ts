/**
 * Cessna 162 Skycatcher / Garmin G300 — POH document 162PHUS-04.
 * Weights, CG limits, takeoff/landing distance and climb data.
 *
 * The Section 5 performance tables are scanned bitmaps with no text layer, so
 * they were READ BY EYE — twice, independently, from a 200 dpi full-page
 * render and again from 300 dpi crops — and are guarded by the physical
 * consistency checks in `npm run check:poh`. Everything in Sections 1, 2 and
 * 6 below (weights, CG range, stations, fuel arm) came from the book's text
 * layer, which those sections do have; the station arms were additionally
 * confirmed against a render of the Figure 6-5 diagram on page 6-19.
 *
 * This is a two-seat Light Sport aircraft: one occupant station and one
 * baggage area, and its datum sits far forward of the fuselage, so its arms
 * are around FS 140 where the 172S and 182T are around FS 40. Nothing is
 * wrong if these numbers look nothing like the other two.
 */
import type { ClimbRow, FieldCorrections, FieldWeightBlock, PohDocument } from './types.ts';

/**
 * SHORT FIELD TAKEOFF DISTANCE, Figure 5-5, page 5-14.
 * Flaps 10°, full throttle prior to brake release, paved level dry runway,
 * zero wind. Above 3000 ft the mixture is leaned for maximum RPM in a full
 * throttle static run-up.
 */
const takeoff: FieldWeightBlock[] = [
  {
    weightLbs: 1320,
    liftOffKias: 50,
    overObstacleKias: 55,
    byOatC: {
      0: [
        [0, 570, 1025], [1000, 620, 1115], [2000, 680, 1215], [3000, 750, 1320],
        [4000, 820, 1440], [5000, 905, 1575], [6000, 995, 1725], [7000, 1100, 1895],
        [8000, 1215, 2080],
      ],
      10: [
        [0, 615, 1100], [1000, 675, 1195], [2000, 740, 1300], [3000, 810, 1420],
        [4000, 890, 1550], [5000, 980, 1695], [6000, 1080, 1860], [7000, 1195, 2040],
        [8000, 1320, 2245],
      ],
      20: [
        [0, 665, 1175], [1000, 725, 1280], [2000, 795, 1395], [3000, 875, 1525],
        [4000, 965, 1665], [5000, 1060, 1825], [6000, 1170, 2000], [7000, 1295, 2200],
        [8000, 1430, 2425],
      ],
      30: [
        [0, 715, 1260], [1000, 785, 1370], [2000, 860, 1495], [3000, 945, 1635],
        [4000, 1040, 1790], [5000, 1150, 1960], [6000, 1265, 2155], [7000, 1400, 2370],
        [8000, 1550, 2615],
      ],
      40: [
        [0, 770, 1345], [1000, 845, 1470], [2000, 930, 1600], [3000, 1020, 1750],
        [4000, 1125, 1920], [5000, 1240, 2105], [6000, 1370, 2315], [7000, 1515, 2550],
        [8000, 1675, 2810],
      ],
    },
  },
];

/**
 * SHORT FIELD LANDING DISTANCE, Figure 5-9, page 5-18.
 * Flaps FULL, power IDLE, maximum braking, paved level dry runway, zero wind.
 */
const landing: FieldWeightBlock[] = [
  {
    weightLbs: 1320,
    overObstacleKias: 50,
    byOatC: {
      0: [
        [0, 635, 1325], [1000, 660, 1355], [2000, 685, 1385], [3000, 710, 1420],
        [4000, 735, 1455], [5000, 765, 1490], [6000, 795, 1530], [7000, 825, 1570],
        [8000, 855, 1610],
      ],
      10: [
        [0, 660, 1355], [1000, 685, 1385], [2000, 710, 1420], [3000, 735, 1455],
        [4000, 765, 1490], [5000, 795, 1525], [6000, 825, 1565], [7000, 855, 1605],
        [8000, 890, 1650],
      ],
      20: [
        [0, 685, 1385], [1000, 710, 1415], [2000, 735, 1450], [3000, 760, 1485],
        [4000, 790, 1525], [5000, 820, 1565], [6000, 850, 1605], [7000, 885, 1645],
        [8000, 920, 1690],
      ],
      30: [
        [0, 705, 1415], [1000, 730, 1450], [2000, 760, 1485], [3000, 790, 1520],
        [4000, 815, 1560], [5000, 850, 1600], [6000, 880, 1640], [7000, 915, 1685],
        [8000, 950, 1730],
      ],
      40: [
        [0, 730, 1445], [1000, 755, 1480], [2000, 785, 1515], [3000, 815, 1555],
        [4000, 845, 1595], [5000, 875, 1635], [6000, 910, 1680], [7000, 945, 1725],
        [8000, 980, 1770],
      ],
    },
  },
];

/**
 * TIME, FUEL AND DISTANCE TO CLIMB at 1320 lb — Figure 5-7, page 5-16.
 * Flaps up, full throttle, standard temperature. Climb speed is 62 KIAS at
 * every altitude, unlike the Cessnas whose climb speed falls with altitude.
 */
const climbMaxRate: ClimbRow[] = [
  { pressureAltitudeFt: 0, climbSpeedKias: 62, rateOfClimbFpm: 880, timeMin: 0, fuelGal: 0.0, distanceNm: 0 },
  { pressureAltitudeFt: 1000, climbSpeedKias: 62, rateOfClimbFpm: 825, timeMin: 1, fuelGal: 0.2, distanceNm: 1 },
  { pressureAltitudeFt: 2000, climbSpeedKias: 62, rateOfClimbFpm: 775, timeMin: 2, fuelGal: 0.4, distanceNm: 3 },
  { pressureAltitudeFt: 3000, climbSpeedKias: 62, rateOfClimbFpm: 720, timeMin: 4, fuelGal: 0.6, distanceNm: 4 },
  { pressureAltitudeFt: 4000, climbSpeedKias: 62, rateOfClimbFpm: 665, timeMin: 5, fuelGal: 0.8, distanceNm: 6 },
  { pressureAltitudeFt: 5000, climbSpeedKias: 62, rateOfClimbFpm: 615, timeMin: 7, fuelGal: 1.1, distanceNm: 7 },
  { pressureAltitudeFt: 6000, climbSpeedKias: 62, rateOfClimbFpm: 560, timeMin: 9, fuelGal: 1.3, distanceNm: 9 },
  { pressureAltitudeFt: 7000, climbSpeedKias: 62, rateOfClimbFpm: 505, timeMin: 10, fuelGal: 1.6, distanceNm: 12 },
  { pressureAltitudeFt: 8000, climbSpeedKias: 62, rateOfClimbFpm: 455, timeMin: 13, fuelGal: 1.9, distanceNm: 14 },
  { pressureAltitudeFt: 9000, climbSpeedKias: 62, rateOfClimbFpm: 400, timeMin: 15, fuelGal: 2.2, distanceNm: 17 },
  { pressureAltitudeFt: 10000, climbSpeedKias: 62, rateOfClimbFpm: 345, timeMin: 18, fuelGal: 2.5, distanceNm: 20 },
  { pressureAltitudeFt: 11000, climbSpeedKias: 62, rateOfClimbFpm: 295, timeMin: 21, fuelGal: 2.9, distanceNm: 24 },
  { pressureAltitudeFt: 12000, climbSpeedKias: 62, rateOfClimbFpm: 240, timeMin: 25, fuelGal: 3.4, distanceNm: 29 },
];

/** Fuel allowance for engine start, taxi and takeoff — note on Figure 5-7. */
export const C162_START_TAXI_TAKEOFF_FUEL_GAL = 0.6;

/**
 * Wind corrections, from the notes on Figures 5-5 and 5-9.
 *
 * Note these differ from the Cessna singles: this aircraft is lighter and
 * slower, so the same percentage correction comes from a smaller wind —
 * 7 knots of headwind, not 9, and 1.5 knots of tailwind, not 2.
 *
 * Neither the takeoff nor the landing sheet carries a grass-runway
 * correction, so there is none here. The 172S and 182T both have one; do not
 * borrow theirs.
 */
export const C162_FIELD_CORRECTIONS: FieldCorrections = {
  headwind: { percent: 10, perKts: 7 },
  tailwind: { percent: 10, perKts: 1.5, maxKts: 10 },
  // No dryGrassPercentOfGroundRoll: neither the takeoff nor the landing sheet
  // in this book carries a grass correction. Do not borrow the Cessnas'.
  flapsUpLanding: { extraKias: 6, percent: 20 },
};

/** Section 2 page 2-8 and Section 6 Figure 6-5 (page 6-19). */
export const C162_DATUM = {
  description: 'Firewall, front face, lower portion (FS 0.0)',
  fuelWeightLbsPerGal: 6.0,
} as const;

/**
 * Figure 6-5 (Sheet 1), page 6-19. The 162 seats two side by side, so there
 * is a single occupant station, and one baggage area behind it.
 */
export const C162_STATIONS = {
  standardSeating: [
    { id: 'front-seats', label: 'Pilot & Front Passenger', armIn: 142 },
    { id: 'baggage', label: 'Baggage Area', armIn: 172.5, stationIn: [155, 190], maxWeightLbs: 50 },
  ],
} as const;

/** Figure 6-5 note, page 6-19: "The usable fuel C.G. arm is located at FS 143.26." */
export const C162_USABLE_FUEL_ARM_IN = 143.26;

/** Section 1 page 1-3: 24 gallons usable. */
export const C162_USABLE_FUEL_GAL = { standard: 24 } as const;

/**
 * Section 2 page 2-8. A single baggage area, so there is no combined limit —
 * but the WARNING that goes with it is an airworthiness condition, not a
 * suggestion.
 */
export const C162_BAGGAGE_LIMITS = {
  areas: [
    { id: 'baggage', label: 'Baggage Area', stationFrom: 155, stationTo: 190, maxWeightLbs: 50 },
  ],
  combined: [],
  warning: 'Aft bulkhead closeout net required for flight.',
} as const;

/**
 * Section 2 page 2-8, present in revision -04 and NOT in the earlier -01.
 * This is a limit on the aeroplane's own empty weight, so it constrains how
 * much equipment may be fitted rather than how it may be loaded; nothing in
 * the app reads it yet.
 */
export const C162_MAX_EMPTY_WEIGHT_LBS = 894;

export const c162PohBase: Omit<PohDocument, 'cruise'> = {
  documentNumber: '162PHUS-04',
  model: 'Cessna 162 Skycatcher / Garmin G300',

  // Section 1 page 1-3 and Section 2 page 2-8.
  maxRampWeightLbs: 1324,
  maxTakeoffWeightLbs: 1320,
  maxLandingWeightLbs: 1320,
  standardEmptyWeightLbs: 834,
  maxUsefulLoadLbs: 490,

  /**
   * Section 2 page 2-8. Forward limit is 134.46 in at 1320 lb or less, with
   * straight-line variation to 132.06 in at 1050 lb. Aft limit is 136.86 in
   * at all weights. The envelope is stored lightest-first, so the forward
   * limit reads as moving aft with weight, as it does on the other aircraft.
   */
  cgEnvelope: [
    { weightLbs: 1050, forwardArmIn: 132.06, aftArmIn: 136.86 },
    { weightLbs: 1320, forwardArmIn: 134.46, aftArmIn: 136.86 },
  ],

  takeoff,
  landing,
  climbMaxRate,
  // The 162 publishes one time/fuel/distance sheet, not the 182T's two.
  climbNormal: [],
};
