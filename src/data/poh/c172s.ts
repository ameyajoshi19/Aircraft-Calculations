/**
 * Cessna 172S NAV III / GFC 700 AFCS — POH document 172SPHBUS-00.
 * Weights, CG limits, takeoff/landing distance and climb data.
 *
 * Extracted from the POH PDF's own text layer rather than read by eye, then
 * checked by `npm run check:poh` and re-compared against that text layer by
 * `npm run verify:172s`. The station arms, which are printed on a diagram
 * rather than in text, were read from a 200 dpi render of page 6-13.
 *
 * NORMAL CATEGORY ONLY. The 172S is certificated in both normal and utility
 * category, and utility has its own weights (2200 lb takeoff) and its own,
 * much tighter, aft CG limit of 40.5 in. Flying utility also requires the
 * baggage compartment empty and the rear seat unoccupied. None of that is
 * modelled here, so do not use this profile to plan a utility-category flight.
 */
import type { ClimbRow, FieldCorrections, FieldWeightBlock, PohDocument } from './types.ts';

/**
 * SHORT FIELD TAKEOFF DISTANCE, Figure 5-5, pages 5-15 / 5-16 / 5-17.
 * Flaps 10°, full throttle prior to brake release, paved level dry runway,
 * zero wind. Above 3000 ft the mixture is leaned for maximum RPM in a full
 * throttle static run-up.
 */
const takeoff: FieldWeightBlock[] = [
  {
    weightLbs: 2550,
    liftOffKias: 51,
    overObstacleKias: 56,
    byOatC: {
      0: [
        [0, 860, 1465], [1000, 940, 1600], [2000, 1025, 1755], [3000, 1125, 1925],
        [4000, 1235, 2120], [5000, 1355, 2345], [6000, 1495, 2605], [7000, 1645, 2910],
        [8000, 1820, 3265],
      ],
      10: [
        [0, 925, 1575], [1000, 1010, 1720], [2000, 1110, 1890], [3000, 1215, 2080],
        [4000, 1335, 2295], [5000, 1465, 2545], [6000, 1615, 2830], [7000, 1785, 3170],
        [8000, 1970, 3575],
      ],
      20: [
        [0, 995, 1690], [1000, 1090, 1850], [2000, 1195, 2035], [3000, 1310, 2240],
        [4000, 1440, 2480], [5000, 1585, 2755], [6000, 1745, 3075], [7000, 1920, 3440],
        [8000, 2120, 3880],
      ],
      30: [
        [0, 1070, 1810], [1000, 1170, 1990], [2000, 1285, 2190], [3000, 1410, 2420],
        [4000, 1550, 2685], [5000, 1705, 2975], [6000, 1875, 3320], [7000, 2065, 3730],
        [8000, 2280, 4225],
      ],
      40: [
        [0, 1150, 1945], [1000, 1260, 2135], [2000, 1380, 2355], [3000, 1515, 2605],
        [4000, 1660, 2880], [5000, 1825, 3205], [6000, 2010, 3585], [7000, 2215, 4045],
        [8000, 2450, 4615],
      ],
    },
  },
  {
    weightLbs: 2400,
    liftOffKias: 48,
    overObstacleKias: 54,
    byOatC: {
      0: [
        [0, 745, 1275], [1000, 810, 1390], [2000, 885, 1520], [3000, 970, 1665],
        [4000, 1065, 1830], [5000, 1170, 2015], [6000, 1285, 2230], [7000, 1415, 2470],
        [8000, 1560, 2755],
      ],
      10: [
        [0, 800, 1370], [1000, 875, 1495], [2000, 955, 1635], [3000, 1050, 1795],
        [4000, 1150, 1975], [5000, 1265, 2180], [6000, 1390, 2410], [7000, 1530, 2685],
        [8000, 1690, 3000],
      ],
      20: [
        [0, 860, 1470], [1000, 940, 1605], [2000, 1030, 1760], [3000, 1130, 1930],
        [4000, 1240, 2130], [5000, 1360, 2355], [6000, 1500, 2610], [7000, 1650, 2900],
        [8000, 1815, 3240],
      ],
      30: [
        [0, 925, 1570], [1000, 1010, 1720], [2000, 1110, 1890], [3000, 1215, 2080],
        [4000, 1335, 2295], [5000, 1465, 2530], [6000, 1610, 2805], [7000, 1770, 3125],
        [8000, 1950, 3500],
      ],
      40: [
        [0, 995, 1685], [1000, 1085, 1845], [2000, 1190, 2030], [3000, 1305, 2230],
        [4000, 1430, 2455], [5000, 1570, 2715], [6000, 1725, 3015], [7000, 1900, 3370],
        [8000, 2095, 3790],
      ],
    },
  },
  {
    weightLbs: 2200,
    liftOffKias: 44,
    overObstacleKias: 50,
    byOatC: {
      0: [
        [0, 610, 1055], [1000, 665, 1145], [2000, 725, 1250], [3000, 795, 1365],
        [4000, 870, 1490], [5000, 955, 1635], [6000, 1050, 1800], [7000, 1150, 1985],
        [8000, 1270, 2195],
      ],
      10: [
        [0, 655, 1130], [1000, 720, 1230], [2000, 785, 1340], [3000, 860, 1465],
        [4000, 940, 1605], [5000, 1030, 1765], [6000, 1130, 1940], [7000, 1245, 2145],
        [8000, 1370, 2375],
      ],
      20: [
        [0, 705, 1205], [1000, 770, 1315], [2000, 845, 1435], [3000, 925, 1570],
        [4000, 1010, 1725], [5000, 1110, 1900], [6000, 1220, 2090], [7000, 1340, 2305],
        [8000, 1475, 2555],
      ],
      30: [
        [0, 760, 1290], [1000, 830, 1410], [2000, 905, 1540], [3000, 995, 1685],
        [4000, 1090, 1855], [5000, 1195, 2035], [6000, 1310, 2240], [7000, 1435, 2475],
        [8000, 1580, 2745],
      ],
      40: [
        [0, 815, 1380], [1000, 890, 1505], [2000, 975, 1650], [3000, 1065, 1805],
        [4000, 1165, 1975], [5000, 1275, 2175], [6000, 1400, 2395], [7000, 1540, 2650],
        [8000, 1695, 2950],
      ],
    },
  },
];

