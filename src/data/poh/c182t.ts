/**
 * Cessna 182T NAV III / GFC 700 AFCS — POH document 182TPHBUS-00.
 * Weights, CG limits, takeoff/landing distance and climb data.
 *
 * TRANSCRIBED BY EYE FROM PAGE IMAGES. NOT INDEPENDENTLY VERIFIED AGAINST
 * THE PRINTED BOOK.
 */
import type { ClimbRow, FieldWeightBlock, PohDocument } from './types';

/**
 * Anomalies present in the printed POH itself, transcribed as-is.
 *
 * These are NOT transcription errors — a clean scan of the page confirms the
 * book prints these values. They are recorded so the app can warn rather
 * than quietly interpolate through them, and so nobody "fixes" the data
 * later by substituting a nicer-looking number.
 *
 * Every other cell in this table rises with altitude and with temperature.
 * This one does not, and it errs in the unsafe direction: an interpolation
 * crossing it returns a *shorter* landing distance than the same conditions
 * at sea level. Callers should take the conservative neighbour.
 */
export const POH_ANOMALIES = [
  {
    page: '5-37',
    table: 'landing',
    weightLbs: 2950,
    altitudeFt: 1000,
    oatC: 0,
    field: 'over50ftFt',
    printedValue: 1265,
    issue:
      'Non-monotonic: 1265 ft at 1000 ft is shorter than the 1300 ft at sea level, ' +
      'while the 10°C column rises 1335 -> 1365 across the same step. Likely a misprint ' +
      'in the book (1365 appears directly to its right), but it is what the POH says. ' +
      'Verify against a later revision before relying on it.',
  },
] as const;

/**
 * SHORT FIELD TAKEOFF DISTANCE, Figure 5-6, pages 5-16 / 5-17 / 5-18.
 * Flaps 20°, 2400 RPM, full throttle and mixture set prior to brake release,
 * cowl flaps OPEN, paved level dry runway, zero wind.
 */
const takeoff: FieldWeightBlock[] = [
  {
    weightLbs: 3100,
    liftOffKias: 49,
    overObstacleKias: 58,
    byOatC: {
      0: [
        [0, 715, 1365], [1000, 775, 1490], [2000, 850, 1635], [3000, 925, 1800],
        [4000, 1015, 1990], [5000, 1110, 2210], [6000, 1220, 2470], [7000, 1340, 2785],
        [8000, 1480, 3175],
      ],
      10: [
        [0, 765, 1460], [1000, 835, 1600], [2000, 915, 1760], [3000, 995, 1940],
        [4000, 1090, 2150], [5000, 1195, 2395], [6000, 1315, 2690], [7000, 1445, 3045],
        [8000, 1595, 3500],
      ],
      20: [
        [0, 825, 1570], [1000, 900, 1720], [2000, 980, 1890], [3000, 1070, 2090],
        [4000, 1175, 2325], [5000, 1290, 2595], [6000, 1415, 2930], [7000, 1560, 3345],
        [8000, 1720, 3880],
      ],
      30: [
        [0, 885, 1680], [1000, 965, 1845], [2000, 1055, 2035], [3000, 1150, 2255],
        [4000, 1260, 2515], [5000, 1385, 2820], [6000, 1520, 3200], [7000, 1675, 3685],
        // POH prints "---": climb performance after lift-off is below 150 FPM.
        [8000, null, null],
      ],
      40: [
        [0, 945, 1800], [1000, 1030, 1980], [2000, 1130, 2190], [3000, 1235, 2435],
        [4000, 1355, 2720], [5000, 1485, 3070], [6000, 1635, 3510],
        [7000, null, null], [8000, null, null],
      ],
    },
  },
  {
    weightLbs: 2700,
    liftOffKias: 45,
    overObstacleKias: 54,
    byOatC: {
      0: [
        [0, 520, 995], [1000, 565, 1080], [2000, 615, 1180], [3000, 675, 1285],
        [4000, 735, 1410], [5000, 805, 1550], [6000, 880, 1705], [7000, 965, 1890],
        [8000, 1060, 2100],
      ],
      10: [
        [0, 560, 1065], [1000, 610, 1155], [2000, 665, 1260], [3000, 725, 1380],
        [4000, 790, 1510], [5000, 865, 1665], [6000, 950, 1840], [7000, 1040, 2040],
        [8000, 1145, 2275],
      ],
      20: [
        [0, 600, 1135], [1000, 655, 1235], [2000, 710, 1350], [3000, 775, 1480],
        [4000, 850, 1625], [5000, 930, 1790], [6000, 1020, 1980], [7000, 1120, 2205],
        [8000, 1230, 2465],
      ],
      30: [
        [0, 645, 1215], [1000, 700, 1320], [2000, 765, 1445], [3000, 835, 1585],
        [4000, 910, 1740], [5000, 1000, 1920], [6000, 1095, 2135], [7000, 1200, 2380],
        [8000, 1320, 2675],
      ],
      40: [
        [0, 690, 1295], [1000, 750, 1410], [2000, 820, 1545], [3000, 895, 1695],
        [4000, 975, 1870], [5000, 1070, 2065], [6000, 1175, 2300], [7000, 1290, 2575],
        [8000, 1420, 2910],
      ],
    },
  },
  {
    weightLbs: 2300,
    liftOffKias: 42,
    overObstacleKias: 50,
    byOatC: {
      0: [
        [0, 365, 705], [1000, 395, 765], [2000, 430, 830], [3000, 470, 900],
        [4000, 510, 980], [5000, 555, 1065], [6000, 610, 1165], [7000, 665, 1275],
        [8000, 730, 1405],
      ],
      10: [
        [0, 390, 750], [1000, 425, 815], [2000, 460, 885], [3000, 505, 960],
        [4000, 550, 1045], [5000, 600, 1140], [6000, 655, 1250], [7000, 715, 1370],
        [8000, 785, 1510],
      ],
      20: [
        [0, 420, 800], [1000, 455, 870], [2000, 495, 940], [3000, 540, 1025],
        [4000, 590, 1115], [5000, 640, 1220], [6000, 700, 1335], [7000, 770, 1470],
        [8000, 845, 1620],
      ],
      30: [
        [0, 450, 850], [1000, 490, 925], [2000, 530, 1005], [3000, 580, 1090],
        [4000, 630, 1190], [5000, 690, 1305], [6000, 755, 1430], [7000, 825, 1570],
        [8000, 905, 1735],
      ],
      40: [
        [0, 480, 905], [1000, 520, 985], [2000, 565, 1070], [3000, 620, 1165],
        [4000, 675, 1270], [5000, 735, 1390], [6000, 805, 1530], [7000, 885, 1685],
        [8000, 970, 1865],
      ],
    },
  },
];

