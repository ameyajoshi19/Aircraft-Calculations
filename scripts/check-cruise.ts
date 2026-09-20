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
  expect('%MCP', solution.percentMcp, 60);
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
  expect('2400 RPM %MCP', at2400.percentMcp, 71);
  expect('2400 RPM KTAS', at2400.ktas, 139);
  near('2400 RPM fuel flow', at2400.gph, 12.3, 0.15);
  expect('2400 RPM target achieved', at2400.targetAchieved, false);
  expect('2400 RPM throttle limited', at2400.limitedBy, 'max-published-power');

  // On AUTO this rule prefers the quietest setting that ties on power. At
  // these conditions 2300 RPM at 21" delivers the same 71%, speed and fuel
  // burn as 2400 at 20.5", so it should win — a better answer, not a worse
  // one, and the reason the RPM differs from the reference app here.
  const auto = solveCruise(c182tCruise, { altitudeFt: 9000, oatC: oat, targetPercentMcp: 75 });
  if (!auto) throw new Error('no solution');
  expect('AUTO %MCP matches the reference app', auto.percentMcp, 71);
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
    targetPercentMcp: 65,
  });
  if (!solution) throw new Error('no solution');
  expect('target achieved', solution.targetAchieved, true);
  expect('%MCP hits target', solution.percentMcp, 65);
  expect('RPM', solution.rpm, 2200);
  near('manifold pressure', solution.manifoldPressureInHg, 20.8, 0.1);

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
        const solution = solveCruise(c182tCruise, { altitudeFt: altitude, oatC: oat, targetPercentMcp: target });
        if (!solution) continue;
        evaluated++;

        if (solution.targetAchieved && Math.abs(solution.percentMcp - target) > 1) {
          problems.push(`${altitude} ft ISA${deviation} target ${target}: claims achieved but gave ${solution.percentMcp}%`);
        }
        if (!solution.targetAchieved && solution.percentMcp > target) {
          problems.push(`${altitude} ft ISA${deviation} target ${target}: reported unachievable yet exceeds target at ${solution.percentMcp}%`);
        }
        if (solution.percentMcp > 80) {
          problems.push(`${altitude} ft ISA${deviation} target ${target}: ${solution.percentMcp}% exceeds the 80% cruise ceiling`);
        }
        if (!(solution.gph > 0) || !(solution.ktas > 0) || !(solution.manifoldPressureInHg > 0)) {
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
      if (previous !== null && solution.percentMcp > previous + 0.5) {
        rising.push(
          `${rpm} RPM: ${previous}% at ${previousAltitude} ft -> ${solution.percentMcp}% at ${altitude} ft`
        );
      }
      previous = solution.percentMcp;
      previousAltitude = altitude;
    }
  }
  if (rising.length === 0) {
    console.log('  none');
  } else {
    for (const r of rising) console.log(`  ~ ${r}`);
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
