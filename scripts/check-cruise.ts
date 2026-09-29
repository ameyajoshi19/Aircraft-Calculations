/**
 * Cruise solver checks.
 *
 * The two reference cases come from screenshots of a separate C182 cruise
 * app the owner already flies with, so they are independent of both this
 * code and this transcription. If the solver reproduces them from the
 * transcribed POH, the table reading, the temperature interpolation and the
 * published-ceiling model are all behaving.
 *
 * Run: npm run check:cruise
 */
import { c182tCruise } from '../src/data/poh/c182t-cruise.ts';
import { aircraftProfiles } from '../src/data/aircraft-profiles.ts';
import type { CruiseTable, FixedPitchCruiseRow } from '../src/data/poh/types.ts';
import { availableRpms, solveAtRpm, solveCruise } from '../src/lib/cruise.ts';

const ISA_SEA_LEVEL_C = 15;
const LAPSE_C_PER_1000FT = 1.98;
const oatForIsaDeviation = (altitudeFt: number, deviation: number) =>
  ISA_SEA_LEVEL_C - (altitudeFt / 1000) * LAPSE_C_PER_1000FT + deviation;

const problems: string[] = [];
let checks = 0;

function expect(label: string, actual: unknown, wanted: unknown) {
  checks++;
  const ok = actual === wanted;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}: ${actual}${ok ? '' : ` (expected ${wanted})`}`);
  if (!ok) problems.push(`${label}: got ${actual}, expected ${wanted}`);
}

function near(label: string, actual: number, wanted: number, tolerance: number) {
  checks++;
  const ok = Math.abs(actual - wanted) <= tolerance;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}: ${actual}${ok ? '' : ` (expected ~${wanted} ±${tolerance})`}`);
  if (!ok) problems.push(`${label}: got ${actual}, expected ~${wanted} ±${tolerance}`);
}

// --- Reference case 1: 8000 ft, ISA+0, 2000 RPM at the top of its column ------------
// The reference app showed MP 21.0, 60% MCP, 127 KTAS, 10.7 gph. This is a
// direct hit on a printed cell, so it also re-verifies the transcription.
console.log('\n8000 ft, ISA+0, 2000 RPM (reference app: 21.0", 60%, 127 kt, 10.7 gph)');
{
  const solution = solveAtRpm(c182tCruise, 2000, 8000, oatForIsaDeviation(8000, 0), 80);
  if (!solution) throw new Error('no solution');
  expect('manifold pressure', solution.manifoldPressureInHg, 21);
  expect('percent power', solution.percentPower, 60);
  expect('KTAS', solution.ktas, 127);
  expect('fuel flow', solution.gph, 10.7);
  expect('throttle limited', solution.limitedBy, 'max-published-power');
}

// --- Reference case 2: 9000 ft, ISA-5, target 75% ---------------------------
// The reference app showed 2400 RPM, MP 20.5, 71% MCP, 139 KTAS, 12.3 gph.
// Nothing here is a printed cell: 9000 ft falls between sheets, ISA-5 falls
// between temperature columns, and 20.5" is the interpolated top-of-column
// MP between 21" at 8000 ft and 20" at 10,000 ft.
console.log('\n9000 ft, ISA-5, target 75% (reference app: 2400 RPM, 20.5", 71%, 139 kt, 12.3 gph)');
{
  const oat = oatForIsaDeviation(9000, -5);

  // At 2400 RPM the answer should match the reference app exactly. 20.5" is
  // the published ceiling interpolated between 21" at 8000 ft and 20" at
  // 10,000 ft — no printed cell says 20.5, so this exercises the whole chain.
  const at2400 = solveAtRpm(c182tCruise, 2400, 9000, oat, 75);
  if (!at2400) throw new Error('no solution');
  expect('2400 RPM manifold pressure', at2400.manifoldPressureInHg, 20.5);
  expect('2400 RPM percent power', at2400.percentPower, 71);
  expect('2400 RPM KTAS', at2400.ktas, 139);
  near('2400 RPM fuel flow', at2400.gph, 12.3, 0.15);
  expect('2400 RPM target achieved', at2400.targetAchieved, false);
  expect('2400 RPM throttle limited', at2400.limitedBy, 'max-published-power');

  // On AUTO this rule prefers the quietest setting that ties on power. At
  // these conditions 2300 RPM at 21" delivers the same 71%, speed and fuel
  // burn as 2400 at 20.5", so it should win — a better answer, not a worse
  // one, and the reason the RPM differs from the reference app here.
  const auto = solveCruise(c182tCruise, { altitudeFt: 9000, oatC: oat, targetPercentPower: 75 });
  if (!auto) throw new Error('no solution');
  expect('AUTO percent power matches the reference app', auto.percentPower, 71);
  expect('AUTO KTAS matches', auto.ktas, at2400.ktas);
  expect('AUTO picks the quieter equivalent', auto.rpm <= 2400, true);
  expect('AUTO burns no more fuel for it', auto.gph <= at2400.gph, true);
  expect('AUTO reports the target as unreachable', auto.targetAchieved, false);
}