/**
 * SHORT FIELD LANDING DISTANCE, Figure 5-12, pages 5-37/5-38.
 * Flaps FULL, power IDLE, maximum braking, paved level dry runway, zero wind.
 * Speed at 50 ft: 60 KIAS. The POH tabulates one weight only.
 */
const landing: FieldWeightBlock[] = [
  {
    weightLbs: 2950,
    overObstacleKias: 60,
    byOatC: {
      0: [
        // 1000 ft / 0°C reads 1265 in the book — lower than the 1300 at sea
        // level. See POH_ANOMALIES: transcribed as printed, not corrected.
        [0, 560, 1300], [1000, 580, 1265], [2000, 600, 1370], [3000, 625, 1410],
        [4000, 650, 1450], [5000, 670, 1485], [6000, 700, 1530], [7000, 725, 1575],
        [8000, 755, 1625],
      ],
      10: [
        [0, 580, 1335], [1000, 600, 1365], [2000, 625, 1405], [3000, 645, 1445],
        [4000, 670, 1485], [5000, 695, 1525], [6000, 725, 1575], [7000, 750, 1615],
        [8000, 780, 1655],
      ],
      20: [
        [0, 600, 1365], [1000, 620, 1400], [2000, 645, 1440], [3000, 670, 1485],
        [4000, 695, 1525], [5000, 720, 1565], [6000, 750, 1615], [7000, 780, 1665],
        [8000, 810, 1715],
      ],
      30: [
        [0, 620, 1400], [1000, 645, 1440], [2000, 670, 1480], [3000, 695, 1525],
        [4000, 720, 1565], [5000, 745, 1610], [6000, 775, 1660], [7000, 805, 1710],
        [8000, 835, 1760],
      ],
      40: [
        [0, 640, 1435], [1000, 665, 1475], [2000, 690, 1515], [3000, 715, 1560],
        [4000, 740, 1600], [5000, 770, 1650], [6000, 800, 1700], [7000, 830, 1750],
        [8000, 865, 1805],
      ],
    },
  },
];

