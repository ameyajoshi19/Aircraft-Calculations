/**
 * Verify a transcribed POH against the book's own text layer.
 *
 * The 182T tables were read by eye from page images; the 172S ones were
 * extracted from the PDF's text layer. Either way the text layer is an
 * independent rendering of the printed tables, so parsing it here and
 * comparing cell by cell catches a digit the eye got wrong and guards the
 * extraction against silent drift.
 *
 * The POHs are copyrighted and are NOT in this repository. Extract the text
 * yourself and pass the path:
 *
 *   pdftotext -layout "182T POH.pdf" 182t.txt
 *   npm run verify:182t -- 182t.txt
 *
 *   pdftotext -layout "172S POH.pdf" 172s.txt
 *   npm run verify:172s -- 172s.txt
 *
 * Covered for each aircraft: the cruise sheets, short field takeoff and
 * landing, time/fuel/distance to climb, and the Section 2 weight, CG and
 * baggage limits.
 *
 * A mismatch means one of the two readings is wrong. Resolve it by looking at
 * the printed page — do not assume either side. Deliberate differences are
 * declared in POH_CORRECTIONS and are checked here against what the book
 * PRINTS rather than what we store.
 */
import { readFileSync } from 'node:fs';

import { C172S_BAGGAGE_LIMITS, c172sPohBase } from '../src/data/poh/c172s.ts';
import { c172sCruise } from '../src/data/poh/c172s-cruise.ts';
import { C182T_BAGGAGE_LIMITS, POH_CORRECTIONS, c182tPohBase } from '../src/data/poh/c182t.ts';
import { c182tCruise } from '../src/data/poh/c182t-cruise.ts';
import type { ClimbRow, CruiseCell, CruiseTable, FieldWeightBlock } from '../src/data/poh/types.ts';

/** Where each table lives in a given book, and what shape its pages take. */
interface BookSpec {
  label: string;
  documentNumber: string;
  cruise: CruiseTable;
  takeoff: readonly FieldWeightBlock[];
  landing: readonly FieldWeightBlock[];
  /** Climb sheets, keyed by the sheet number in the figure caption. */
  climb: { sheet: string; label: string; rows: readonly ClimbRow[] }[];
  baggage: {
    areas: readonly { id: string; label: string; stationFrom: number; stationTo: number; maxWeightLbs: number }[];
    combined: readonly { areaIds: readonly string[]; maxWeightLbs: number }[];
  };
  cgEnvelope: readonly { weightLbs: number; forwardArmIn: number; aftArmIn: number }[];
  weights: { maxRampWeightLbs: number; maxTakeoffWeightLbs: number; maxLandingWeightLbs: number };
  corrections: readonly (typeof POH_CORRECTIONS)[number][];
  figures: {
    cruiseCaption: RegExp;
    takeoffCaption: RegExp;
    landingCaption: RegExp;
    climbCaption: RegExp;
  };
  /**
   * Whether the cruise sheets print the actual OAT above each temperature
   * column (the 182T does) or only "STANDARD TEMPERATURE" (the 172S does, so
   * the stored temperatures are checked against ISA instead).
   */
  cruiseTempsArePrinted: boolean;
  /**
   * The 172S states its limits twice, once for normal category and once for
   * utility. Everything after this marker is ignored when reading limits.
   */
  limitsEndMarker?: RegExp;
}

