/**
 * Cruise solver.
 *
 * The POH tabulates (pressure altitude, temperature, control settings) ->
 * (percent power, KTAS, GPH). Planning runs that backwards: you know the
 * altitude and temperature, you want a power setting, and you need the
 * settings and fuel flow to dial in.
 *
 * Which control is the continuous one depends on the propeller:
 *
 *   Constant-speed (182T): RPM selects a family of rows; manifold pressure
 *   is the knob that varies power within it.
 *
 *   Fixed-pitch (172S, 162): there is no propeller control and no MP to set.
 *   The throttle is the only knob and RPM is what it reads out, so RPM
 *   itself is the continuous control.
 *
 * Both are solved the same way — interpolate along the continuous control to
 * meet the target — which is why this file talks about a "control" rather
 * than naming one of them.
 *
 * The part that makes this non-trivial is that the published range of that
 * control shrinks with altitude — the 182T's 2400 RPM reaches 21" at 8000 ft
 * but only 20" at 10,000 ft, and the 172S publishes 2100 RPM at 2000 ft but
 * not at 8000 ft — so a target power available down low may simply not be on
 * the chart higher up. Where that happens the honest answer is the best
 * setting the POH publishes, flagged as such, not an extrapolation past the
 * end of the table.
 *
 * Note this deliberately does NOT claim to model the full-throttle ceiling.
 * The top of a published column is not necessarily attainable: at 10,000 ft
 * the 182T book lists 2300 RPM at 21", but ambient pressure there is about
 * 20.6 inHg, so a normally aspirated engine cannot make it. Those rows are
 * tabulated to aid interpolation, exactly like the settings above the
 * maximum cruise power. What this solver reports is the highest power the
 * POH publishes for the conditions; whether the throttle is against the stop
 * is something the pilot can see and this table cannot say.
 */
import { interpolate1D, lerp } from './interpolation.ts';
import type { CruiseAltitudeBlock, CruiseCell, CruiseRow, CruiseTable } from '../data/poh/types.ts';

/**
 * Bottom of the normal cruise band, from Section 4. Both Cessna books put
 * normal cruise at 55% and up; the top of the band differs by aircraft and
 * lives on the cruise table as `maxCruisePercentPower`.
 */
export const MIN_CRUISE_PERCENT_POWER = 55;

/**
 * A fixed-pitch answer is an RPM to hold, so it is rounded to something a
 * tachometer can actually be flown to. The figures reported alongside it are
 * re-read at the rounded value, never at the unrounded one.
 */
const FIXED_PITCH_RPM_STEP = 10;

export interface CruiseSetting {
  rpm: number;
  /** Absent on a fixed-pitch aircraft — there is no manifold pressure to set. */
  manifoldPressureInHg?: number;
  percentPower: number;
  ktas: number;
  gph: number;
}

export interface CruiseSolution extends CruiseSetting {
  /** The power asked for, unchanged — not the capped value actually solved to. */
  targetPercentPower: number;
  /** False when the aircraft cannot reach the target at this altitude. */
  targetAchieved: boolean;
  /**
   * Why the target was missed.
   *
   * `max-cruise-power` means the request was above the book's own maximum
   * cruise power, so it was never solved for: those rows are printed to aid
   * interpolation, not to be flown. `max-published-power` means the table
   * simply has nothing higher at this altitude and temperature.
   */
  limitedBy?: 'max-published-power' | 'max-cruise-power';
}

/**
 * Settings above the book's maximum cruise power are tabulated only to aid
 * interpolation, so a request above it is capped — and saying so matters:
 * reporting the capped figure as the target met would claim the pilot got
 * what they asked for when they did not.
 */
function capped(table: CruiseTable, targetPercentPower: number): { target: number; overCap: boolean } {
  return {
    target: Math.min(targetPercentPower, table.maxCruisePercentPower),
    overCap: targetPercentPower > table.maxCruisePercentPower,
  };
}

/** Applies the cap's verdict on top of whatever the search achieved. */
function withCap(
  solution: CruiseSolution,
  overCap: boolean
): CruiseSolution {
  if (!overCap) return solution;
  return { ...solution, targetAchieved: false, limitedBy: 'max-cruise-power' };
}

/** One row read at one temperature: the control value and what it produces. */
interface Sample {
  control: number;
  percentPower: number;
  ktas: number;
  gph: number;
}

