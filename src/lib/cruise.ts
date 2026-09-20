/**
 * Cruise solver.
 *
 * The POH tabulates (pressure altitude, temperature, RPM, MP) -> (%MCP,
 * KTAS, GPH). Planning runs that backwards: you know the altitude and
 * temperature, you want a power setting, and you need the RPM, manifold
 * pressure and fuel flow to dial in.
 *
 * The part that makes this non-trivial is that the published manifold
 * pressure range shrinks with altitude — 2400 RPM reaches 21" at 8000 ft but
 * only 20" at 10,000 ft — so a target power that is available down low may
 * simply not be on the chart higher up. Where that happens the honest answer
 * is the best setting the POH publishes, flagged as such, not an
 * extrapolation past the end of the table.
 *
 * Note this deliberately does NOT claim to model the full-throttle ceiling.
 * The top of a published column is not necessarily attainable: at 10,000 ft
 * the book lists 2300 RPM at 21", but ambient pressure there is about
 * 20.6 inHg, so a normally aspirated engine cannot make it. Those rows are
 * tabulated to aid interpolation, exactly like the settings above 80% MCP.
 * What this solver reports is the highest power the POH publishes for the
 * conditions; whether the throttle is against the stop is something the
 * pilot can see and this table cannot say.
 */
import { interpolate1D, lerp } from './interpolation.ts';
import type { CruiseAltitudeBlock, CruiseCell } from '../data/poh/types.ts';

/** Normal cruise band from Section 4: 55% to 80% of rated MCP. */
export const MIN_CRUISE_PERCENT_MCP = 55;
export const MAX_CRUISE_PERCENT_MCP = 80;

export interface CruiseSetting {
  rpm: number;
  manifoldPressureInHg: number;
  percentMcp: number;
  ktas: number;
  gph: number;
}

export interface CruiseSolution extends CruiseSetting {
  targetPercentMcp: number;
  /** False when the aircraft cannot reach the target at this altitude. */
  targetAchieved: boolean;
  /** Present only when the target was missed: the table has nothing higher. */
  limitedBy?: 'max-published-power';
}

interface Sample {
  mp: number;
  percentMcp: number;
  ktas: number;
  gph: number;
}

/**
 * Reads one altitude sheet at a given RPM and outside air temperature,
 * returning every manifold pressure the sheet publishes, lowest first.
 * Rows whose bracketing temperature columns are blank ("---" in the book)
 * are dropped rather than extrapolated.
 */
function samplesForBlock(block: CruiseAltitudeBlock, rpm: number, oatC: number): Sample[] {
  const { cold, std, hot } = block.tempsC;

  const atTemp = (row: readonly [number, number, CruiseCell, CruiseCell, CruiseCell]): Sample | null => {
    const [, mp, coldCell, stdCell, hotCell] = row;

    const pick = (a: CruiseCell, b: CruiseCell, aT: number, bT: number): Sample | null => {
      if (!a || !b) return null;
      const t = Math.min(Math.max((oatC - aT) / (bT - aT), 0), 1);
      return {
        mp,
        percentMcp: lerp(t, 0, a[0], 1, b[0]),
        ktas: lerp(t, 0, a[1], 1, b[1]),
        gph: lerp(t, 0, a[2], 1, b[2]),
      };
    };

    if (oatC <= cold) return coldCell ? { mp, percentMcp: coldCell[0], ktas: coldCell[1], gph: coldCell[2] } : null;
    if (oatC >= hot) return hotCell ? { mp, percentMcp: hotCell[0], ktas: hotCell[1], gph: hotCell[2] } : null;
    return oatC <= std ? pick(coldCell, stdCell, cold, std) : pick(stdCell, hotCell, std, hot);
  };

  return block.rows
    .filter((row) => row[0] === rpm)
    .map(atTemp)
    .filter((s): s is Sample => s !== null)
    .sort((a, b) => a.mp - b.mp);
}

/**
 * Evaluates one altitude sheet at a requested manifold pressure, clamping to
 * that sheet's own published range. Passing Infinity asks for full throttle.
 */
function evaluateBlock(block: CruiseAltitudeBlock, rpm: number, oatC: number, requestedMp: number): Sample | null {
  const samples = samplesForBlock(block, rpm, oatC);
  if (samples.length === 0) return null;

  const mp = Math.min(Math.max(requestedMp, samples[0].mp), samples[samples.length - 1].mp);
  const on = (key: 'percentMcp' | 'ktas' | 'gph') =>
    interpolate1D(mp, samples.map((s) => ({ x: s.mp, y: s[key] })));

  return { mp, percentMcp: on('percentMcp'), ktas: on('ktas'), gph: on('gph') };
}

/**
 * Evaluates at an arbitrary altitude by reading the two bracketing sheets and
 * interpolating between them.
 *
 * Each sheet is clamped to its OWN manifold pressure ceiling before the two
 * are combined. That is what makes full throttle come out right: at 9000 ft
 * the aircraft is between the 21" it can pull at 8000 ft and the 20" at
 * 10,000 ft, so the result is a genuine 20.5" operating point rather than a
 * figure read at an MP one of the sheets never publishes.
 */
function evaluate(
  blocks: CruiseAltitudeBlock[],
  rpm: number,
  altitudeFt: number,
  oatC: number,
  requestedMp: number
): Sample | null {
  const sorted = [...blocks].sort((a, b) => a.pressureAltitudeFt - b.pressureAltitudeFt);
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

  const low = evaluateBlock(lower, rpm, oatC, requestedMp);
  const high = evaluateBlock(upper, rpm, oatC, requestedMp);
  if (!low || !high) return low ?? high;
  if (lower.pressureAltitudeFt === upper.pressureAltitudeFt) return low;

  const x0 = lower.pressureAltitudeFt;
  const x1 = upper.pressureAltitudeFt;
  return {
    mp: lerp(clamped, x0, low.mp, x1, high.mp),
    percentMcp: lerp(clamped, x0, low.percentMcp, x1, high.percentMcp),
    ktas: lerp(clamped, x0, low.ktas, x1, high.ktas),
    gph: lerp(clamped, x0, low.gph, x1, high.gph),
  };
}