/**
 * SHORT FIELD LANDING DISTANCE, Figure 5-11, page 5-24.
 * Flaps FULL, power IDLE, maximum braking, paved level dry runway, zero wind.
 * The POH tabulates one weight only.
 */
const landing: FieldWeightBlock[] = [
  {
    weightLbs: 2550,
    overObstacleKias: 61,
    byOatC: {
      0: [
        [0, 545, 1290], [1000, 565, 1320], [2000, 585, 1355], [3000, 610, 1385],
        [4000, 630, 1425], [5000, 655, 1460], [6000, 680, 1500], [7000, 705, 1545],
        [8000, 735, 1585],
      ],
      10: [
        [0, 565, 1320], [1000, 585, 1350], [2000, 610, 1385], [3000, 630, 1425],
        [4000, 655, 1460], [5000, 680, 1500], [6000, 705, 1540], [7000, 730, 1585],
        [8000, 760, 1630],
      ],
      20: [
        [0, 585, 1350], [1000, 605, 1385], [2000, 630, 1420], [3000, 655, 1460],
        [4000, 675, 1495], [5000, 705, 1535], [6000, 730, 1580], [7000, 760, 1625],
        [8000, 790, 1670],
      ],
      30: [
        [0, 605, 1380], [1000, 625, 1420], [2000, 650, 1455], [3000, 675, 1495],
        [4000, 700, 1535], [5000, 725, 1575], [6000, 755, 1620], [7000, 785, 1665],
        [8000, 815, 1715],
      ],
      40: [
        [0, 625, 1415], [1000, 650, 1450], [2000, 670, 1490], [3000, 695, 1530],
        [4000, 725, 1570], [5000, 750, 1615], [6000, 780, 1660], [7000, 810, 1705],
        [8000, 840, 1755],
      ],
    },
  },
];