/** The cells of a row, whichever shape it has. */
function cellsOf(row: CruiseRow): [CruiseCell, CruiseCell, CruiseCell] {
  return row.length === 5 ? [row[2], row[3], row[4]] : [row[1], row[2], row[3]];
}

/** The value of the continuous control on this row: MP, or RPM when fixed-pitch. */
function controlOf(row: CruiseRow): number {
  return row.length === 5 ? row[1] : row[0];
}

/**
 * Reads one altitude sheet at a given outside air temperature, returning
 * every control value the sheet publishes, lowest first. On a constant-speed
 * table `rpm` selects the row family; on a fixed-pitch one it is ignored
 * because every row is already a distinct RPM.
 *
 * Rows whose bracketing temperature columns are blank ("---" in the book) are
 * dropped rather than extrapolated.
 */
function samplesForBlock(
  table: CruiseTable,
  block: CruiseAltitudeBlock,
  rpm: number | undefined,
  oatC: number
): Sample[] {
  const { cold, std, hot } = block.tempsC;

  const atTemp = (row: CruiseRow): Sample | null => {
    const control = controlOf(row);
    const [coldCell, stdCell, hotCell] = cellsOf(row);

    const at = (cell: CruiseCell): Sample | null =>
      cell ? { control, percentPower: cell[0], ktas: cell[1], gph: cell[2] } : null;

    const between = (a: CruiseCell, b: CruiseCell, aT: number, bT: number): Sample | null => {
      if (!a || !b) return null;
      const t = Math.min(Math.max((oatC - aT) / (bT - aT), 0), 1);
      return {
        control,
        percentPower: lerp(t, 0, a[0], 1, b[0]),
        ktas: lerp(t, 0, a[1], 1, b[1]),
        gph: lerp(t, 0, a[2], 1, b[2]),
      };
    };

    if (oatC <= cold) return at(coldCell);
    if (oatC >= hot) return at(hotCell);
    return oatC <= std ? between(coldCell, stdCell, cold, std) : between(stdCell, hotCell, std, hot);
  };

  const rows =
    table.propeller === 'constant-speed' ? block.rows.filter((row) => row[0] === rpm) : block.rows;

  return rows
    .map(atTemp)
    .filter((s): s is Sample => s !== null)
    .sort((a, b) => a.control - b.control);
}

/**
 * Evaluates one altitude sheet at a requested control value, clamping to that
 * sheet's own published range. Passing Infinity asks for the top of the sheet.
 */
function evaluateBlock(
  table: CruiseTable,
  block: CruiseAltitudeBlock,
  rpm: number | undefined,
  oatC: number,
  requested: number
): Sample | null {
  const samples = samplesForBlock(table, block, rpm, oatC);
  if (samples.length === 0) return null;

  const control = Math.min(Math.max(requested, samples[0].control), samples[samples.length - 1].control);
  const on = (key: 'percentPower' | 'ktas' | 'gph') =>
    interpolate1D(control, samples.map((s) => ({ x: s.control, y: s[key] })));

  return { control, percentPower: on('percentPower'), ktas: on('ktas'), gph: on('gph') };
}

/**
 * Evaluates at an arbitrary altitude by reading the two bracketing sheets and
 * interpolating between them.
 *
 * Each sheet is clamped to its OWN control ceiling before the two are
 * combined. That is what makes the top of the range come out right: at
 * 9000 ft the 182T is between the 21" it can pull at 8000 ft and the 20" at
 * 10,000 ft, so the result is a genuine 20.5" operating point rather than a
 * figure read at an MP one of the sheets never publishes. The same clamping
 * handles a fixed-pitch table whose RPM rows change from sheet to sheet.
 */
function evaluate(
  table: CruiseTable,
  rpm: number | undefined,
  altitudeFt: number,
  oatC: number,
  requested: number
): Sample | null {
  const sorted = [...table.blocks].sort((a, b) => a.pressureAltitudeFt - b.pressureAltitudeFt);
  const clamped = Math.min(
    Math.max(altitudeFt, sorted[0].pressureAltitudeFt),
    sorted[sorted.length - 1].pressureAltitudeFt
  );

  let lower = sorted[0];
  let upper = sorted[sorted.length - 1];
  for (let i = 0; i < sorted.length - 1; i++) {
    if (clamped >= sorted[i].pressureAltitudeFt && clamped <= sorted[i + 1].pressureAltitudeFt) {
      lower = sorted[i];
      upper = sorted[i + 1];
      break;
    }
  }

  const low = evaluateBlock(table, lower, rpm, oatC, requested);
  const high = evaluateBlock(table, upper, rpm, oatC, requested);
  if (!low || !high) return low ?? high;
  if (lower.pressureAltitudeFt === upper.pressureAltitudeFt) return low;

  const x0 = lower.pressureAltitudeFt;
  const x1 = upper.pressureAltitudeFt;
  return {
    control: lerp(clamped, x0, low.control, x1, high.control),
    percentPower: lerp(clamped, x0, low.percentPower, x1, high.percentPower),
    ktas: lerp(clamped, x0, low.ktas, x1, high.ktas),
    gph: lerp(clamped, x0, low.gph, x1, high.gph),
  };
}

