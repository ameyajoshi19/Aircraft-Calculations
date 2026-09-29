/**
 * Consistency checks for hand-transcribed POH tables.
 *
 * These cannot prove a transcription is right — only the printed book can do
 * that — but they catch the errors hand transcription actually makes:
 * transposed digits, a dropped decimal point, a value copied into the wrong
 * column. Every check encodes a physical relationship the real tables obey,
 * so a violation means either a typo or a misread cell.
 *
 * Run: npm run check:poh
 */
import { c172sCruise } from '../src/data/poh/c172s-cruise.ts';
import {
  C172S_BAGGAGE_LIMITS,
  C172S_STATIONS,
  C172S_USABLE_FUEL_ARM_IN,
  c172sPohBase as c172sPoh,
} from '../src/data/poh/c172s.ts';
import { c182tCruise } from '../src/data/poh/c182t-cruise.ts';
import {
  C182T_BAGGAGE_LIMITS,
  C182T_STATIONS,
  C182T_USABLE_FUEL_ARM_IN,
  POH_CORRECTIONS,
  c182tPohBase as c182tPoh,
} from '../src/data/poh/c182t.ts';
import type { ClimbRow, CgEnvelopePoint, CruiseRow, CruiseTable, FieldWeightBlock } from '../src/data/poh/types.ts';

const problems: string[] = [];
let checks = 0;

function check(condition: boolean, message: string) {
  checks++;
  if (!condition) problems.push(message);
}

// --- Cruise -----------------------------------------------------------------
// At a fixed altitude, opening the continuous control (manifold pressure on a
// constant-speed aircraft, RPM on a fixed-pitch one) must raise power, speed
// and fuel flow. Within one row, a hotter (thinner) column must give less
// power and less fuel flow than a colder one.

interface CruiseBounds {
  percentPower: [number, number];
  ktas: [number, number];
  gph: [number, number];
}

function checkCruiseTable(label: string, table: CruiseTable, bounds: CruiseBounds) {
  // On a constant-speed table the rows at one RPM form a family varying by MP;
  // on a fixed-pitch table there is one family and RPM is what varies.
  const constantSpeed = table.propeller === 'constant-speed';
  const controlName = constantSpeed ? 'MP' : 'RPM';
  const controlOf = (row: CruiseRow) => (row.length === 5 ? row[1] : row[0]);
  const cellsOf = (row: CruiseRow) =>
    row.length === 5 ? ([row[2], row[3], row[4]] as const) : ([row[1], row[2], row[3]] as const);

  for (const block of table.blocks) {
    const alt = block.pressureAltitudeFt;

    check(
      block.tempsC.cold < block.tempsC.std && block.tempsC.std < block.tempsC.hot,
      `${label} ${alt} ft: temperature columns are not ordered cold < std < hot`
    );
    check(
      block.tempsC.hot - block.tempsC.std === 20 && block.tempsC.std - block.tempsC.cold === 20,
      `${label} ${alt} ft: temperature columns are not 20°C apart`
    );

    const families = new Map<number | null, CruiseRow[]>();
    for (const row of block.rows) {
      const key = constantSpeed ? row[0] : null;
      families.set(key, [...(families.get(key) ?? []), row]);
    }

    for (const [rpm, rows] of families) {
      const family = rpm === null ? `${label} ${alt} ft` : `${label} ${alt} ft / ${rpm} RPM`;
      const names = ['cold', 'std', 'hot'] as const;

      // Monotonic in the continuous control.
      for (let c = 0; c < names.length; c++) {
        const cells = rows
          .map((r) => ({ control: controlOf(r), cell: cellsOf(r)[c] }))
          .filter((x) => x.cell !== null)
          .sort((a, b) => a.control - b.control);

        for (let i = 1; i < cells.length; i++) {
          const lo = cells[i - 1].cell!;
          const hi = cells[i].cell!;
          const where = `${family} / ${names[c]} / ${controlName} ${cells[i - 1].control}->${cells[i].control}`;
          check(hi[0] >= lo[0], `${where}: percent power decreased (${lo[0]} -> ${hi[0]})`);
          check(hi[1] >= lo[1], `${where}: KTAS decreased (${lo[1]} -> ${hi[1]})`);
          check(hi[2] >= lo[2], `${where}: GPH decreased (${lo[2]} -> ${hi[2]})`);
        }
      }

      for (const row of rows) {
        const [cold, std, hot] = cellsOf(row);
        const where = `${family} / ${controlName} ${controlOf(row)}`;

        // Across temperature columns within a single row.
        if (cold && std) {
          check(std[0] <= cold[0], `${where}: percent power rose from cold to std (${cold[0]} -> ${std[0]})`);
          check(std[2] <= cold[2], `${where}: GPH rose from cold to std (${cold[2]} -> ${std[2]})`);
        }
        if (std && hot) {
          check(hot[0] <= std[0], `${where}: percent power rose from std to hot (${std[0]} -> ${hot[0]})`);
          check(hot[2] <= std[2], `${where}: GPH rose from std to hot (${std[2]} -> ${hot[2]})`);
        }

        // Sanity bounds.
        const cells = cellsOf(row);
        for (let c = 0; c < names.length; c++) {
          const cell = cells[c];
          if (!cell) continue;
          const at = `${where} / ${names[c]}`;
          const [percentPower, ktas, gph] = cell;
          check(
            percentPower >= bounds.percentPower[0] && percentPower <= bounds.percentPower[1],
            `${at}: percent power ${percentPower} outside ${bounds.percentPower.join('-')}`
          );
          check(
            ktas >= bounds.ktas[0] && ktas <= bounds.ktas[1],
            `${at}: KTAS ${ktas} outside ${bounds.ktas.join('-')}`
          );
          check(gph >= bounds.gph[0] && gph <= bounds.gph[1], `${at}: GPH ${gph} outside ${bounds.gph.join('-')}`);
        }
      }
    }
  }
}