// --- The AUTO rule --------------------------------------------------------
console.log('\n8000 ft, ISA+0, target 65% on AUTO (lowest RPM that reaches it)');
{
  const solution = solveCruise(c182tCruise, {
    altitudeFt: 8000,
    oatC: oatForIsaDeviation(8000, 0),
    targetPercentPower: 65,
  });
  if (!solution) throw new Error('no solution');
  expect('target achieved', solution.targetAchieved, true);
  expect('percent power hits target', solution.percentPower, 65);
  expect('RPM', solution.rpm, 2200);
  expect('has a manifold pressure', solution.manifoldPressureInHg !== undefined, true);
  near('manifold pressure', solution.manifoldPressureInHg ?? NaN, 20.8, 0.1);

  // Nothing quieter can do it: every lower RPM must fall short.
  for (const rpm of availableRpms(c182tCruise).filter((r) => r < solution.rpm)) {
    const lower = solveAtRpm(c182tCruise, rpm, 8000, oatForIsaDeviation(8000, 0), 65);
    expect(`${rpm} RPM cannot reach 65%`, lower?.targetAchieved, false);
  }
}

// --- Invariants across the envelope ---------------------------------------
console.log('\nInvariants across the cruise envelope');
{
  let evaluated = 0;
  for (let altitude = 0; altitude <= 14000; altitude += 500) {
    for (const deviation of [-20, -10, 0, 10, 20]) {
      const oat = oatForIsaDeviation(altitude, deviation);
      for (const target of [55, 60, 65, 70, 75, 80]) {
        const solution = solveCruise(c182tCruise, { altitudeFt: altitude, oatC: oat, targetPercentPower: target });
        if (!solution) continue;
        evaluated++;

        if (solution.targetAchieved && Math.abs(solution.percentPower - target) > 1) {
          problems.push(`${altitude} ft ISA${deviation} target ${target}: claims achieved but gave ${solution.percentPower}%`);
        }
        if (!solution.targetAchieved && solution.percentPower > target) {
          problems.push(`${altitude} ft ISA${deviation} target ${target}: reported unachievable yet exceeds target at ${solution.percentPower}%`);
        }
        if (solution.percentPower > c182tCruise.maxCruisePercentPower) {
          problems.push(
            `${altitude} ft ISA${deviation} target ${target}: ${solution.percentPower}% exceeds the ${c182tCruise.maxCruisePercentPower}% cruise ceiling`
          );
        }
        if (!(solution.gph > 0) || !(solution.ktas > 0) || !((solution.manifoldPressureInHg ?? 0) > 0)) {
          problems.push(`${altitude} ft ISA${deviation} target ${target}: produced a non-positive figure`);
        }
      }
    }
  }
  checks += evaluated;
  console.log(`  ok   ${evaluated} settings solved across the envelope`);
}

// Where the highest published power RISES with altitude at a fixed RPM.
//
// This is reported, not failed. It is not necessarily an error: at a fixed
// MP and RPM, power genuinely increases a little with altitude as exhaust
// back-pressure falls, so when the top of a column stays at the same MP
// across two sheets the published maximum can tick upward. It is still worth
// listing, because a transcription slip in the top row of a sheet would look
// exactly the same, and these are the rows to re-check first.
console.log('\nReview: highest published power rising with altitude');
{
  const rising: string[] = [];
  for (const rpm of availableRpms(c182tCruise)) {
    let previous: number | null = null;
    let previousAltitude = 0;
    for (let altitude = 0; altitude <= 14000; altitude += 1000) {
      const solution = solveAtRpm(c182tCruise, rpm, altitude, oatForIsaDeviation(altitude, 0), 200);
      if (!solution) continue;
      checks++;
      if (previous !== null && solution.percentPower > previous + 0.5) {
        rising.push(
          `${rpm} RPM: ${previous}% at ${previousAltitude} ft -> ${solution.percentPower}% at ${altitude} ft`
        );
      }
      previous = solution.percentPower;
      previousAltitude = altitude;
    }
  }
  if (rising.length === 0) {
    console.log('  none');
  } else {
    for (const r of rising) console.log(`  ~ ${r}`);
  }
}