/** The RPM values the POH tabulates, lowest first. */
export function availableRpms(table: CruiseTable): number[] {
  return [...new Set(table.blocks.flatMap((b) => b.rows.map((r) => r[0])))].sort((a, b) => a - b);
}

/**
 * The range of control values worth *requesting* at this RPM and temperature,
 * across every sheet.
 *
 * This is deliberately not the interpolated value that comes back from
 * `evaluate`. Each sheet clamps a request to its own ceiling, so the value
 * returned for an altitude between sheets is a blend that is lower than at
 * least one sheet's ceiling. Searching up to that blended figure would stop
 * short of the top and silently under-deliver power; searching up to the
 * highest value any sheet publishes saturates both sheets, which is exactly
 * what asking for Infinity does.
 */
function requestBounds(
  table: CruiseTable,
  rpm: number | undefined,
  oatC: number
): { min: number; max: number } | null {
  const values = table.blocks.flatMap((b) => samplesForBlock(table, b, rpm, oatC).map((s) => s.control));
  if (values.length === 0) return null;
  return { min: Math.min(...values), max: Math.max(...values) };
}

function toSetting(table: CruiseTable, rpm: number | undefined, sample: Sample): CruiseSetting {
  const rounded = {
    percentPower: Math.round(sample.percentPower),
    ktas: Math.round(sample.ktas),
    gph: Math.round(sample.gph * 10) / 10,
  };
  return table.propeller === 'constant-speed'
    ? { rpm: rpm!, manifoldPressureInHg: Math.round(sample.control * 10) / 10, ...rounded }
    : { rpm: Math.round(sample.control), ...rounded };
}

/**
 * Bisects the continuous control to land on the target power.
 *
 * Percent power rises monotonically with the control on every sheet, which
 * the transcription checker verifies, so this converges.
 */
function search(
  table: CruiseTable,
  rpm: number | undefined,
  altitudeFt: number,
  oatC: number,
  target: number,
  fallback: Sample
): Sample {
  const bounds = requestBounds(table, rpm, oatC);
  if (!bounds) return fallback;

  let lo = bounds.min;
  let hi = bounds.max;
  let best = fallback;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const sample = evaluate(table, rpm, altitudeFt, oatC, mid);
    if (!sample) break;
    best = sample;
    if (sample.percentPower < target) lo = mid;
    else hi = mid;
  }
  return best;
}

/**
 * Finds the setting at one RPM that comes closest to the target power.
 *
 * On a constant-speed table this varies manifold pressure at the RPM given.
 * On a fixed-pitch table the RPM *is* the setting, so there is nothing left
 * to vary: the answer is whatever that RPM produces, and the target is either
 * met by it or not.
 */
export function solveAtRpm(
  table: CruiseTable,
  rpm: number,
  altitudeFt: number,
  oatC: number,
  targetPercentPower: number
): CruiseSolution | null {
  const { target, overCap } = capped(table, targetPercentPower);

  if (table.propeller === 'fixed-pitch') {
    const atRpm = evaluate(table, undefined, altitudeFt, oatC, rpm);
    if (!atRpm) return null;
    const setting = toSetting(table, undefined, atRpm);
    const achieved = Math.abs(setting.percentPower - target) <= 0.5;
    return withCap(
      {
        ...setting,
        targetPercentPower,
        targetAchieved: achieved,
        // Only call it a table limit when the setting cannot reach the target;
        // a pinned RPM that simply overshoots is the pilot's choice, not a limit.
        ...(achieved || setting.percentPower > target ? {} : { limitedBy: 'max-published-power' as const }),
      },
      overCap
    );
  }

  const fullThrottle = evaluate(table, rpm, altitudeFt, oatC, Infinity);
  if (!fullThrottle) return null;

  if (fullThrottle.percentPower <= target) {
    return withCap(
      {
        ...toSetting(table, rpm, fullThrottle),
        targetPercentPower,
        targetAchieved: false,
        limitedBy: 'max-published-power',
      },
      overCap
    );
  }

  const lowest = evaluate(table, rpm, altitudeFt, oatC, -Infinity);
  if (lowest && lowest.percentPower >= target) {
    // Even the lowest published MP exceeds the target; that row is the closest.
    return withCap(
      { ...toSetting(table, rpm, lowest), targetPercentPower, targetAchieved: false },
      overCap
    );
  }

  const best = search(table, rpm, altitudeFt, oatC, target, fullThrottle);
  const setting = toSetting(table, rpm, best);

  // Trust the converged figure rather than the fact that a search ran: if it
  // did not land on the target, say so instead of reporting a miss as a hit.
  const achieved = Math.abs(best.percentPower - target) <= 0.5;
  return withCap(
    {
      ...setting,
      targetPercentPower,
      targetAchieved: achieved,
      ...(achieved ? {} : { limitedBy: 'max-published-power' as const }),
    },
    overCap
  );
}