checkCruiseTable('182T', c182tCruise, {
  percentPower: [40, 90],
  ktas: [100, 160],
  gph: [8, 16],
});

checkCruiseTable('172S', c172sCruise, {
  percentPower: [35, 90],
  ktas: [85, 130],
  gph: [5, 12],
});

// --- Takeoff and landing ----------------------------------------------------
// Distances grow with altitude, with temperature, and with weight.

function checkFieldTable(label: string, blocks: readonly FieldWeightBlock[]) {
  for (const block of blocks) {
    for (const [oat, rows] of Object.entries(block.byOatC)) {
      const sorted = [...rows].sort((a, b) => a[0] - b[0]);
      for (let i = 1; i < sorted.length; i++) {
        const [prevAlt, prevRoll, prevObs] = sorted[i - 1];
        const [alt, roll, obs] = sorted[i];
        const where = `${label} ${block.weightLbs} lb / ${oat}°C / ${prevAlt}->${alt} ft`;
        if (prevRoll !== null && roll !== null) {
          check(roll >= prevRoll, `${where}: ground roll shrank with altitude (${prevRoll} -> ${roll})`);
        }
        if (prevObs !== null && obs !== null) {
          check(obs >= prevObs, `${where}: 50 ft distance shrank with altitude (${prevObs} -> ${obs})`);
        }
      }
    }

    const oats = Object.keys(block.byOatC).map(Number).sort((a, b) => a - b);
    for (let i = 1; i < oats.length; i++) {
      const cooler = block.byOatC[oats[i - 1]];
      const hotter = block.byOatC[oats[i]];
      for (const [alt, roll, obs] of hotter) {
        const match = cooler.find((r) => r[0] === alt);
        if (!match) continue;
        const where = `${label} ${block.weightLbs} lb / ${alt} ft / ${oats[i - 1]}->${oats[i]}°C`;
        if (match[1] !== null && roll !== null) {
          check(roll >= match[1], `${where}: ground roll shrank with temperature (${match[1]} -> ${roll})`);
        }
        if (match[2] !== null && obs !== null) {
          check(obs >= match[2], `${where}: 50 ft distance shrank with temperature (${match[2]} -> ${obs})`);
        }
      }
    }
  }

  const byWeight = [...blocks].sort((a, b) => a.weightLbs - b.weightLbs);
  for (let i = 1; i < byWeight.length; i++) {
    const light = byWeight[i - 1];
    const heavy = byWeight[i];
    for (const [oat, rows] of Object.entries(heavy.byOatC)) {
      const lightRows = light.byOatC[Number(oat)];
      if (!lightRows) continue;
      for (const [alt, roll] of rows) {
        const match = lightRows.find((r) => r[0] === alt);
        if (!match || match[1] === null || roll === null) continue;
        check(
          roll >= match[1],
          `${label} ${oat}°C / ${alt} ft: ground roll shrank with weight (${light.weightLbs} lb ${match[1]} -> ${heavy.weightLbs} lb ${roll})`
        );
      }
    }
  }
}

checkFieldTable('182T takeoff', c182tPoh.takeoff);
checkFieldTable('182T landing', c182tPoh.landing);
checkFieldTable('172S takeoff', c172sPoh.takeoff);
checkFieldTable('172S landing', c172sPoh.landing);