/** TIME, FUEL AND DISTANCE TO CLIMB at 3100 lb — Figure 5-8 Sheet 1, page 5-20. */
const climbMaxRate: ClimbRow[] = [
  { pressureAltitudeFt: 0, climbSpeedKias: 80, rateOfClimbFpm: 925, timeMin: 0, fuelGal: 0.0, distanceNm: 0 },
  { pressureAltitudeFt: 2000, climbSpeedKias: 79, rateOfClimbFpm: 835, timeMin: 2, fuelGal: 0.8, distanceNm: 3 },
  { pressureAltitudeFt: 4000, climbSpeedKias: 78, rateOfClimbFpm: 750, timeMin: 5, fuelGal: 1.5, distanceNm: 7 },
  { pressureAltitudeFt: 6000, climbSpeedKias: 77, rateOfClimbFpm: 660, timeMin: 8, fuelGal: 2.3, distanceNm: 11 },
  { pressureAltitudeFt: 8000, climbSpeedKias: 75, rateOfClimbFpm: 565, timeMin: 11, fuelGal: 3.2, distanceNm: 16 },
  { pressureAltitudeFt: 10000, climbSpeedKias: 74, rateOfClimbFpm: 470, timeMin: 15, fuelGal: 4.2, distanceNm: 21 },
  { pressureAltitudeFt: 12000, climbSpeedKias: 73, rateOfClimbFpm: 375, timeMin: 20, fuelGal: 5.2, distanceNm: 29 },
  { pressureAltitudeFt: 14000, climbSpeedKias: 72, rateOfClimbFpm: 285, timeMin: 26, fuelGal: 6.5, distanceNm: 38 },
];

/** NORMAL CLIMB — 90 KIAS at 3100 lb — Figure 5-8 Sheet 2, page 5-21. */
const climbNormal: ClimbRow[] = [
  { pressureAltitudeFt: 0, climbSpeedKias: 90, rateOfClimbFpm: 665, timeMin: 0, fuelGal: 0.0, distanceNm: 0 },
  { pressureAltitudeFt: 2000, climbSpeedKias: 90, rateOfClimbFpm: 625, timeMin: 3, fuelGal: 0.8, distanceNm: 5 },
  { pressureAltitudeFt: 4000, climbSpeedKias: 90, rateOfClimbFpm: 580, timeMin: 6, fuelGal: 1.6, distanceNm: 10 },
  { pressureAltitudeFt: 6000, climbSpeedKias: 90, rateOfClimbFpm: 540, timeMin: 10, fuelGal: 2.5, distanceNm: 16 },
  { pressureAltitudeFt: 8000, climbSpeedKias: 90, rateOfClimbFpm: 455, timeMin: 14, fuelGal: 3.5, distanceNm: 23 },
  { pressureAltitudeFt: 10000, climbSpeedKias: 90, rateOfClimbFpm: 370, timeMin: 19, fuelGal: 4.6, distanceNm: 31 },
];

/** Fuel allowance for engine start, taxi and takeoff — note on both climb sheets. */
export const C182T_START_TAXI_TAKEOFF_FUEL_GAL = 1.7;

/**
 * Wind and surface corrections, from the notes on Figures 5-6 and 5-12.
 * Note the grass factor differs between takeoff (15%) and landing (45%).
 */
export const C182T_FIELD_CORRECTIONS = {
  headwindPercentPer9Kts: -10,
  tailwindPercentPer2Kts: 10,
  maxTailwindKts: 10,
  dryGrassPercentOfGroundRoll: { takeoff: 15, landing: 45 },
  /** Landing with flaps up: add 10 KIAS to approach speed and 40% to distances. */
  flapsUpLandingPercent: 40,
} as const;

/** Section 6, Figure 6-1 (pages 6-5 / 6-6). Datum is the front face of the firewall. */
export const C182T_DATUM = {
  description: 'Firewall, front face, lower portion (FS 0.0)',
  meanAerodynamicChordIn: 58.8,
  leadingEdgeMacFs: 25.98,
  /** CG %MAC = (CG arm − 25.98) / 0.5880 */
  percentMacFromArm: (armIn: number) => (armIn - 25.98) / 0.588,
  /**
   * Drainable UNUSABLE fuel, from the weighing form on page 6-6. This sits at
   * a different station from usable fuel and is already counted inside basic
   * empty weight — it must not be added again when loading.
   */
  drainableUnusableFuel: { weightLbs: 30.0, armIn: 48.0, gallons: 5 },
  fuelWeightLbsPerGal: 6.0,
} as const;