/**
 * Picks the setting for a target power, choosing the RPM when one is not
 * pinned.
 *
 * On a fixed-pitch table RPM is the only control, so this solves for the RPM
 * that makes the target power and rounds it to something a tachometer can be
 * held to — then re-reads the table at that rounded RPM, so the power, speed
 * and fuel flow reported are the ones the stated setting actually produces.
 *
 * On a constant-speed table, with RPM on AUTO, this takes the LOWEST RPM that
 * can actually reach the target, following the POH's guidance on page 4-34 to
 * prefer the lowest RPM in the green arc for a given percent power. When no
 * RPM can reach it — the aircraft is throttle-limited — it returns whichever
 * comes closest, which will be the highest RPM.
 */
export function solveCruise(
  table: CruiseTable,
  options: { altitudeFt: number; oatC: number; targetPercentPower: number; rpm?: number }
): CruiseSolution | null {
  const { altitudeFt, oatC, targetPercentPower, rpm } = options;

  if (table.propeller === 'fixed-pitch') {
    if (rpm !== undefined) return solveAtRpm(table, rpm, altitudeFt, oatC, targetPercentPower);

    const { target, overCap } = capped(table, targetPercentPower);
    const top = evaluate(table, undefined, altitudeFt, oatC, Infinity);
    if (!top) return null;
    if (top.percentPower <= target) {
      return withCap(
        {
          ...toSetting(table, undefined, top),
          targetPercentPower,
          targetAchieved: false,
          limitedBy: 'max-published-power',
        },
        overCap
      );
    }

    const bottom = evaluate(table, undefined, altitudeFt, oatC, -Infinity);
    if (bottom && bottom.percentPower >= target) {
      return withCap(
        { ...toSetting(table, undefined, bottom), targetPercentPower, targetAchieved: false },
        overCap
      );
    }

    const exact = search(table, undefined, altitudeFt, oatC, target, top);
    const flyable = Math.round(exact.control / FIXED_PITCH_RPM_STEP) * FIXED_PITCH_RPM_STEP;
    const atFlyable = evaluate(table, undefined, altitudeFt, oatC, flyable) ?? exact;
    const setting = toSetting(table, undefined, atFlyable);
    const achieved = Math.abs(setting.percentPower - target) <= 0.5;
    return withCap(
      {
        ...setting,
        targetPercentPower,
        targetAchieved: achieved,
        ...(achieved ? {} : { limitedBy: 'max-published-power' as const }),
      },
      overCap
    );
  }

  if (rpm !== undefined) return solveAtRpm(table, rpm, altitudeFt, oatC, targetPercentPower);

  const solutions = availableRpms(table)
    .map((r) => solveAtRpm(table, r, altitudeFt, oatC, targetPercentPower))
    .filter((s): s is CruiseSolution => s !== null);

  if (solutions.length === 0) return null;

  const achieving = solutions.filter((s) => s.targetAchieved);
  if (achieving.length > 0) return achieving[0]; // availableRpms is sorted ascending

  // Throttle-limited: take whichever gets closest. Ties go to the lower RPM —
  // when two settings deliver the same power, the quieter one wins. Strict `<`
  // over an ascending list gives exactly that.
  return solutions.reduce((best, s) =>
    Math.abs(s.percentPower - targetPercentPower) < Math.abs(best.percentPower - targetPercentPower) ? s : best
  );
}