// --- Climb ------------------------------------------------------------------
function checkClimbTable(label: string, table: readonly ClimbRow[]) {
  for (let i = 1; i < table.length; i++) {
    const prev = table[i - 1];
    const row = table[i];
    const where = `${label} ${prev.pressureAltitudeFt}->${row.pressureAltitudeFt} ft`;
    check(row.rateOfClimbFpm <= prev.rateOfClimbFpm, `${where}: rate of climb increased with altitude`);
    check(row.timeMin >= prev.timeMin, `${where}: time to climb decreased`);
    check(row.fuelGal >= prev.fuelGal, `${where}: fuel to climb decreased`);
    check(row.distanceNm >= prev.distanceNm, `${where}: distance to climb decreased`);

    // Where the sheet prints its standard temperature, it must be the ISA
    // value the book itself uses: 15°C at sea level falling 2°C per 1000 ft.
    if (row.standardTempC !== undefined) {
      const expected = 15 - (row.pressureAltitudeFt / 1000) * 2;
      check(
        row.standardTempC === expected,
        `${where}: printed standard temperature ${row.standardTempC}°C is not the ISA ${expected}°C`
      );
    }
  }
}

checkClimbTable('182T climb (max rate)', c182tPoh.climbMaxRate);
checkClimbTable('182T climb (normal)', c182tPoh.climbNormal);
checkClimbTable('172S climb (max rate)', c172sPoh.climbMaxRate);

// --- Weights and CG ---------------------------------------------------------
function checkWeightsAndCg(
  label: string,
  poh: {
    maxRampWeightLbs: number;
    maxTakeoffWeightLbs: number;
    maxLandingWeightLbs: number;
    standardEmptyWeightLbs: number;
    maxUsefulLoadLbs: number;
    cgEnvelope: readonly CgEnvelopePoint[];
  }
) {
  check(poh.maxRampWeightLbs >= poh.maxTakeoffWeightLbs, `${label}: ramp weight is below takeoff weight`);
  check(
    poh.maxTakeoffWeightLbs >= poh.maxLandingWeightLbs,
    `${label}: takeoff weight is below landing weight`
  );
  check(
    poh.standardEmptyWeightLbs + poh.maxUsefulLoadLbs === poh.maxRampWeightLbs,
    `${label}: empty (${poh.standardEmptyWeightLbs}) + useful load (${poh.maxUsefulLoadLbs}) != ramp weight (${poh.maxRampWeightLbs})`
  );

  for (let i = 0; i < poh.cgEnvelope.length; i++) {
    const point = poh.cgEnvelope[i];
    check(
      point.forwardArmIn < point.aftArmIn,
      `${label} CG envelope at ${point.weightLbs} lb: forward limit is not ahead of aft limit`
    );
    if (i > 0) {
      const prev = poh.cgEnvelope[i - 1];
      check(point.weightLbs > prev.weightLbs, `${label} CG envelope points are not sorted by weight`);
      check(
        point.forwardArmIn >= prev.forwardArmIn,
        `${label} CG envelope: forward limit moved forward as weight increased (${prev.forwardArmIn} -> ${point.forwardArmIn})`
      );
    }
  }

  // The envelope must cover the aircraft's own maximum takeoff weight, or the
  // heaviest legal loading would fall off the end of the chart.
  const heaviest = poh.cgEnvelope[poh.cgEnvelope.length - 1];
  check(
    heaviest.weightLbs >= poh.maxTakeoffWeightLbs,
    `${label} CG envelope stops at ${heaviest.weightLbs} lb, below the ${poh.maxTakeoffWeightLbs} lb takeoff weight`
  );
}

checkWeightsAndCg('182T', c182tPoh);
checkWeightsAndCg('172S', c172sPoh);

// --- Loading stations -------------------------------------------------------
// Arms must march aft down the cabin, each baggage arm must sit inside its own
// station range, and usable fuel must fall between the front and rear seats.

interface Station {
  id: string;
  armIn: number;
  stationIn?: readonly [number, number] | readonly number[];
  armRangeIn?: readonly [number, number] | readonly number[];
}