/**
 * Figure 6-5, page 6-14. Arms for occupants are the CG of an average
 * occupant on adjustable seats; the bracketed range is the fore/aft travel.
 * Baggage arms are measured to the centre of each area.
 */
export const C182T_STATIONS = {
  standardSeating: [
    { id: 'front-seats', label: 'Pilot & Front Passenger', armIn: 37, armRangeIn: [32, 50] },
    { id: 'rear-seats', label: 'Rear Passengers', armIn: 74 },
    { id: 'baggage-a', label: 'Baggage Area A', armIn: 97, stationIn: [82, 109], maxWeightLbs: 120 },
    { id: 'baggage-b', label: 'Baggage Area B', armIn: 116, stationIn: [109, 124], maxWeightLbs: 80 },
    { id: 'baggage-c', label: 'Baggage Area C', armIn: 129, stationIn: [124, 134], maxWeightLbs: 80 },
  ],
  /** With the rear seat removed, that space becomes a cargo area at FS 65-82. */
  rearSeatRemoved: [
    { id: 'front-seats', label: 'Pilot & Front Passenger', armIn: 37, armRangeIn: [32, 50] },
    { id: 'cargo', label: 'Cargo (rear seat removed)', armIn: 74, stationIn: [65, 82] },
    { id: 'baggage-a', label: 'Baggage Area A', armIn: 97, stationIn: [82, 109], maxWeightLbs: 120 },
    { id: 'baggage-b', label: 'Baggage Area B', armIn: 116, stationIn: [109, 124], maxWeightLbs: 80 },
    { id: 'baggage-c', label: 'Baggage Area C', armIn: 129, stationIn: [124, 134], maxWeightLbs: 80 },
  ],
} as const;

/**
 * Figure 6-5 note, page 6-14: "The usable fuel C.G. arm is located at
 * FS 46.50." This is NOT the 48.00 arm on the weighing form — that one
 * belongs to the drainable unusable fuel inside empty weight.
 */
export const C182T_USABLE_FUEL_ARM_IN = 46.5;

/** Loading graph, Figure 6-4 page 6-13. Two tank configurations are charted. */
export const C182T_USABLE_FUEL_GAL = { standard: 87, reduced: 64 } as const;

/**
 * Everything except the cruise tables, which live in `c182t-cruise.ts` and
 * are joined on in `index.ts`. Keeping the two data files free of value
 * imports from each other lets the transcription checker load each one
 * directly under plain Node.
 */
export const c182tPohBase: Omit<PohDocument, 'cruise'> = {
  documentNumber: '182TPHBUS-00',
  model: 'Cessna 182T NAV III / GFC 700 AFCS',

  // Section 1 page 1-8 and Section 2 page 2-8.
  maxRampWeightLbs: 3110,
  maxTakeoffWeightLbs: 3100,
  maxLandingWeightLbs: 2950,
  standardEmptyWeightLbs: 1924,
  maxUsefulLoadLbs: 1186,

  /**
   * Section 2 page 2-8. Forward limit is 33.0 in at 2250 lb or less, with
   * straight-line variation to 35.5 in at 2700 lb, then to 40.9 in at
   * 3100 lb. Aft limit is 46.0 in at all weights.
   */
  cgEnvelope: [
    { weightLbs: 2250, forwardArmIn: 33.0, aftArmIn: 46.0 },
    { weightLbs: 2700, forwardArmIn: 35.5, aftArmIn: 46.0 },
    { weightLbs: 3100, forwardArmIn: 40.9, aftArmIn: 46.0 },
  ],

  takeoff,
  landing,
  climbMaxRate,
  climbNormal,
};

/**
 * Section 1 page 1-8 / Section 2 page 2-8. Baggage has per-area limits AND
 * combined limits, which a simple per-station maximum cannot express.
 */
export const C182T_BAGGAGE_LIMITS = {
  areas: [
    { id: 'baggage-a', label: 'Baggage Area A', stationFrom: 82, stationTo: 109, maxWeightLbs: 120 },
    { id: 'baggage-b', label: 'Baggage Area B', stationFrom: 109, stationTo: 124, maxWeightLbs: 80 },
    { id: 'baggage-c', label: 'Baggage Area C', stationFrom: 124, stationTo: 134, maxWeightLbs: 80 },
  ],
  combined: [
    { areaIds: ['baggage-a', 'baggage-b', 'baggage-c'], maxWeightLbs: 200 },
    { areaIds: ['baggage-b', 'baggage-c'], maxWeightLbs: 80 },
  ],
} as const;
