import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Dropdown } from '@/components/ui/Dropdown';
import { Notice } from '@/components/ui/Notice';
import { Display, DisplayPair, Rule, Stat, StatRow } from '@/components/ui/Readout';
import { Screen, Section } from '@/components/ui/Screen';
import { Segment } from '@/components/ui/Segment';
import { FieldRow, Stepper } from '@/components/ui/Stepper';
import { Text } from '@/components/ui/Text';
import { useAircraft } from '@/context/aircraft-context';
import { useFlight } from '@/context/flight-context';
import { useProfileState } from '@/hooks/use-profile-state';
import { useTheme } from '@/design/theme';
import { space } from '@/design/tokens';
import { solveCruise } from '@/lib/cruise';
import { computeFuelPlan, isaTemperatureC } from '@/lib/performance';

const AUTO = 'auto' as const;
const RESERVE_MINUTES = 45;

function hoursMinutes(hours: number): string {
  const total = Math.round(hours * 60);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * Cruise and fuel on one screen.
 *
 * They were two tabs asking for the same three things — altitude, target power
 * and RPM — and then showing overlapping answers. One set of conditions
 * produces one cruise setting, and endurance and range are simply what that
 * setting does with the fuel aboard, so they belong to the same reading.
 */
export default function PlanScreen() {
  const { selectedProfile: profile } = useAircraft();
  const { fuelOnBoardGal, setFuelOnBoardGal, isFullTanks } = useFlight();
  const { colors } = useTheme();

  const fixedPitch = profile.cruise.propeller === 'fixed-pitch';
  const powerUnit = `% ${profile.cruise.percentPowerLabel}`;

  const [altitudeFt, setAltitudeFt] = useState(8000);
  const [isaDeviationC, setIsaDeviationC] = useState(0);
  const [targetPercentPower, setTargetPercentPower] = useProfileState(
    profile,
    (p) => p.targetPowerPresets[0].percentPower
  );
  const [rpmChoice, setRpmChoice] = useProfileState<number | typeof AUTO>(profile, () => AUTO);

  const altitude = Math.min(altitudeFt, profile.serviceCeilingFt);
  const oatC = isaTemperatureC(altitude) + isaDeviationC;

  const solution = useMemo(
    () =>
      solveCruise(profile.cruise, {
        altitudeFt: altitude,
        oatC,
        targetPercentPower,
        rpm: rpmChoice === AUTO ? undefined : rpmChoice,
      }),
    [profile.cruise, altitude, oatC, targetPercentPower, rpmChoice]
  );

  const plan = useMemo(
    () =>
      solution
        ? computeFuelPlan(fuelOnBoardGal, solution.gph, solution.ktas, RESERVE_MINUTES)
        : null,
    [solution, fuelOnBoardGal]
  );

  const powerOptions = useMemo(
    () =>
      profile.targetPowerPresets.map((preset) => ({
        value: preset.percentPower,
        label: `${preset.percentPower}%`,
        sublabel: preset.label,
      })),
    [profile.targetPowerPresets]
  );

  const rpmOptions = useMemo(
    () => [
      {
        value: AUTO as number | typeof AUTO,
        label: 'Auto',
        note: fixedPitch ? 'RPM that makes the target' : 'Lowest RPM that reaches target',
      },
      ...profile.rpmPresets.map((preset) => ({
        value: preset.rpm as number | typeof AUTO,
        label: `${preset.rpm} RPM`,
        note: preset.label,
      })),
    ],
    [profile.rpmPresets, fixedPitch]
  );

  const shortOfTarget =
    solution !== null && !solution.targetAchieved && solution.percentPower < targetPercentPower;

  return (
    <Screen
      title="Plan"
      subtitle={`${profile.shortName}${profile.tailNumber ? ` · ${profile.tailNumber}` : ''}`}
      info={{
        title: 'About these figures',
        notes: [
          `Cruise settings are read from the POH's own tables and interpolated between them — never extrapolated past the ends of a chart.`,
          `Range and endurance are computed from the ${fuelOnBoardGal} gal actually on board${isFullTanks ? ', which is full tanks' : ''}, on a ${RESERVE_MINUTES} minute reserve. That matches the basis of the book's Range Profile chart.`,
          'They assume cruise for the whole flight and exclude the fuel for start, taxi, takeoff and climb.',
          `Maximum cruise power for this aircraft is ${profile.cruise.maxCruisePercentPower}${powerUnit}. Settings above it appear in the book only to aid interpolation and are not offered here.`,
          'Planning only. Verify every figure against the POH before flight.',
        ],
      }}>
      {profile.performanceDataSource === 'placeholder' ? (
        <Notice tone="warning">
          Placeholder cruise data — not transcribed from a POH. Do not plan on these figures.
        </Notice>
      ) : null}

      <Section>
        <FieldRow>
          <Stepper
            label="Altitude"
            valueLabel={`${altitude.toLocaleString()} ft`}
            min={0}
            max={profile.serviceCeilingFt}
            step={500}
            value={altitude}
            onChange={setAltitudeFt}
          />
          <Stepper
            label="Temperature"
            valueLabel={`ISA ${isaDeviationC >= 0 ? '+' : ''}${isaDeviationC}°`}
            hint={`${oatC.toFixed(0)}°C OAT`}
            min={-20}
            max={30}
            step={1}
            value={isaDeviationC}
            onChange={setIsaDeviationC}
          />
        </FieldRow>

        <Segment
          label="Target power"
          options={powerOptions}
          value={targetPercentPower}
          onChange={setTargetPercentPower}
        />

        <FieldRow>
          <Dropdown
            label="RPM"
            value={rpmChoice}
            options={rpmOptions}
            onChange={setRpmChoice}
            compact
          />
          <Stepper
            label="Fuel on board"
            valueLabel={`${fuelOnBoardGal} gal`}
            min={0}
            max={profile.usableFuelGal}
            step={1}
            value={fuelOnBoardGal}
            onChange={setFuelOnBoardGal}
          />
        </FieldRow>
      </Section>

      <Rule />

      <Section label="Set">
        <DisplayPair>
          <Display
            label="RPM"
            value={solution ? String(solution.rpm) : '—'}
            note={rpmChoice === AUTO ? 'auto' : 'selected'}
          />
          {solution?.manifoldPressureInHg !== undefined ? (
            <Display label="MP" value={solution.manifoldPressureInHg.toFixed(1)} note="in Hg" />
          ) : null}
          <Display label="Fuel" value={solution ? solution.gph.toFixed(1) : '—'} note="gph, leaned" />
        </DisplayPair>
      </Section>

      <Rule />

      <Section label="Expect">
        {/* Two rows of two rather than four across: at 360px "ENDURANCE"
            broke onto a second line and shoved its figure out of alignment. */}
        <StatRow>
          <Stat label="Power" value={solution ? String(solution.percentPower) : '—'} unit={powerUnit} />
          <Stat label="TAS" value={solution ? String(solution.ktas) : '—'} unit="kts" />
        </StatRow>
        <StatRow>
          <Stat
            label="Endurance"
            value={plan ? hoursMinutes(plan.flightEnduranceHours) : '—'}
            unit="h:mm"
          />
          <Stat label="Range" value={plan ? String(Math.round(plan.rangeNm)) : '—'} unit="nm" />
        </StatRow>

        {solution && !shortOfTarget ? (
          <View style={[styles.targetRow, { borderColor: colors.hairline }]}>
            <Text variant="caption" tone="muted">
              {`Target ${solution.targetPercentPower}% · ${fuelOnBoardGal} gal · ${RESERVE_MINUTES} min reserve`}
            </Text>
            <Text variant="caption" tone={solution.targetAchieved ? 'ok' : 'warning'}>
              {solution.targetAchieved ? 'Met' : shortOfTarget ? `Max ${solution.percentPower}%` : 'Over'}
            </Text>
          </View>
        ) : null}
      </Section>

      {shortOfTarget && solution ? (
        <Notice tone="warning">
          {solution.limitedBy === 'max-cruise-power'
            ? `${solution.targetPercentPower}% is above the POH's maximum cruise power of ${profile.cruise.maxCruisePercentPower}${powerUnit}.`
            : rpmChoice === AUTO
              ? `No published setting reaches ${solution.targetPercentPower}% here. Descend, or accept ${solution.percentPower}%.`
              : `${rpmChoice} RPM cannot reach ${solution.targetPercentPower}% here. Try a higher RPM, or accept ${solution.percentPower}%.`}
        </Notice>
      ) : null}

      {solution === null ? (
        <Notice tone="danger">No cruise data published for these conditions.</Notice>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    borderTopWidth: 1,
    paddingTop: space.md,
    gap: space.md,
  },
});