/**
 * TIME, FUEL AND DISTANCE TO CLIMB at 2550 lb — Figure 5-7, page 5-18.
 * Flaps up, full throttle, standard temperature. This sheet prints the
 * standard temperature per altitude, which the 182T's equivalent does not.
 */
const climbMaxRate: ClimbRow[] = [
  { pressureAltitudeFt: 0, standardTempC: 15, climbSpeedKias: 74, rateOfClimbFpm: 730, timeMin: 0, fuelGal: 0.0, distanceNm: 0 },
  { pressureAltitudeFt: 1000, standardTempC: 13, climbSpeedKias: 73, rateOfClimbFpm: 695, timeMin: 1, fuelGal: 0.4, distanceNm: 2 },
  { pressureAltitudeFt: 2000, standardTempC: 11, climbSpeedKias: 73, rateOfClimbFpm: 655, timeMin: 3, fuelGal: 0.8, distanceNm: 4 },
  { pressureAltitudeFt: 3000, standardTempC: 9, climbSpeedKias: 73, rateOfClimbFpm: 620, timeMin: 4, fuelGal: 1.2, distanceNm: 6 },
  { pressureAltitudeFt: 4000, standardTempC: 7, climbSpeedKias: 73, rateOfClimbFpm: 600, timeMin: 6, fuelGal: 1.5, distanceNm: 8 },
  { pressureAltitudeFt: 5000, standardTempC: 5, climbSpeedKias: 73, rateOfClimbFpm: 550, timeMin: 8, fuelGal: 1.9, distanceNm: 10 },
  { pressureAltitudeFt: 6000, standardTempC: 3, climbSpeedKias: 73, rateOfClimbFpm: 505, timeMin: 10, fuelGal: 2.2, distanceNm: 13 },
  { pressureAltitudeFt: 7000, standardTempC: 1, climbSpeedKias: 73, rateOfClimbFpm: 455, timeMin: 12, fuelGal: 2.6, distanceNm: 16 },
  { pressureAltitudeFt: 8000, standardTempC: -1, climbSpeedKias: 72, rateOfClimbFpm: 410, timeMin: 14, fuelGal: 3.0, distanceNm: 19 },
  { pressureAltitudeFt: 9000, standardTempC: -3, climbSpeedKias: 72, rateOfClimbFpm: 360, timeMin: 17, fuelGal: 3.4, distanceNm: 22 },
  { pressureAltitudeFt: 10000, standardTempC: -5, climbSpeedKias: 72, rateOfClimbFpm: 315, timeMin: 20, fuelGal: 3.9, distanceNm: 27 },
  { pressureAltitudeFt: 11000, standardTempC: -7, climbSpeedKias: 72, rateOfClimbFpm: 265, timeMin: 24, fuelGal: 4.4, distanceNm: 32 },
  { pressureAltitudeFt: 12000, standardTempC: -9, climbSpeedKias: 72, rateOfClimbFpm: 220, timeMin: 28, fuelGal: 5.0, distanceNm: 38 },
];

/** Fuel allowance for engine start, taxi and takeoff — note on Figure 5-7. */
export const C172S_START_TAXI_TAKEOFF_FUEL_GAL = 1.4;

/**
 * Wind and surface corrections, from the notes on Figures 5-5 and 5-11.
 * Note the grass factor differs between takeoff (15%) and landing (45%).
 */
export const C172S_FIELD_CORRECTIONS: FieldCorrections = {
  headwind: { percent: 10, perKts: 9 },
  tailwind: { percent: 10, perKts: 2, maxKts: 10 },
  dryGrassPercentOfGroundRoll: { takeoff: 15, landing: 45 },
  flapsUpLanding: { extraKias: 9, percent: 35 },
};

/** Section 2 page 2-9 and Section 6 Figure 6-5 (page 6-13). */
export const C172S_DATUM = {
  description: 'Firewall, front face, lower portion (FS 0.0)',
  fuelWeightLbsPerGal: 6.0,
} as const;

