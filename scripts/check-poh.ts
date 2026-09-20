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
import { c182tCruise } from '../src/data/poh/c182t-cruise.ts';
import { c182tPohBase as c182tPoh } from '../src/data/poh/c182t.ts';
import type { FieldWeightBlock } from '../src/data/poh/types.ts';

const problems: string[] = [];
let checks = 0;

function check(condition: boolean, message: string) {
  checks++;
  if (!condition) problems.push(message);
}

// --- Cruise -----------------------------------------------------------------
// At a fixed altitude and RPM, raising manifold pressure must raise power,
// speed and fuel flow. Within one row, a hotter (thinner) column must give
// less power and less fuel flow than a colder one.

for (const block of c182tCruise) {
  const alt = block.pressureAltitudeFt;

  check(
    block.tempsC.cold < block.tempsC.std && block.tempsC.std < block.tempsC.hot,
    `${alt} ft: temperature columns are not ordered cold < std < hot`
  );
  check(
    block.tempsC.hot - block.tempsC.std === 20 && block.tempsC.std - block.tempsC.cold === 20,
    `${alt} ft: temperature columns are not 20°C apart`
  );

  const byRpm = new Map<number, typeof block.rows>();
  for (const row of block.rows) {
    byRpm.set(row[0], [...(byRpm.get(row[0]) ?? []), row] as typeof block.rows);
  }

  for (const [rpm, rows] of byRpm) {
    // Tuple layout is [rpm, mp, cold, std, hot], so the cells are at 2-4.
    const columns = [2, 3, 4] as const;
    const names = ['cold', 'std', 'hot'];

    // Monotonic in manifold pressure, descending MP order in the source.
    for (let c = 0; c < columns.length; c++) {
      const cells = rows
        .map((r) => ({ mp: r[1], cell: r[columns[c]] }))
        .filter((x) => x.cell !== null)
        .sort((a, b) => a.mp - b.mp);

      for (let i = 1; i < cells.length; i++) {
        const lo = cells[i - 1].cell!;
        const hi = cells[i].cell!;
        const where = `${alt} ft / ${rpm} RPM / ${names[c]} / MP ${cells[i - 1].mp}->${cells[i].mp}`;
        check(hi[0] >= lo[0], `${where}: %MCP decreased with higher MP (${lo[0]} -> ${hi[0]})`);
        check(hi[1] >= lo[1], `${where}: KTAS decreased with higher MP (${lo[1]} -> ${hi[1]})`);
        check(hi[2] >= lo[2], `${where}: GPH decreased with higher MP (${lo[2]} -> ${hi[2]})`);
      }
    }

    // Across temperature columns within a single MP row.
    for (const row of rows) {
      const [, mp, cold, std, hot] = row;
      const where = `${alt} ft / ${rpm} RPM / MP ${mp}`;
      if (cold && std) {
        check(std[0] <= cold[0], `${where}: %MCP rose from cold to std (${cold[0]} -> ${std[0]})`);
        check(std[2] <= cold[2], `${where}: GPH rose from cold to std (${cold[2]} -> ${std[2]})`);
      }
      if (std && hot) {
        check(hot[0] <= std[0], `${where}: %MCP rose from std to hot (${std[0]} -> ${hot[0]})`);
        check(hot[2] <= std[2], `${where}: GPH rose from std to hot (${std[2]} -> ${hot[2]})`);
      }
    }

    // Sanity bounds.
    for (const row of rows) {
      for (let c = 0; c < columns.length; c++) {
        const cell = row[columns[c]];
        if (!cell) continue;
        const where = `${alt} ft / ${rpm} RPM / MP ${row[1]} / ${names[c]}`;
        check(cell[0] >= 40 && cell[0] <= 90, `${where}: %MCP ${cell[0]} outside 40-90`);
        check(cell[1] >= 100 && cell[1] <= 160, `${where}: KTAS ${cell[1]} outside 100-160`);
        check(cell[2] >= 8 && cell[2] <= 16, `${where}: GPH ${cell[2]} outside 8-16`);
      }
    }
  }
}

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

checkFieldTable('takeoff', c182tPoh.takeoff);
checkFieldTable('landing', c182tPoh.landing);

// --- Climb ------------------------------------------------------------------
for (const [label, table] of [
  ['max rate', c182tPoh.climbMaxRate],
  ['normal', c182tPoh.climbNormal],
] as const) {
  for (let i = 1; i < table.length; i++) {
    const prev = table[i - 1];
    const row = table[i];
    const where = `climb (${label}) ${prev.pressureAltitudeFt}->${row.pressureAltitudeFt} ft`;
    check(row.rateOfClimbFpm <= prev.rateOfClimbFpm, `${where}: rate of climb increased with altitude`);
    check(row.timeMin >= prev.timeMin, `${where}: time to climb decreased`);
    check(row.fuelGal >= prev.fuelGal, `${where}: fuel to climb decreased`);
    check(row.distanceNm >= prev.distanceNm, `${where}: distance to climb decreased`);
  }
}

// --- Weights and CG ---------------------------------------------------------
check(
  c182tPoh.maxRampWeightLbs >= c182tPoh.maxTakeoffWeightLbs,
  'ramp weight is below takeoff weight'
);
check(
  c182tPoh.maxTakeoffWeightLbs >= c182tPoh.maxLandingWeightLbs,
  'takeoff weight is below landing weight'
);
check(
  c182tPoh.standardEmptyWeightLbs + c182tPoh.maxUsefulLoadLbs === c182tPoh.maxRampWeightLbs,
  `empty (${c182tPoh.standardEmptyWeightLbs}) + useful load (${c182tPoh.maxUsefulLoadLbs}) != ramp weight (${c182tPoh.maxRampWeightLbs})`
);

for (let i = 0; i < c182tPoh.cgEnvelope.length; i++) {
  const point = c182tPoh.cgEnvelope[i];
  check(
    point.forwardArmIn < point.aftArmIn,
    `CG envelope at ${point.weightLbs} lb: forward limit is not ahead of aft limit`
  );
  if (i > 0) {
    const prev = c182tPoh.cgEnvelope[i - 1];
    check(point.weightLbs > prev.weightLbs, 'CG envelope points are not sorted by weight');
    check(
      point.forwardArmIn >= prev.forwardArmIn,
      `CG envelope: forward limit moved forward as weight increased (${prev.forwardArmIn} -> ${point.forwardArmIn})`
    );
  }
}

// --- Report -----------------------------------------------------------------
const cruiseCells = c182tCruise.reduce(
  (n, b) => n + b.rows.reduce((m, r) => m + [r[2], r[3], r[4]].filter(Boolean).length, 0),
  0
);

console.log(`Checked ${checks} assertions over ${cruiseCells} transcribed cruise cells.`);

if (problems.length === 0) {
  console.log('All consistency checks passed.');
} else {
  console.error(`\n${problems.length} problem(s) found:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
