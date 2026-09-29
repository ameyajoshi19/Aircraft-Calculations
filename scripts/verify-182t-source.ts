/**
 * Verify the transcribed 182T tables against the POH's own text layer.
 *
 * The data in `src/data/poh/c182t*.ts` was transcribed by eye from page
 * images. The POH PDF also carries an extracted text layer — an independent
 * rendering of the same printed tables — so parsing it and comparing cell by
 * cell catches any digit a human eye got wrong.
 *
 * The POH is copyrighted and is NOT in this repository. Extract the text
 * yourself and pass the path:
 *
 *   pdftotext -layout "182T POH.pdf" 182t.txt
 *   node --experimental-strip-types scripts/verify-182t-source.ts 182t.txt
 *
 * Covered: cruise (Figure 5-9, 11 sheets), short field takeoff (Figure 5-6,
 * 3 sheets), short field landing (Figure 5-12), time/fuel/distance to climb
 * (Figure 5-8, both sheets), and the Section 2 weight and CG limits.
 *
 * A mismatch means one of the two readings is wrong. Resolve it by looking at
 * the printed page — do not assume either side. The one deliberate
 * difference, the misprinted landing cell, is declared in POH_CORRECTIONS and
 * is checked here against what the book prints rather than what we store.
 */
import { readFileSync } from 'node:fs';

import { C182T_BAGGAGE_LIMITS, POH_CORRECTIONS, c182tPohBase } from '../src/data/poh/c182t.ts';
import { c182tCruise } from '../src/data/poh/c182t-cruise.ts';
import type { CruiseCell } from '../src/data/poh/types.ts';

const path = process.argv[2];
if (!path) {
  console.error('Usage: node --experimental-strip-types scripts/verify-182t-source.ts <pdftotext-output.txt>');
  process.exit(2);
}

const lines = readFileSync(path, 'utf8').split('\n');
const failures: string[] = [];
let numbersCompared = 0;

function compare(where: string, mine: number | null, theirs: number | null): void {
  numbersCompared += 1;
  if (mine === null && theirs === null) return;
  if (mine === null || theirs === null || Math.abs(mine - theirs) > 1e-9) {
    failures.push(`${where}: transcribed ${mine ?? 'null'}, source ${theirs ?? 'null (---)'}`);
  }
}

/** A numeric token, or null where the book prints "---". */
function token(raw: string): number | null {
  if (/^-{2,}$/.test(raw)) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`not a data token: ${raw}`);
  return n;
}

function altitude(label: string): number {
  return /SEA/i.test(label) ? 0 : Number(label.replace(/,/g, ''));
}

/**
 * The page body belonging to one figure sheet: from that sheet's own title
 * back-scan to its caption, so the tail of the preceding page cannot leak in.
 */
