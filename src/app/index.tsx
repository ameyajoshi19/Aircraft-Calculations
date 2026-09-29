import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Dropdown } from '@/components/ui/Dropdown';
import { Notice } from '@/components/ui/Notice';
import { Display, DisplayPair, Rule, Stat, StatRow } from '@/components/ui/Readout';
import { Screen, Section } from '@/components/ui/Screen';
import { Segment } from '@/components/ui/Segment';
import { SliderField } from '@/components/ui/SliderField';
import { Text } from '@/components/ui/Text';
import { useAircraft } from '@/context/aircraft-context';
import { useProfileState } from '@/hooks/use-profile-state';
import { useTheme } from '@/design/theme';
import { space } from '@/design/tokens';
import { solveCruise } from '@/lib/cruise';
import { isaTemperatureC } from '@/lib/performance';

const AUTO = 'auto' as const;

/** Reserve the Range figure is quoted on, matching the POH's Range Profile chart. */
const RESERVE_MINUTES = 45;

export default function CruiseScreen() {
  const { selectedProfile: profile } = useAircraft();
  const { colors } = useTheme();

  // A fixed-pitch aircraft has one control. RPM is not a second thing to pick
  // alongside the power — it is the answer, so the screen has no MP readout
  // and the RPM dropdown means "pin this instead of solving for it".
  const fixedPitch = profile.cruise.propeller === 'fixed-pitch';
  const powerUnit = `% ${profile.cruise.percentPowerLabel}`;

  const [altitudeFt, setAltitudeFt] = useState(8000);
  const [isaDeviationC, setIsaDeviationC] = useState(0);
  // Both are aircraft-specific: the presets differ, and an RPM pinned on one
  // type may not exist in another's tables at all.
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

  // Range on 45 minutes' reserve, matching the basis of the POH's own Range
  // Profile chart. Without the reserve this reads roughly 100 nm further than
  // the book — an optimistic number is the last thing this screen should show.
  // It still excludes start, taxi and climb fuel, which the Fuel tab covers.
  const rangeNm = useMemo(() => {
    if (!solution || solution.gph <= 0) return null;
    const reserveGal = (RESERVE_MINUTES / 60) * solution.gph;
    return Math.round(((profile.usableFuelGal - reserveGal) / solution.gph) * solution.ktas);
  }, [solution, profile.usableFuelGal]);

  // A pinned RPM that overshoots the target is the pilot's own choice, not a
  // shortfall, so only an undershoot is worth warning about.
  const shortOfTarget =
    solution !== null && !solution.targetAchieved && solution.percentPower < targetPercentPower;

  return (
    <Screen
      title="Cruise"
      subtitle={`${profile.shortName}${profile.tailNumber ? ` · ${profile.tailNumber}` : ''}`}
      footer="Planning only · Verify against the POH">
      {profile.performanceDataSource === 'placeholder' ? (
        <Notice tone="warning">
          Placeholder cruise data — not transcribed from a POH. Do not plan on these figures.
        </Notice>
      ) : null}

      <Section>
        <SliderField
          label="Altitude"
          valueLabel={`${altitude.toLocaleString()} ft`}
          min={0}
          max={profile.serviceCeilingFt}
          step={500}
          value={altitude}
          onChange={setAltitudeFt}
        />
        <SliderField
          label="Temperature"
          valueLabel={`ISA ${isaDeviationC >= 0 ? '+' : ''}${isaDeviationC}°`}
          hint={`${oatC.toFixed(1)}°C OAT`}
          min={-20}
          max={30}
          step={1}
          value={isaDeviationC}
          onChange={setIsaDeviationC}
        />
        <Segment
          label="Target power"
          options={powerOptions}
          value={targetPercentPower}
          onChange={setTargetPercentPower}
        />
        <Dropdown label="RPM" value={rpmChoice} options={rpmOptions} onChange={setRpmChoice} />
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
        <StatRow>
          <Stat label="Power" value={solution ? String(solution.percentPower) : '—'} unit={powerUnit} />
          <Stat label="TAS" value={solution ? String(solution.ktas) : '—'} unit="kts" />
          <Stat label="Range" value={rangeNm !== null ? String(rangeNm) : '—'} unit="nm" />
        </StatRow>

        <Text variant="caption" tone="faint">
          Range assumes {RESERVE_MINUTES} min reserve and excludes start, taxi and climb fuel.
        </Text>

        {solution ? (
          <View style={[styles.targetRow, { borderColor: colors.hairline }]}>
            <Text variant="caption" tone="muted">
              Target {solution.targetPercentPower}%
            </Text>
            <Text variant="caption" tone={solution.targetAchieved ? 'ok' : 'warning'}>
              {solution.targetAchieved
                ? 'Target met'
                : shortOfTarget
                  ? `Highest the POH publishes here is ${solution.percentPower}%`
                  : `This setting gives ${solution.percentPower}%`}
            </Text>
          </View>
        ) : null}
      </Section>

      {shortOfTarget && solution ? (
        <Notice tone="warning">
          {solution.limitedBy === 'max-cruise-power'
            ? `${solution.targetPercentPower}% is above the POH's maximum cruise power of ${profile.cruise.maxCruisePercentPower}${powerUnit}. Settings above it are printed only to aid interpolation.`
            : rpmChoice === AUTO
              ? `No published setting reaches ${solution.targetPercentPower}% at this altitude and temperature. Descend, or accept ${solution.percentPower}%.`
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