function checkStations(
  label: string,
  layouts: Record<string, readonly Station[]>,
  usableFuelArmIn: number
) {
  for (const [layout, stations] of Object.entries(layouts)) {
    for (let i = 1; i < stations.length; i++) {
      check(
        stations[i].armIn > stations[i - 1].armIn,
        `${label} ${layout}: arm did not increase from ${stations[i - 1].id} (${stations[i - 1].armIn}) to ${stations[i].id} (${stations[i].armIn})`
      );
    }

    for (const station of stations) {
      const range = 'stationIn' in station ? station.stationIn : undefined;
      if (range) {
        check(
          station.armIn >= range[0] && station.armIn <= range[1],
          `${label} ${layout}/${station.id}: arm ${station.armIn} is outside its station range ${range[0]}-${range[1]}`
        );
      }
      const occupantRange = 'armRangeIn' in station ? station.armRangeIn : undefined;
      if (occupantRange) {
        check(
          station.armIn >= occupantRange[0] && station.armIn <= occupantRange[1],
          `${label} ${layout}/${station.id}: average arm ${station.armIn} is outside the seat travel ${occupantRange[0]}-${occupantRange[1]}`
        );
      }
    }
  }

  const [front, rear] = Object.values(layouts)[0];
  check(
    usableFuelArmIn > front.armIn && usableFuelArmIn < rear.armIn,
    `${label}: usable fuel arm ${usableFuelArmIn} is not between the front (${front.armIn}) and rear (${rear.armIn}) seats`
  );
}

checkStations('182T', C182T_STATIONS, C182T_USABLE_FUEL_ARM_IN);
checkStations('172S', C172S_STATIONS, C172S_USABLE_FUEL_ARM_IN);

// --- Baggage ----------------------------------------------------------------
function checkBaggage(
  label: string,
  limits: {
    areas: readonly { id: string; stationFrom: number; stationTo: number; maxWeightLbs: number }[];
    combined: readonly { areaIds: readonly string[]; maxWeightLbs: number }[];
  }
) {
  // A combined baggage limit can never exceed the sum of its parts.
  for (const combo of limits.combined) {
    const individualSum = combo.areaIds.reduce((sum, id) => {
      const area = limits.areas.find((a) => a.id === id);
      return sum + (area?.maxWeightLbs ?? 0);
    }, 0);
    check(
      combo.maxWeightLbs <= individualSum,
      `${label}: combined baggage limit for ${combo.areaIds.join('+')} (${combo.maxWeightLbs}) exceeds the sum of the individual limits (${individualSum})`
    );
  }

  // Baggage areas must tile the cabin without gaps or overlaps.
  for (let i = 1; i < limits.areas.length; i++) {
    check(
      limits.areas[i].stationFrom === limits.areas[i - 1].stationTo,
      `${label}: baggage areas ${limits.areas[i - 1].id} and ${limits.areas[i].id} do not meet`
    );
  }
}

checkBaggage('182T', C182T_BAGGAGE_LIMITS);
checkBaggage('172S', C172S_BAGGAGE_LIMITS);

// --- Declared corrections ---------------------------------------------------
// Each entry in POH_CORRECTIONS must actually be present in the data, and must
// be conservative relative to the printed value. This keeps a correction from
// silently drifting out of the tables, or from being used to shorten a
// distance below what the book says.

for (const correction of POH_CORRECTIONS) {
  const table = correction.table === 'landing' ? c182tPoh.landing : c182tPoh.takeoff;
  const block = table.find((b) => b.weightLbs === correction.weightLbs);
  const row = block?.byOatC[correction.oatC]?.find((r) => r[0] === correction.altitudeFt);
  const actual = row ? (correction.field === 'over50ftFt' ? row[2] : row[1]) : undefined;

  check(
    actual === correction.storedValue,
    `POH_CORRECTIONS ${correction.table} ${correction.altitudeFt} ft / ${correction.oatC}°C: data holds ${actual}, correction declares ${correction.storedValue}`
  );
  check(
    correction.storedValue > correction.printedValue,
    `POH_CORRECTIONS ${correction.table} ${correction.altitudeFt} ft / ${correction.oatC}°C: ${correction.storedValue} is not conservative against the printed ${correction.printedValue}`
  );
}

// --- Report -----------------------------------------------------------------
const cruiseCells = [c182tCruise, c172sCruise].reduce(
  (total, table) =>
    total +
    table.blocks.reduce(
      (n, b) =>
        n +
        b.rows.reduce(
          (m, r) => m + (r.length === 5 ? [r[2], r[3], r[4]] : [r[1], r[2], r[3]]).filter(Boolean).length,
          0
        ),
      0
    ),
  0
);

console.log(`Checked ${checks} assertions over ${cruiseCells} transcribed cruise cells.`);

if (POH_CORRECTIONS.length > 0) {
  console.log(`\n${POH_CORRECTIONS.length} cell(s) deliberately differ from the printed POH:`);
  for (const c of POH_CORRECTIONS) {
    console.log(
      `  ~ p.${c.page} ${c.table} ${c.altitudeFt} ft / ${c.oatC}°C ${c.field}: ` +
        `book ${c.printedValue} -> stored ${c.storedValue}`
    );
  }
}

if (problems.length === 0) {
  console.log('\nAll consistency checks passed.');
} else {
  console.error(`\n${problems.length} problem(s) found:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