/**
 * Figure 6-5, page 6-13, read from a render of the diagram. Occupant arms are
 * the CG of an average occupant on adjustable seats; the bracketed range is
 * the fore/aft travel. Baggage arms are as printed on the diagram — note
 * area B is 123, NOT the 125 that the midpoint of stations 108-142 would give.
 */
export const C172S_STATIONS = {
  standardSeating: [
    { id: 'front-seats', label: 'Pilot & Front Passenger', armIn: 37, armRangeIn: [34, 46] },
    { id: 'rear-seats', label: 'Rear Passengers', armIn: 73 },
    { id: 'baggage-a', label: 'Baggage Area A', armIn: 95, stationIn: [82, 108], maxWeightLbs: 120 },
    { id: 'baggage-b', label: 'Baggage Area B', armIn: 123, stationIn: [108, 142], maxWeightLbs: 50 },
  ],
} as const;

/** Figure 6-5 note, page 6-13: "The usable fuel C.G. arm is located at FS 48.00." */
export const C172S_USABLE_FUEL_ARM_IN = 48.0;

/**
 * Section 1 page 1-3: 56 gallons total, 53 usable. The sample loading problem
 * on page 6-9 also charts a reduced-fuel case of 35 gallons.
 */
export const C172S_USABLE_FUEL_GAL = { standard: 53, reduced: 35 } as const;

/**
 * Section 1 page 1-8 and Section 2 page 2-8. Baggage has per-area limits AND
 * a combined limit, which a per-station maximum cannot express.
 */
export const C172S_BAGGAGE_LIMITS = {
  areas: [
    { id: 'baggage-a', label: 'Baggage Area A', stationFrom: 82, stationTo: 108, maxWeightLbs: 120 },
    { id: 'baggage-b', label: 'Baggage Area B', stationFrom: 108, stationTo: 142, maxWeightLbs: 50 },
  ],
  combined: [{ areaIds: ['baggage-a', 'baggage-b'], maxWeightLbs: 120 }],
} as const;

/**
 * Utility category limits, recorded because the book publishes them and
 * leaving them out would make this transcription look complete when it is
 * not. Nothing in the app reads these yet.
 */
export const C172S_UTILITY_CATEGORY = {
  maxRampWeightLbs: 2208,
  maxTakeoffWeightLbs: 2200,
  maxLandingWeightLbs: 2200,
  maxUsefulLoadLbs: 545,
  cgEnvelope: [
    { weightLbs: 1950, forwardArmIn: 35.0, aftArmIn: 40.5 },
    { weightLbs: 2200, forwardArmIn: 37.5, aftArmIn: 40.5 },
  ],
  /** The baggage compartment must be empty and the rear seat unoccupied. */
  baggageAllowedLbs: 0,
} as const;

/**
 * Everything except the cruise table, which lives in `c172s-cruise.ts`.
 * Keeping the two data files free of value imports from each other lets the
 * transcription checker load each one directly under plain Node.
 */
export const c172sPohBase: Omit<PohDocument, 'cruise'> = {
  documentNumber: '172SPHBUS-00',
  model: 'Cessna 172S NAV III / GFC 700 AFCS',

  // Section 1 page 1-8 and Section 2 page 2-8, normal category.
  maxRampWeightLbs: 2558,
  maxTakeoffWeightLbs: 2550,
  maxLandingWeightLbs: 2550,
  standardEmptyWeightLbs: 1663,
  maxUsefulLoadLbs: 895,

  /**
   * Section 2 page 2-9, NORMAL category. Forward limit is 35.0 in at 1950 lb
   * or less, with straight-line variation to 41.0 in at 2550 lb. Aft limit is
   * 47.3 in at all weights.
   */
  cgEnvelope: [
    { weightLbs: 1950, forwardArmIn: 35.0, aftArmIn: 47.3 },
    { weightLbs: 2550, forwardArmIn: 41.0, aftArmIn: 47.3 },
  ],

  takeoff,
  landing,
  climbMaxRate,
  // The 172S book publishes one time/fuel/distance sheet, not the 182T's two
  // (maximum rate and normal climb), so there is no separate normal-climb
  // table to transcribe.
  climbNormal: [],
};
