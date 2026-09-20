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
import type { CruiseAltitudeBlock, CruiseRow, FieldWeightBlock, FieldRow } from '@/data/poh/types';

export interface CruiseSeed {
  altitudesFt: number[];
  /** Standard temperature at sea level falls 2°C per 1000 ft, as POH sheets round it. */
  rpms: number[];
  manifoldPressures: number[];
  /** %MCP produced at the lowest RPM and lowest MP on a standard day at sea level. */
  basePercentMcp: number;
  baseKtas: number;
  baseGph: number;
}

export function generatePlaceholderCruise(seed: CruiseSeed): CruiseAltitudeBlock[] {
  return seed.altitudesFt.map((pressureAltitudeFt) => {
    const stdTemp = 15 - (pressureAltitudeFt / 1000) * 2;
    const rows: CruiseRow[] = [];

    for (const rpm of seed.rpms) {
      const rpmStep = seed.rpms.indexOf(rpm);
      // The published MP range narrows with altitude, as it does in a real book.
      const ceilingIndex = seed.manifoldPressures.length - 1 - Math.floor(pressureAltitudeFt / 4000);

      for (let i = 0; i < seed.manifoldPressures.length; i++) {
        const mp = seed.manifoldPressures[i];
        if (i > Math.max(ceilingIndex, 1)) continue;

        const cell = (temperatureOffset: number): [number, number, number] => {
          const power = seed.basePercentMcp + i * 4 + rpmStep * 3 - temperatureOffset * 0.15;
          return [
            Math.round(power),
            Math.round(seed.baseKtas + i * 4 + rpmStep * 2 + pressureAltitudeFt / 1000),
            Math.round((seed.baseGph + i * 0.6 + rpmStep * 0.4 - temperatureOffset * 0.02) * 10) / 10,
          ];
        };

        rows.push([rpm, mp, cell(-20), cell(0), cell(20)]);
      }
    }

    return {
      pressureAltitudeFt,
      tempsC: { cold: stdTemp - 20, std: stdTemp, hot: stdTemp + 20 },
      rows,
    };
  });
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