/** The RPM values the POH tabulates, lowest first. */
export function availableRpms(blocks: CruiseAltitudeBlock[]): number[] {
  return [...new Set(blocks.flatMap((b) => b.rows.map((r) => r[0])))].sort((a, b) => a - b);
}

/**
 * The range of manifold pressures worth *requesting* at this RPM and
 * temperature, across every sheet.
 *
 * This is deliberately not the interpolated MP that comes back from
 * `evaluate`. Each sheet clamps a request to its own ceiling, so the value
 * returned for an altitude between sheets is a blend that is lower than at
 * least one sheet's ceiling. Searching up to that blended figure would stop
 * short of full throttle and silently under-deliver power; searching up to
 * the highest MP any sheet publishes saturates both sheets, which is exactly
 * what asking for Infinity does.
 */
function requestBounds(
  blocks: CruiseAltitudeBlock[],
  rpm: number,
  oatC: number
): { min: number; max: number } | null {
  const mps = blocks.flatMap((b) => samplesForBlock(b, rpm, oatC).map((s) => s.mp));
  if (mps.length === 0) return null;
  return { min: Math.min(...mps), max: Math.max(...mps) };
}

/**
 * Finds the setting at one RPM that comes closest to the target power.
 * Returns the full-throttle setting, flagged, when the target is out of reach.
 */
export function solveAtRpm(
  blocks: CruiseAltitudeBlock[],
  rpm: number,
  altitudeFt: number,
  oatC: number,
  targetPercentMcp: number
): CruiseSolution | null {
  const fullThrottle = evaluate(blocks, rpm, altitudeFt, oatC, Infinity);
  if (!fullThrottle) return null;

  const target = Math.min(targetPercentMcp, MAX_CRUISE_PERCENT_MCP);

  if (fullThrottle.percentMcp <= target) {
    return { ...toSetting(rpm, fullThrottle), targetPercentMcp, targetAchieved: false, limitedBy: 'max-published-power' };
  }

  const lowest = evaluate(blocks, rpm, altitudeFt, oatC, -Infinity);
  if (lowest && lowest.percentMcp >= target) {
    // Even the lowest published MP exceeds the target; that row is the closest.
    return { ...toSetting(rpm, lowest), targetPercentMcp, targetAchieved: false };
  }

  const bounds = requestBounds(blocks, rpm, oatC);
  if (!bounds) return null;

  // Bisect on the REQUESTED manifold pressure. %MCP rises monotonically with
  // MP, which the transcription checker verifies, so this converges.
  let lo = bounds.min;
  let hi = bounds.max;
  let best = fullThrottle;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const sample = evaluate(blocks, rpm, altitudeFt, oatC, mid);
    if (!sample) break;
    best = sample;
    if (sample.percentMcp < target) lo = mid;
    else hi = mid;
  }

  // Trust the converged figure rather than the fact that a search ran: if it
  // did not land on the target, say so instead of reporting a miss as a hit.
  const achieved = Math.abs(best.percentMcp - target) <= 0.5;
  return {
    ...toSetting(rpm, best),
    targetPercentMcp,
    targetAchieved: achieved,
    ...(achieved ? {} : { limitedBy: 'max-published-power' as const }),
  };
}

function toSetting(rpm: number, sample: Sample): CruiseSetting {
  return {
    rpm,
    manifoldPressureInHg: Math.round(sample.mp * 10) / 10,
    percentMcp: Math.round(sample.percentMcp),
    ktas: Math.round(sample.ktas),
    gph: Math.round(sample.gph * 10) / 10,
  };
}

/**
 * Picks the setting for a target power, choosing the RPM when one is not
 * pinned.
 *
 * With RPM on AUTO this takes the LOWEST RPM that can actually reach the
 * target, following the POH's guidance on page 4-34 to prefer the lowest RPM
 * in the green arc for a given percent power. When no RPM can reach it — the
 * aircraft is throttle-limited — it returns whichever comes closest, which
 * will be the highest RPM.
 */
export function solveCruise(
  blocks: CruiseAltitudeBlock[],
  options: { altitudeFt: number; oatC: number; targetPercentMcp: number; rpm?: number }
): CruiseSolution | null {
  const { altitudeFt, oatC, targetPercentMcp, rpm } = options;

  if (rpm !== undefined) {
    return solveAtRpm(blocks, rpm, altitudeFt, oatC, targetPercentMcp);
  }

  const solutions = availableRpms(blocks)
    .map((r) => solveAtRpm(blocks, r, altitudeFt, oatC, targetPercentMcp))
    .filter((s): s is CruiseSolution => s !== null);

  if (solutions.length === 0) return null;

  const achieving = solutions.filter((s) => s.targetAchieved);
  if (achieving.length > 0) return achieving[0]; // availableRpms is sorted ascending

  // Throttle-limited: take whichever gets closest. Ties go to the lower RPM —
  // when two settings deliver the same power, the quieter one wins. Strict `<`
  // over an ascending list gives exactly that.
  return solutions.reduce((best, s) =>
    Math.abs(s.percentMcp - targetPercentMcp) < Math.abs(best.percentMcp - targetPercentMcp) ? s : best
  );
}