const BOOKS: Record<string, BookSpec> = {
  '182t': {
    label: '182T',
    documentNumber: '182TPHBUS-00',
    cruise: c182tCruise,
    takeoff: c182tPohBase.takeoff,
    landing: c182tPohBase.landing,
    climb: [
      { sheet: '1', label: 'climb (max rate)', rows: c182tPohBase.climbMaxRate },
      { sheet: '2', label: 'climb (normal)', rows: c182tPohBase.climbNormal },
    ],
    baggage: C182T_BAGGAGE_LIMITS,
    cgEnvelope: c182tPohBase.cgEnvelope,
    weights: c182tPohBase,
    corrections: POH_CORRECTIONS,
    figures: {
      cruiseCaption: /Figure\s+5-9\s+\(Sheet\s+(\d+)/i,
      takeoffCaption: /Figure\s+5-6\s+\(Sheet\s+(\d+)/i,
      landingCaption: /(Figure\s+5-12)\s*$/i,
      climbCaption: /Figure\s+5-8\s+\(Sheet\s+(\d+)/i,
    },
    cruiseTempsArePrinted: true,
  },
  '172s': {
    label: '172S',
    documentNumber: '172SPHBUS-00',
    cruise: c172sCruise,
    takeoff: c172sPohBase.takeoff,
    landing: c172sPohBase.landing,
    climb: [{ sheet: '1', label: 'climb (max rate)', rows: c172sPohBase.climbMaxRate }],
    baggage: C172S_BAGGAGE_LIMITS,
    cgEnvelope: c172sPohBase.cgEnvelope,
    weights: c172sPohBase,
    corrections: [],
    figures: {
      cruiseCaption: /Figure\s+5-8\s+\(Sheet\s+(\d+)/i,
      takeoffCaption: /Figure\s+5-5\s+\(Sheet\s+(\d+)/i,
      landingCaption: /(Figure\s+5-11)\s*$/i,
      climbCaption: /(Figure\s+5-7)\s*$/i,
    },
    cruiseTempsArePrinted: false,
    // The normal-category limits come first; UTILITY CATEGORY repeats the
    // same headings with different numbers, and this app models normal only.
    limitsEndMarker: /UTILITY\s+CATEGORY/i,
  },
};

const which = (process.argv[2] ?? '').toLowerCase();
const path = process.argv[3];
const book = BOOKS[which];
if (!book || !path) {
  console.error(
    `Usage: node --experimental-strip-types scripts/verify-poh-source.ts <${Object.keys(BOOKS).join('|')}> <pdftotext-output.txt>`
  );
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
// Cruise. The 182T splits each pressure altitude across two sheets (by RPM),
// so sheets sharing an altitude are merged before comparing. Its rows are
// [RPM] MP + nine values; the fixed-pitch 172S prints [altitude] RPM + nine.
// ---------------------------------------------------------------------------

const ALTITUDE_RE = /PRESSURE\s+ALTITUDE\s+(SEA\s+LEVEL|[\d,]+)\s*(?:FEET)?/i;
type SourceCell = readonly [number, number, number] | null;

const constantSpeed = book.cruise.propeller === 'constant-speed';
const cruiseByAltitude = new Map<number, { tempsC: number[]; cells: Map<string, SourceCell[]> }>();
let cruiseSheets = 0;

/** Splits nine tokens into the three temperature columns. */
function columnsOf(values: (number | null)[]): SourceCell[] {
  return [0, 1, 2].map((c) => {
    const [pct, ktas, gph] = values.slice(c * 3, c * 3 + 3);
    return pct === null && ktas === null && gph === null ? null : ([pct!, ktas!, gph!] as const);
  });
}

for (const { body } of sheetBodies(book.figures.cruiseCaption, /^\s*CRUISE\s+PERFORMANCE\s*$/)) {
  cruiseSheets += 1;

  // Sheet-level altitude, printed in the 182T's title. The 172S puts the
  // altitude in the first column of each row group instead.
  const altLine = body.find((l) => ALTITUDE_RE.test(l));
  const sheetAltitude = altLine ? altitude(ALTITUDE_RE.exec(altLine)![1]) : null;
  if (constantSpeed && sheetAltitude === null) continue;

  // Column temperatures, where the book prints them. Strip the "20°C
  // BELOW/ABOVE" captions first, or their own 20 would be read as one.
  const tempsC: number[] = [];
  for (const line of body) {
    if (!/°C/.test(line) || /RPM/.test(line)) continue;
    for (const m of line.replace(/20°C\s+(BELOW|ABOVE)/gi, ' ').matchAll(/(-?\d+)\s*°C/g)) {
      tempsC.push(Number(m[1]));
    }
  }

  const perAltitude = new Map<number, Map<string, SourceCell[]>>();
  const record = (altitudeFt: number, key: string, columns: SourceCell[]) => {
    const cells = perAltitude.get(altitudeFt) ?? new Map<string, SourceCell[]>();
    if (cells.has(key)) failures.push(`cruise ${altitudeFt} ft: duplicate row ${key}`);
    cells.set(key, columns);
    perAltitude.set(altitudeFt, cells);
  };

  let rpm: number | null = null;
  let rowAltitude: number | null = sheetAltitude;
  for (const line of body) {
    if (constantSpeed) {
      // [RPM] MP then nine tokens: (percent power, KTAS, GPH) per column.
      const m = /^\s*(?:(\d{4})\s+)?(\d{2})\s+((?:(?:-{2,}|\d+(?:\.\d+)?)\s+){8}(?:-{2,}|\d+(?:\.\d+)?))\s*$/.exec(line);
      if (!m) continue;
      if (m[1]) rpm = Number(m[1]);
      if (rpm === null) continue;
      const mp = Number(m[2]);
      if (mp < 10 || mp > 30) continue;
      record(sheetAltitude!, `${rpm}:${mp}`, columnsOf(m[3].trim().split(/\s+/).map(token)));
    } else {
      // [pressure altitude] RPM then the same nine tokens.
      const m = /^\s*(?:([\d,]+)\s+)?(\d{4})\s+((?:(?:-{2,}|\d+(?:\.\d+)?)\s+){8}(?:-{2,}|\d+(?:\.\d+)?))\s*$/.exec(line);
      if (!m) continue;
      if (m[1]) rowAltitude = altitude(m[1]);
      if (rowAltitude === null) continue;
      record(rowAltitude, String(Number(m[2])), columnsOf(m[3].trim().split(/\s+/).map(token)));
    }
  }

  for (const [altitudeFt, cells] of perAltitude) {
    const existing = cruiseByAltitude.get(altitudeFt);
    if (!existing) {
      cruiseByAltitude.set(altitudeFt, { tempsC: [...tempsC], cells });
      continue;
    }
    existing.tempsC.push(...tempsC);
    for (const [key, value] of cells) {
      if (existing.cells.has(key)) failures.push(`cruise ${altitudeFt} ft: duplicate row ${key}`);
      existing.cells.set(key, value);
    }
  }
}

if (cruiseSheets === 0) {
  console.error(`No cruise pages found in ${path} — is this the ${book.label} book?`);
  process.exit(2);
}

const COLUMNS = ['cold', 'std', 'hot'] as const;
const CELL_FIELDS = ['percent power', 'KTAS', 'GPH'] as const;
let cruiseCells = 0;

for (const block of book.cruise.blocks) {
  const source = cruiseByAltitude.get(block.pressureAltitudeFt);
  if (!source) {
    failures.push(`cruise ${block.pressureAltitudeFt} ft: no such pressure altitude in the source`);
    continue;
  }

  const stored = [block.tempsC.cold, block.tempsC.std, block.tempsC.hot];
  if (book.cruiseTempsArePrinted) {
    // The captions repeat on both sheets of a split altitude, hence the set.
    const sourceTemps = [...new Set(source.tempsC)];
    for (const t of stored) {
      if (!sourceTemps.includes(t)) {
        failures.push(
          `cruise ${block.pressureAltitudeFt} ft: column temperature ${t}°C not in source (source: ${sourceTemps.join(', ')})`
        );
      }
    }
  } else {
    // The sheets say only "STANDARD TEMPERATURE", so the stored temperatures
    // must be the ISA the book itself uses: 15°C at sea level, -2°C/1000 ft,
    // with the outer columns exactly 20°C either side.
    const isa = 15 - (block.pressureAltitudeFt / 1000) * 2;
    compare(`cruise ${block.pressureAltitudeFt} ft std column temperature`, block.tempsC.std, isa);
    compare(`cruise ${block.pressureAltitudeFt} ft cold column temperature`, block.tempsC.cold, isa - 20);
    compare(`cruise ${block.pressureAltitudeFt} ft hot column temperature`, block.tempsC.hot, isa + 20);
  }

  const seen = new Set<string>();
  for (const row of block.rows) {
    const key = row.length === 5 ? `${row[0]}:${row[1]}` : String(row[0]);
    const transcribed = row.length === 5 ? [row[2], row[3], row[4]] : [row[1], row[2], row[3]];
    const setting = row.length === 5 ? `${row[0]} RPM ${row[1]}"` : `${row[0]} RPM`;
    seen.add(key);

    const sourceRow = source.cells.get(key);
    if (!sourceRow) {
      failures.push(`cruise ${block.pressureAltitudeFt} ft ${setting}: row is not in the source`);
      continue;
    }
    for (let c = 0; c < 3; c += 1) {
      cruiseCells += 1;
      const mine = transcribed[c] as CruiseCell;
      const theirs = sourceRow[c];
      const where = `cruise ${block.pressureAltitudeFt} ft ${setting} ${COLUMNS[c]}`;
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
      failures.push(`cruise ${block.pressureAltitudeFt} ft ${key}: in the source but not transcribed`);
    }
  }
}
for (const altitudeFt of cruiseByAltitude.keys()) {
  if (!book.cruise.blocks.some((b) => b.pressureAltitudeFt === altitudeFt)) {
    failures.push(`cruise ${altitudeFt} ft: in the source but no block transcribed`);
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
  const correction = book.corrections.find(
    (c) =>
      c.table === table && c.weightLbs === weightLbs && c.altitudeFt === altitudeFt && c.oatC === oatC && c.field === field
  );
  return correction ? correction.printedValue : null;
}

function verifyField(
  label: 'takeoff' | 'landing',
  transcribed: readonly FieldWeightBlock[],
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

const takeoffSheets = sheetBodies(book.figures.takeoffCaption, /SHORT\s+FIELD\s+TAKEOFF\s+DISTANCE/i)
  .map(({ body }) => parseFieldSheet(body))
  .filter((sheet): sheet is SourceFieldSheet => sheet !== null);
const landingSheets = sheetBodies(book.figures.landingCaption, /SHORT\s+FIELD\s+LANDING\s+DISTANCE/i)
  .map(({ body }) => parseFieldSheet(body))
  .filter((sheet): sheet is SourceFieldSheet => sheet !== null);

if (takeoffSheets.length === 0) failures.push('no takeoff sheets parsed from the source');
if (landingSheets.length === 0) failures.push('no landing sheet parsed from the source');
verifyField('takeoff', book.takeoff, takeoffSheets);
verifyField('landing', book.landing, landingSheets);

// ---------------------------------------------------------------------------
// Time, fuel and distance to climb. The 172S sheet carries an extra column,
// the standard temperature at each altitude, which the 182T's does not.
// ---------------------------------------------------------------------------

interface SourceClimbRow {
  pressureAltitudeFt: number;
  standardTempC?: number;
  climbSpeedKias: number;
  rateOfClimbFpm: number;
  timeMin: number;
  fuelGal: number;
  distanceNm: number;
}

function parseClimbSheet(body: string[]): SourceClimbRow[] {
  const rows: SourceClimbRow[] = [];
  for (const line of body) {
    // Altitude, [temp], KIAS, FPM, minutes, gallons (the one decimal), NM.
    const m = /^\s*(Sea\s+Level|[\d,]+)\s+(?:(-?\d+)\s+)?(\d+)\s+(\d+)\s+(\d+)\s+(\d+\.\d+)\s+(\d+)\s*$/i.exec(line);
    if (!m) continue;
    rows.push({
      pressureAltitudeFt: altitude(m[1]),
      ...(m[2] === undefined ? {} : { standardTempC: Number(m[2]) }),
      climbSpeedKias: Number(m[3]),
      rateOfClimbFpm: Number(m[4]),
      timeMin: Number(m[5]),
      fuelGal: Number(m[6]),
      distanceNm: Number(m[7]),
    });
  }
  return rows;
}

const climbSheets = sheetBodies(book.figures.climbCaption, /TIME,\s+FUEL\s+AND\s+DISTANCE\s+TO\s+CLIMB/i);
const CLIMB_FIELDS = ['climbSpeedKias', 'rateOfClimbFpm', 'timeMin', 'fuelGal', 'distanceNm'] as const;

for (const { sheet, label, rows: transcribed } of book.climb) {
  const found = climbSheets.find((c) => c.key === sheet) ?? (climbSheets.length === 1 ? climbSheets[0] : undefined);
  if (!found) {
    failures.push(`${label}: climb sheet ${sheet} not found in the source`);
    continue;
  }
  const rows = parseClimbSheet(found.body);
  for (const mine of transcribed) {
    const theirs = rows.find((r) => r.pressureAltitudeFt === mine.pressureAltitudeFt);
    if (!theirs) {
      failures.push(`${label} ${mine.pressureAltitudeFt} ft: row not in the source`);
      continue;
    }
    for (const field of CLIMB_FIELDS) {
      compare(`${label} ${mine.pressureAltitudeFt} ft ${field}`, mine[field], theirs[field]);
    }
    if (mine.standardTempC !== undefined || theirs.standardTempC !== undefined) {
      compare(
        `${label} ${mine.pressureAltitudeFt} ft standard temperature`,
        mine.standardTempC ?? null,
        theirs.standardTempC ?? null
      );
    }
  }
  for (const theirs of rows) {
    if (!transcribed.some((m) => m.pressureAltitudeFt === theirs.pressureAltitudeFt)) {
      failures.push(`${label} ${theirs.pressureAltitudeFt} ft: in the source but not transcribed`);
    }
  }
}

// ---------------------------------------------------------------------------
// Section 2 weight, CG and baggage limits. The CG range is stated in prose, so
// these are pattern matches against that prose rather than a table parse.
// ---------------------------------------------------------------------------

/**
 * The limits prose, as two windows rather than the whole document: the
 * WEIGHT LIMITS block (with the baggage NOTE beneath it) and the CENTER OF
 * GRAVITY LIMITS block.
 *
 * Windowing matters because the 172S states every limit twice, once for
 * normal category and once for utility, and only the normal-category numbers
 * are modelled. Searching the whole document would find whichever came first.
 * The headings also appear in the table of contents as dotted leader lines,
 * so only a line that is the heading on its own counts.
 */
function limitsWindow(heading: RegExp, maxLines: number): string[] {
  const at = lines.findIndex((l) => heading.test(l.trim()));
  if (at < 0) return [];
  const window = lines.slice(at, at + maxLines);
  if (!book.limitsEndMarker) return window;
  const stop = window.findIndex((l, i) => i > 0 && book.limitsEndMarker!.test(l));
  return stop < 0 ? window : window.slice(0, stop);
}

const text = [
  ...limitsWindow(/^WEIGHT\s+LIMITS$/i, 40),
  '',
  ...limitsWindow(/^CENTER\s+OF\s+GRAVITY\s+LIMITS$/i, 30),
  '',
].join('\n');

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

// The document number pins the comparison to the right book: running the
// 172S data against the 182T text would otherwise fail in confusing ways.
if (!lines.some((l) => l.includes(book.documentNumber))) {
  console.error(`${path} does not mention ${book.documentNumber} — is this the ${book.label} book?`);
  process.exit(2);
}

expectPhrase('max ramp weight', /Maximum\s+Ramp\s+Weight[^\d]*([\d,]+)\s*(?:Pounds|lbs)/i, book.weights.maxRampWeightLbs);
expectPhrase('max takeoff weight', /Maximum\s+Takeoff\s+Weight[^\d]*([\d,]+)\s*(?:Pounds|lbs)/i, book.weights.maxTakeoffWeightLbs);
expectPhrase('max landing weight', /Maximum\s+Landing\s+Weight[^\d]*([\d,]+)\s*(?:Pounds|lbs)/i, book.weights.maxLandingWeightLbs);

// The forward limit is a chain of "N inches aft of datum at W pounds"
// clauses; read every pair in that paragraph rather than assuming a count.
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
    const point = book.cgEnvelope.find((p) => p.weightLbs === weightLbs);
    if (!point) {
      failures.push(`CG envelope: source states a forward limit at ${weightLbs} lb but no such point is transcribed`);
      continue;
    }
    compare(`CG forward limit at ${weightLbs} lb`, point.forwardArmIn, forwardArmIn);
  }
  for (const point of book.cgEnvelope) {
    if (!stated.some((v) => v.weightLbs === point.weightLbs)) {
      failures.push(`CG envelope: ${point.weightLbs} lb is transcribed but the source states no forward limit there`);
    }
  }
}

const aft = /Aft:\s*([\d.]+)\s*inches\s+aft\s+of\s+datum\s+at\s+all\s+weights/i.exec(text);
if (!aft) {
  failures.push('CG aft limit: could not find the Section 2 statement in the source');
} else {
  for (const point of book.cgEnvelope) {
    compare(`CG aft limit at ${point.weightLbs} lb`, point.aftArmIn, Number(aft[1]));
  }
}

// Baggage areas: per-area limit and station span from the Weight Limits list,
// and the combined limits from the NOTE printed beneath it.
for (const area of book.baggage.areas) {
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

for (const combo of book.baggage.combined) {
  const areas = combo.areaIds.map((id) => id.replace('baggage-', '').toUpperCase());
  const list = areas.length > 2 ? `${areas.slice(0, -1).join(',\\s*')}\\s+and\\s+${areas[areas.length - 1]}` : areas.join('\\s+and\\s+');
  expectPhrase(
    `combined baggage ${areas.join('+')} limit`,
    new RegExp(`combined[^.]*?capacity\\s+for\\s+baggage\\s+in\\s+areas\\s+${list}\\s+is\\s+([\\d,]+)\\s*pounds`, 'is'),
    combo.maxWeightLbs
  );
}

// ---------------------------------------------------------------------------

console.log(`${book.label} (${book.documentNumber}) against ${path}`);
console.log(
  `Cruise: ${cruiseSheets} sheets, ${cruiseByAltitude.size} pressure altitudes, ${cruiseCells} cells compared.`
);
console.log(`Takeoff: ${takeoffSheets.length} sheets. Landing: ${landingSheets.length} sheet(s).`);
console.log(`Climb: ${climbSheets.length} sheets. Section 2 weight, CG and baggage limits checked.`);
console.log(`${numbersCompared} printed numbers compared in total.`);
if (book.corrections.length > 0) {
  console.log(
    `\n${book.corrections.length} declared correction(s) compared against the PRINTED value, not the stored one:`
  );
  for (const c of book.corrections) {
    console.log(`  page ${c.page} ${c.table} ${c.weightLbs} lb ${c.altitudeFt} ft ${c.oatC}°C ${c.field}: book prints ${c.printedValue}, app stores ${c.storedValue}`);
  }
}

if (failures.length > 0) {
  console.error(`\n${failures.length} mismatch(es):`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log('\nEvery transcribed number matches the POH text layer.');