function sheetBodies(caption: RegExp, title: RegExp): { key: string; body: string[] }[] {
  const out: { key: string; body: string[] }[] = [];
  let start = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const m = caption.exec(lines[i]);
    if (!m) continue;
    const slice = lines.slice(start, i);
    start = i + 1;
    let titleAt = -1;
    for (let j = 0; j < slice.length; j += 1) if (title.test(slice[j])) titleAt = j;
    if (titleAt < 0) continue;
    out.push({ key: m[1] ?? String(out.length + 1), body: slice.slice(titleAt) });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Cruise — Figure 5-9, sheets 1-11. Two sheets share each pressure altitude
// (the book splits them by RPM), so they are merged before comparing.
// ---------------------------------------------------------------------------

const ALTITUDE_RE = /PRESSURE\s+ALTITUDE\s+(SEA\s+LEVEL|[\d,]+)\s*(?:FEET)?/i;
type SourceCell = readonly [number, number, number] | null;

const cruiseByAltitude = new Map<number, { tempsC: number[]; cells: Map<string, SourceCell[]> }>();
let cruiseSheets = 0;

for (const { body } of sheetBodies(/Figure\s+5-9\s+\(Sheet\s+(\d+)/i, /^\s*CRUISE\s+PERFORMANCE\s*$/)) {
  cruiseSheets += 1;
  const altLine = body.find((l) => ALTITUDE_RE.test(l));
  if (!altLine) continue;
  const pressureAltitudeFt = altitude(ALTITUDE_RE.exec(altLine)![1]);

  // Column temperatures. Strip the "20°C BELOW/ABOVE" captions first, or
  // their own 20 would be read as a column temperature.
  const tempsC: number[] = [];
  for (const line of body) {
    if (!/°C/.test(line) || /RPM/.test(line)) continue;
    for (const m of line.replace(/20°C\s+(BELOW|ABOVE)/gi, ' ').matchAll(/(-?\d+)\s*°C/g)) {
      tempsC.push(Number(m[1]));
    }
  }

  const cells = new Map<string, SourceCell[]>();
  let rpm: number | null = null;
  for (const line of body) {
    // [RPM] MP then nine tokens: (%MCP, KTAS, GPH) per temperature column.
    const m = /^\s*(?:(\d{4})\s+)?(\d{2})\s+((?:(?:-{2,}|\d+(?:\.\d+)?)\s+){8}(?:-{2,}|\d+(?:\.\d+)?))\s*$/.exec(line);
    if (!m) continue;
    if (m[1]) rpm = Number(m[1]);
    if (rpm === null) continue;
    const mp = Number(m[2]);
    if (mp < 10 || mp > 30) continue;

    const values = m[3].trim().split(/\s+/).map(token);
    cells.set(
      `${rpm}:${mp}`,
      [0, 1, 2].map((c) => {
        const [pct, ktas, gph] = values.slice(c * 3, c * 3 + 3);
        return pct === null && ktas === null && gph === null ? null : ([pct!, ktas!, gph!] as const);
      })
    );
  }

  const existing = cruiseByAltitude.get(pressureAltitudeFt);
  if (!existing) {
    cruiseByAltitude.set(pressureAltitudeFt, { tempsC, cells });
    continue;
  }
  existing.tempsC.push(...tempsC);
  for (const [key, value] of cells) {
    if (existing.cells.has(key)) failures.push(`cruise ${pressureAltitudeFt} ft: duplicate row ${key}`);
    existing.cells.set(key, value);
  }
}

if (cruiseSheets === 0) {
  console.error(`No "Figure 5-9 (Sheet n)" cruise pages found in ${path} — is this the right document?`);
  process.exit(2);
}

const COLUMNS = ['cold', 'std', 'hot'] as const;
const CELL_FIELDS = ['%MCP', 'KTAS', 'GPH'] as const;
let cruiseCells = 0;

for (const block of c182tCruise.blocks) {
  const source = cruiseByAltitude.get(block.pressureAltitudeFt);
  if (!source) {
    failures.push(`cruise ${block.pressureAltitudeFt} ft: no such pressure altitude in the source`);
    continue;
  }
  // The captions repeat on both sheets of a split altitude, hence the set.
  const sourceTemps = [...new Set(source.tempsC)];
  for (const t of [block.tempsC.cold, block.tempsC.std, block.tempsC.hot]) {
    if (!sourceTemps.includes(t)) {
      failures.push(
        `cruise ${block.pressureAltitudeFt} ft: column temperature ${t}°C not in source (source: ${sourceTemps.join(', ')})`
      );
    }
  }

  const seen = new Set<string>();
  for (const row of block.rows) {
    const [rpm, mp, ...transcribed] = row;
    const key = `${rpm}:${mp}`;
    seen.add(key);
    const sourceRow = source.cells.get(key);
    if (!sourceRow) {
      failures.push(`cruise ${block.pressureAltitudeFt} ft ${rpm} RPM ${mp}": row is not in the source`);
      continue;
    }
    for (let c = 0; c < 3; c += 1) {
      cruiseCells += 1;
      const mine = transcribed[c] as CruiseCell;
      const theirs = sourceRow[c];
      const where = `cruise ${block.pressureAltitudeFt} ft ${rpm} RPM ${mp}" ${COLUMNS[c]}`;
      if (mine === null && theirs === null) continue;
      if (mine === null || theirs === null) {
        failures.push(`${where}: transcribed ${mine ? `[${mine}]` : 'null'}, source ${theirs ? `[${theirs}]` : 'null (---)'}`);
        continue;
      }
      for (let f = 0; f < 3; f += 1) compare(`${where} ${CELL_FIELDS[f]}`, mine[f], theirs[f]);
    }
  }
  for (const key of source.cells.keys()) {
    if (!seen.has(key)) {
      const [rpm, mp] = key.split(':');
      failures.push(`cruise ${block.pressureAltitudeFt} ft ${rpm} RPM ${mp}": in the source but not transcribed`);
    }
  }
}
for (const altitudeFt of cruiseByAltitude.keys()) {
  if (!c182tCruise.blocks.some((b) => b.pressureAltitudeFt === altitudeFt)) {
    failures.push(`cruise ${altitudeFt} ft: sheet in the source but no block transcribed`);
  }
}

// ---------------------------------------------------------------------------
// Short field takeoff (Figure 5-6) and landing (Figure 5-12). Both are
// indexed by ACTUAL OAT: five columns of (ground roll, total over 50 ft).
// ---------------------------------------------------------------------------

const FIELD_OATS = [0, 10, 20, 30, 40] as const;

interface SourceFieldSheet {
  weightLbs: number;
  liftOffKias?: number;
  overObstacleKias?: number;
  /** `${oatC}:${altitudeFt}` → [ground roll, over 50 ft]. */
  rows: Map<string, [number | null, number | null]>;
}

function parseFieldSheet(body: string[]): SourceFieldSheet | null {
  const weightLine = body.find((l) => /AT\s+[\d,]+\s+POUNDS/i.test(l));
  if (!weightLine) return null;
  const sheet: SourceFieldSheet = {
    weightLbs: Number(/AT\s+([\d,]+)\s+POUNDS/i.exec(weightLine)![1].replace(/,/g, '')),
    rows: new Map(),
  };

  for (const line of body) {
    const liftOff = /Lift\s*Off:?\s*(\d+)\s*KIAS/i.exec(line);
    if (liftOff) sheet.liftOffKias = Number(liftOff[1]);
    const at50 = /Speed\s+at\s+50\s*(?:Feet|ft):?\s*(\d+)\s*KIAS/i.exec(line);
    if (at50) sheet.overObstacleKias = Number(at50[1]);

    // Altitude label then ten tokens: (ground roll, over 50 ft) per OAT.
    const m = /^\s*(Sea\s+Level|[\d,]+)\s+((?:(?:-{2,}|\d+)\s+){9}(?:-{2,}|\d+))\s*$/i.exec(line);
    if (!m) continue;
    const altitudeFt = altitude(m[1]);
    if (altitudeFt % 1000 !== 0 || altitudeFt > 20000) continue;
    const values = m[2].trim().split(/\s+/).map(token);
    FIELD_OATS.forEach((oatC, i) => {
      sheet.rows.set(`${oatC}:${altitudeFt}`, [values[i * 2], values[i * 2 + 1]]);
    });
  }
  return sheet.rows.size > 0 ? sheet : null;
}

/** What the book prints for a cell we deliberately store differently. */
function printedValue(
  table: 'takeoff' | 'landing',
  weightLbs: number,
  altitudeFt: number,
  oatC: number,
  field: 'groundRollFt' | 'over50ftFt'
): number | null {
  const correction = POH_CORRECTIONS.find(
    (c) =>
      c.table === table && c.weightLbs === weightLbs && c.altitudeFt === altitudeFt && c.oatC === oatC && c.field === field
  );
  return correction ? correction.printedValue : null;
}

function verifyField(
  label: 'takeoff' | 'landing',
  transcribed: typeof c182tPohBase.takeoff,
  sheets: SourceFieldSheet[]
): void {
  for (const block of transcribed) {
    const source = sheets.find((s) => s.weightLbs === block.weightLbs);
    if (!source) {
      failures.push(`${label} ${block.weightLbs} lb: no sheet at that weight in the source`);
      continue;
    }
    if (block.liftOffKias !== undefined) {
      compare(`${label} ${block.weightLbs} lb lift-off KIAS`, block.liftOffKias, source.liftOffKias ?? null);
    }
    if (block.overObstacleKias !== undefined) {
      compare(`${label} ${block.weightLbs} lb 50 ft KIAS`, block.overObstacleKias, source.overObstacleKias ?? null);
    }

    const seen = new Set<string>();
    for (const oatC of FIELD_OATS) {
      const rows = block.byOatC[oatC];
      if (!rows) {
        failures.push(`${label} ${block.weightLbs} lb: no ${oatC}°C column transcribed`);
        continue;
      }
      for (const [altitudeFt, groundRollFt, over50ftFt] of rows) {
        const key = `${oatC}:${altitudeFt}`;
        seen.add(key);
        const sourceRow = source.rows.get(key);
        if (!sourceRow) {
          failures.push(`${label} ${block.weightLbs} lb ${altitudeFt} ft ${oatC}°C: row not in the source`);
          continue;
        }
        const where = `${label} ${block.weightLbs} lb ${altitudeFt} ft ${oatC}°C`;
        // A declared correction is compared against the printed value, since
        // that is what the source text carries; check-poh.ts separately
        // asserts the stored value is the corrected one.
        const corrected = {
          groundRollFt: printedValue(label, block.weightLbs, altitudeFt, oatC, 'groundRollFt'),
          over50ftFt: printedValue(label, block.weightLbs, altitudeFt, oatC, 'over50ftFt'),
        };
        compare(`${where} ground roll`, corrected.groundRollFt ?? groundRollFt, sourceRow[0]);
        compare(`${where} over 50 ft`, corrected.over50ftFt ?? over50ftFt, sourceRow[1]);
      }
    }
    for (const key of source.rows.keys()) {
      if (!seen.has(key)) {
        const [oatC, altitudeFt] = key.split(':');
        failures.push(`${label} ${block.weightLbs} lb ${altitudeFt} ft ${oatC}°C: in the source but not transcribed`);
      }
    }
  }
}

const takeoffSheets = sheetBodies(/Figure\s+5-6\s+\(Sheet\s+(\d+)/i, /SHORT\s+FIELD\s+TAKEOFF\s+DISTANCE/i)
  .map(({ body }) => parseFieldSheet(body))
  .filter((s): s is SourceFieldSheet => s !== null);
const landingSheets = sheetBodies(/(Figure\s+5-12)\s*$/i, /SHORT\s+FIELD\s+LANDING\s+DISTANCE/i)
  .map(({ body }) => parseFieldSheet(body))
  .filter((s): s is SourceFieldSheet => s !== null);

if (takeoffSheets.length === 0) failures.push('no Figure 5-6 takeoff sheets parsed from the source');
if (landingSheets.length === 0) failures.push('no Figure 5-12 landing sheet parsed from the source');
verifyField('takeoff', c182tPohBase.takeoff, takeoffSheets);
verifyField('landing', c182tPohBase.landing, landingSheets);

// ---------------------------------------------------------------------------
// Time, fuel and distance to climb — Figure 5-8, sheets 1 (max rate) and 2
// (normal climb, 90 KIAS).
// ---------------------------------------------------------------------------

interface SourceClimbRow {
  pressureAltitudeFt: number;
  climbSpeedKias: number;
  rateOfClimbFpm: number;
  timeMin: number;
  fuelGal: number;
  distanceNm: number;
}

function parseClimbSheet(body: string[]): SourceClimbRow[] {
  const rows: SourceClimbRow[] = [];
  for (const line of body) {
    // Altitude, KIAS, FPM, minutes, gallons (the one decimal), NM.
    const m = /^\s*(Sea\s+Level|[\d,]+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+\.\d+)\s+(\d+)\s*$/i.exec(line);
    if (!m) continue;
    rows.push({
      pressureAltitudeFt: altitude(m[1]),
      climbSpeedKias: Number(m[2]),
      rateOfClimbFpm: Number(m[3]),
      timeMin: Number(m[4]),
      fuelGal: Number(m[5]),
      distanceNm: Number(m[6]),
    });
  }
  return rows;
}

const climbSheets = sheetBodies(/Figure\s+5-8\s+\(Sheet\s+(\d+)/i, /TIME,\s+FUEL\s+AND\s+DISTANCE\s+TO\s+CLIMB/i);
const CLIMB_FIELDS = ['climbSpeedKias', 'rateOfClimbFpm', 'timeMin', 'fuelGal', 'distanceNm'] as const;

for (const [label, transcribed, sheetNumber] of [
  ['climb (max rate)', c182tPohBase.climbMaxRate, '1'],
  ['climb (normal)', c182tPohBase.climbNormal, '2'],
] as const) {
  const sheet = climbSheets.find((s) => s.key === sheetNumber);
  if (!sheet) {
    failures.push(`${label}: Figure 5-8 sheet ${sheetNumber} not found in the source`);
    continue;
  }
  const rows = parseClimbSheet(sheet.body);
  for (const mine of transcribed) {
    const theirs = rows.find((r) => r.pressureAltitudeFt === mine.pressureAltitudeFt);
    if (!theirs) {
      failures.push(`${label} ${mine.pressureAltitudeFt} ft: row not in the source`);
      continue;
    }
    for (const field of CLIMB_FIELDS) {
      compare(`${label} ${mine.pressureAltitudeFt} ft ${field}`, mine[field], theirs[field]);
    }
  }
  for (const theirs of rows) {
    if (!transcribed.some((m) => m.pressureAltitudeFt === theirs.pressureAltitudeFt)) {
      failures.push(`${label} ${theirs.pressureAltitudeFt} ft: in the source but not transcribed`);
    }
  }
}

// ---------------------------------------------------------------------------
// Section 2 weight limits. The CG envelope is stated in prose, so these are
// pattern matches against that prose rather than a table parse.
// ---------------------------------------------------------------------------

const text = lines.join('\n');

function expectPhrase(what: string, re: RegExp, expected: number): void {
  numbersCompared += 1;
  const m = re.exec(text);
  if (!m) {
    failures.push(`${what}: could not find the statement in the source (pattern ${re})`);
    return;
  }
  const found = Number(m[1].replace(/,/g, ''));
  if (Math.abs(found - expected) > 1e-9) failures.push(`${what}: transcribed ${expected}, source ${found}`);
}

expectPhrase('max ramp weight', /Maximum\s+Ramp\s+Weight[^\d]*([\d,]+)\s*(?:Pounds|lbs)/i, c182tPohBase.maxRampWeightLbs);
expectPhrase('max takeoff weight', /Maximum\s+Takeoff\s+Weight[^\d]*([\d,]+)\s*(?:Pounds|lbs)/i, c182tPohBase.maxTakeoffWeightLbs);
expectPhrase('max landing weight', /Maximum\s+Landing\s+Weight[^\d]*([\d,]+)\s*(?:Pounds|lbs)/i, c182tPohBase.maxLandingWeightLbs);

// The forward limit is a chain of "N inches aft of datum at W pounds"
// clauses; read every pair in that paragraph rather than assuming three.
const forwardParagraph = /Forward:\s*([\s\S]*?)\n\s*\n/.exec(text);
if (!forwardParagraph) {
  failures.push('CG forward limit: could not find the Section 2 statement in the source');
} else {
  const stated = [
    ...forwardParagraph[1].matchAll(/([\d.]+)\s*inches\s+aft\s+of\s+datum\s+at\s+([\d,]+)\s*pounds/gi),
  ].map((m) => ({ forwardArmIn: Number(m[1]), weightLbs: Number(m[2].replace(/,/g, '')) }));
  if (stated.length === 0) {
    failures.push('CG forward limit: found the paragraph but no "N inches aft of datum at W pounds" clauses');
  }
  for (const { weightLbs, forwardArmIn } of stated) {
    const point = c182tPohBase.cgEnvelope.find((p) => p.weightLbs === weightLbs);
    if (!point) {
      failures.push(`CG envelope: source states a forward limit at ${weightLbs} lb but no such point is transcribed`);
      continue;
    }
    compare(`CG forward limit at ${weightLbs} lb`, point.forwardArmIn, forwardArmIn);
  }
  for (const point of c182tPohBase.cgEnvelope) {
    if (!stated.some((v) => v.weightLbs === point.weightLbs)) {
      failures.push(`CG envelope: ${point.weightLbs} lb is transcribed but the source states no forward limit there`);
    }
  }
}

const aft = /Aft:\s*([\d.]+)\s*inches\s+aft\s+of\s+datum\s+at\s+all\s+weights/i.exec(text);
if (!aft) {
  failures.push('CG aft limit: could not find the Section 2 statement in the source');
} else {
  for (const point of c182tPohBase.cgEnvelope) {
    compare(`CG aft limit at ${point.weightLbs} lb`, point.aftArmIn, Number(aft[1]));
  }
}

// Baggage areas: per-area limit and station span from the Weight Limits list,
// and the two combined limits from the NOTE printed beneath it.
for (const area of C182T_BAGGAGE_LIMITS.areas) {
  const name = area.label.replace(/^Baggage\s+/, '');
  const m = new RegExp(`${name}\\s*-\\s*Station\\s+(\\d+)\\s+to\\s+(\\d+)[^\\n]*?(\\d+)\\s*POUNDS`, 'i').exec(text);
  if (!m) {
    failures.push(`${area.label}: could not find its Weight Limits line in the source`);
    continue;
  }
  compare(`${area.label} station from`, area.stationFrom, Number(m[1]));
  compare(`${area.label} station to`, area.stationTo, Number(m[2]));
  compare(`${area.label} maximum weight`, area.maxWeightLbs, Number(m[3]));
}

expectPhrase(
  'combined baggage A+B+C limit',
  /combined\s+weight\s+capacity\s+for\s+baggage\s+in\s+areas\s+A,\s*B\s+and\s+C\s+is\s+([\d,]+)\s*pounds/is,
  C182T_BAGGAGE_LIMITS.combined.find((c) => c.areaIds.length === 3)!.maxWeightLbs
);
expectPhrase(
  'combined baggage B+C limit',
  /combined\s+allowable\s+weight\s+capacity\s+for\s+baggage\s+in\s+areas\s+B\s+and\s+C\s+is\s+([\d,]+)\s*pounds/is,
  C182T_BAGGAGE_LIMITS.combined.find((c) => c.areaIds.length === 2)!.maxWeightLbs
);

// ---------------------------------------------------------------------------

console.log(`Source: ${path}`);
console.log(
  `Cruise: ${cruiseSheets} sheets, ${cruiseByAltitude.size} pressure altitudes, ${cruiseCells} cells compared.`
);
console.log(`Takeoff: ${takeoffSheets.length} sheets. Landing: ${landingSheets.length} sheet(s).`);
console.log(`Climb: ${climbSheets.length} sheets. Section 2 weight, CG and baggage limits checked.`);
console.log(`${numbersCompared} printed numbers compared in total.`);
if (POH_CORRECTIONS.length > 0) {
  console.log(
    `\n${POH_CORRECTIONS.length} declared correction(s) compared against the PRINTED value, not the stored one:`
  );
  for (const c of POH_CORRECTIONS) {
    console.log(`  page ${c.page} ${c.table} ${c.weightLbs} lb ${c.altitudeFt} ft ${c.oatC}°C ${c.field}: book prints ${c.printedValue}, app stores ${c.storedValue}`);
  }
}

if (failures.length > 0) {
  console.error(`\n${failures.length} mismatch(es):`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log('\nEvery transcribed number matches the POH text layer.');