// --- The fixed-pitch path -------------------------------------------------
// A hand-built table, not a real book: the point is to pin down the solver's
// behaviour where the arithmetic is simple enough to work out by eye. Power
// here is linear in RPM — 50% at 2200, 60% at 2400, 70% at 2600 — so the RPM
// for any target in between is obvious, and so is what the solver should say
// when the target is outside the table.
console.log('\nFixed-pitch solver (hand-built table, exact answers)');
{
  const rows: FixedPitchCruiseRow[] = [
    [2200, [55, 95, 5.5], [50, 90, 5.0], [45, 85, 4.5]],
    [2400, [65, 105, 6.5], [60, 100, 6.0], [55, 95, 5.5]],
    [2600, [75, 115, 7.5], [70, 110, 7.0], [65, 105, 6.5]],
  ];
  const table: CruiseTable = {
    propeller: 'fixed-pitch',
    maxCruisePercentPower: 70,
    percentPowerLabel: 'BHP',
    blocks: [
      { pressureAltitudeFt: 2000, tempsC: { cold: -20, std: 0, hot: 20 }, rows },
      { pressureAltitudeFt: 4000, tempsC: { cold: -20, std: 0, hot: 20 }, rows },
    ],
  };
  const at = (targetPercentPower: number, rpm?: number) =>
    solveCruise(table, { altitudeFt: 2000, oatC: 0, targetPercentPower, rpm });

  // 65% sits exactly halfway between the 2400 and 2600 rows.
  const mid = at(65);
  if (!mid) throw new Error('no solution');
  expect('65% solves to 2500 RPM', mid.rpm, 2500);
  expect('65% is achieved', mid.targetAchieved, true);
  expect('65% reports 65%', mid.percentPower, 65);
  expect('65% interpolates KTAS', mid.ktas, 105);
  expect('65% interpolates fuel flow', mid.gph, 6.5);
  expect('fixed-pitch reports no manifold pressure', mid.manifoldPressureInHg, undefined);

  // Below the lowest published RPM there is nothing to interpolate to.
  const low = at(40);
  if (!low) throw new Error('no solution');
  expect('40% clamps to the lowest published RPM', low.rpm, 2200);
  expect('40% is not achieved', low.targetAchieved, false);

  // Above the table's own maximum cruise power the request is capped, and
  // saying "achieved" there would claim the pilot got what they asked for.
  const over = at(75);
  if (!over) throw new Error('no solution');
  expect('75% is not achieved past the 70% cap', over.targetAchieved, false);
  expect('75% says why', over.limitedBy, 'max-cruise-power');
  expect('75% still reports the asked-for target', over.targetPercentPower, 75);
  expect('75% gives the capped setting', over.percentPower, 70);

  // A pinned RPM is the pilot's choice: undershooting the target is a table
  // limit, overshooting it is not.
  const pinnedLow = at(65, 2400);
  if (!pinnedLow) throw new Error('no solution');
  expect('pinned 2400 gives 60%', pinnedLow.rpm, 2400);
  expect('pinned 2400 falls short of 65%', pinnedLow.targetAchieved, false);
  expect('pinned 2400 is flagged as limited', pinnedLow.limitedBy, 'max-published-power');

  const pinnedHigh = at(55, 2600);
  if (!pinnedHigh) throw new Error('no solution');
  expect('pinned 2600 gives 70%', pinnedHigh.percentPower, 70);
  expect('pinned 2600 overshoots rather than being limited', pinnedHigh.limitedBy, undefined);

  // Every solved RPM must be one a tachometer can be held to.
  let offStep = 0;
  for (let target = 45; target <= 70; target += 0.5) {
    const solution = at(target);
    if (solution && solution.rpm % 10 !== 0) offStep++;
    checks++;
  }
  expect('solved RPMs are all flyable to 10 RPM', offStep, 0);
}

// --- Presets must stay inside each book's own cruise ceiling ----------------
// A preset above the table's maximum cruise power would offer the pilot a
// setting the book prints only to aid interpolation.
console.log('\nTarget power presets against each aircraft\'s cruise ceiling');
{
  for (const profile of aircraftProfiles) {
    for (const preset of profile.targetPowerPresets) {
      const ok = preset.percentPower <= profile.cruise.maxCruisePercentPower;
      expect(
        `${profile.shortName} "${preset.label}" ${preset.percentPower}% within ${profile.cruise.maxCruisePercentPower}%`,
        ok,
        true
      );
    }
  }
}

console.log(`\nRan ${checks} checks.`);
if (problems.length === 0) {
  console.log('All cruise solver checks passed.');
} else {
  console.error(`\n${problems.length} problem(s):\n`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
