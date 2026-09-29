/**
 * Stand-in tables for aircraft whose POH has not been transcribed yet.
 *
 * Every number these produce is synthetic — smooth curves shaped to look
 * like a plausible normally-aspirated single, nothing more. They exist so
 * the app has something interpolatable to exercise before real data
 * arrives, and they are emitted in the same shape as a real transcription
 * so there is only ever one code path. Any profile built on them must set
 * `dataSource: 'placeholder'`, which makes every screen warn.
 *
 * Delete the caller, not this file's shape, when a real POH lands.
 */
import type {
  ConstantSpeedCruiseRow,
  CruiseAltitudeBlock,
  CruiseTable,
  FieldRow,
  FieldWeightBlock,
  FixedPitchCruiseRow,
} from './poh/types.ts';

export interface CruiseSeed {
  altitudesFt: number[];
  /** Standard temperature at sea level falls 2°C per 1000 ft, as POH sheets round it. */
  rpms: number[];
  /**
   * Omit for a fixed-pitch aircraft. A real fixed-pitch table has no manifold
   * pressure column at all, so the generated one must not invent one.
   */
  manifoldPressures?: number[];
  /** Percent power produced at the lowest RPM and lowest MP on a standard day at sea level. */
  basePercentPower: number;
  baseKtas: number;
  baseGph: number;
  maxCruisePercentPower: number;
  percentPowerLabel: 'MCP' | 'BHP';
}

export function generatePlaceholderCruise(seed: CruiseSeed): CruiseTable {
  const cell = (
    step: number,
    rpmStep: number,
    pressureAltitudeFt: number,
    temperatureOffset: number
  ): [number, number, number] => [
    Math.round(seed.basePercentPower + step * 4 + rpmStep * 3 - temperatureOffset * 0.15),
    Math.round(seed.baseKtas + step * 4 + rpmStep * 2 + pressureAltitudeFt / 1000),
    Math.round((seed.baseGph + step * 0.6 + rpmStep * 0.4 - temperatureOffset * 0.02) * 10) / 10,
  ];

  const tempsFor = (pressureAltitudeFt: number) => {
    const stdTemp = 15 - (pressureAltitudeFt / 1000) * 2;
    return { cold: stdTemp - 20, std: stdTemp, hot: stdTemp + 20 };
  };

  if (!seed.manifoldPressures) {
    const blocks: CruiseAltitudeBlock<FixedPitchCruiseRow>[] = seed.altitudesFt.map(
      (pressureAltitudeFt) => ({
        pressureAltitudeFt,
        tempsC: tempsFor(pressureAltitudeFt),
        rows: seed.rpms.map((rpm, rpmStep): FixedPitchCruiseRow => {
          const at = (offset: number) => cell(rpmStep, rpmStep, pressureAltitudeFt, offset);
          return [rpm, at(-20), at(0), at(20)];
        }),
      })
    );
    return {
      propeller: 'fixed-pitch',
      maxCruisePercentPower: seed.maxCruisePercentPower,
      percentPowerLabel: seed.percentPowerLabel,
      blocks,
    };
  }

  const manifoldPressures = seed.manifoldPressures;
  const blocks: CruiseAltitudeBlock<ConstantSpeedCruiseRow>[] = seed.altitudesFt.map(
    (pressureAltitudeFt) => {
      const rows: ConstantSpeedCruiseRow[] = [];

      for (const [rpmStep, rpm] of seed.rpms.entries()) {
        // The published MP range narrows with altitude, as it does in a real book.
        const ceilingIndex = manifoldPressures.length - 1 - Math.floor(pressureAltitudeFt / 4000);

        for (let i = 0; i < manifoldPressures.length; i++) {
          if (i > Math.max(ceilingIndex, 1)) continue;
          const at = (offset: number) => cell(i, rpmStep, pressureAltitudeFt, offset);
          rows.push([rpm, manifoldPressures[i], at(-20), at(0), at(20)]);
        }
      }

      return { pressureAltitudeFt, tempsC: tempsFor(pressureAltitudeFt), rows };
    }
  );

  return {
    propeller: 'constant-speed',
    maxCruisePercentPower: seed.maxCruisePercentPower,
    percentPowerLabel: seed.percentPowerLabel,
    blocks,
  };
}

export interface FieldSeed {
  weightsLbs: number[];
  altitudesFt: number[];
  oatsC: number[];
  /** At the lightest listed weight, sea level, 0°C. */
  baseGroundRollFt: number;
  baseOver50ftFt: number;
}

export function generatePlaceholderField(seed: FieldSeed): FieldWeightBlock[] {
  const lightest = Math.min(...seed.weightsLbs);

  return seed.weightsLbs.map((weightLbs) => {
    const byOatC: Record<number, FieldRow[]> = {};
    for (const oatC of seed.oatsC) {
      byOatC[oatC] = seed.altitudesFt.map((pressureAltitudeFt) => {
        const factor =
          (weightLbs / lightest) * (1 + pressureAltitudeFt / 10000) * (1 + Math.max(oatC, 0) / 100);
        return [
          pressureAltitudeFt,
          Math.round(seed.baseGroundRollFt * factor),
          Math.round(seed.baseOver50ftFt * factor),
        ] as FieldRow;
      });
    }
    return { weightLbs, byOatC };
  });
}
