import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Dropdown } from '@/components/ui/Dropdown';
import { Notice } from '@/components/ui/Notice';
import { Display, DisplayPair, Rule, Stat, StatRow } from '@/components/ui/Readout';
import { Screen, Section } from '@/components/ui/Screen';
import { SliderField } from '@/components/ui/SliderField';
import { Text } from '@/components/ui/Text';
import { useAircraft } from '@/context/aircraft-context';
import { useTheme } from '@/design/theme';
import { space } from '@/design/tokens';
import {
  MAX_CRUISE_PERCENT_MCP,
  MIN_CRUISE_PERCENT_MCP,
  solveCruise,
} from '@/lib/cruise';
import { isaTemperatureC } from '@/lib/performance';

const AUTO = 'auto' as const;

/** Reserve the Range figure is quoted on, matching the POH's Range Profile chart. */
const RESERVE_MINUTES = 45;

export default function CruiseScreen() {
  const { selectedProfile: profile } = useAircraft();
  const { colors } = useTheme();

  const [altitudeFt, setAltitudeFt] = useState(8000);
  const [isaDeviationC, setIsaDeviationC] = useState(0);
  const [targetPercentMcp, setTargetPercentMcp] = useState(65);
  const [rpmChoice, setRpmChoice] = useState<number | typeof AUTO>(AUTO);

  const altitude = Math.min(altitudeFt, profile.serviceCeilingFt);
  const oatC = isaTemperatureC(altitude) + isaDeviationC;

  const solution = useMemo(
    () =>
      solveCruise(profile.cruise, {
        altitudeFt: altitude,
        oatC,
        targetPercentMcp,
        rpm: rpmChoice === AUTO ? undefined : rpmChoice,
      }),
    [profile.cruise, altitude, oatC, targetPercentMcp, rpmChoice]
  );

  const rpmOptions = useMemo(
    () => [
      { value: AUTO as number | typeof AUTO, label: 'Auto', note: 'Lowest RPM that reaches target' },
      ...profile.rpmPresets.map((preset) => ({
        value: preset.rpm as number | typeof AUTO,
        label: `${preset.rpm} RPM`,
        note: preset.label,
      })),
    ],
    [profile.rpmPresets]
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
        <SliderField
          label="Target power"
          valueLabel={`${targetPercentMcp}% MCP`}
          min={MIN_CRUISE_PERCENT_MCP}
          max={MAX_CRUISE_PERCENT_MCP}
          step={1}
          value={targetPercentMcp}
          onChange={setTargetPercentMcp}
        />
        <Dropdown label="RPM" value={rpmChoice} options={rpmOptions} onChange={setRpmChoice} />
      </Section>

      <Rule />

      <Section label="Set">
        <DisplayPair>
          <Display label="RPM" value={solution ? String(solution.rpm) : '—'} note={rpmChoice === AUTO ? 'auto' : 'selected'} />
          <Display
            label="MP"
            value={solution ? solution.manifoldPressureInHg.toFixed(1) : '—'}
            note="in Hg"
          />
          <Display label="Fuel" value={solution ? solution.gph.toFixed(1) : '—'} note="gph, leaned" />
        </DisplayPair>
      </Section>

      <Rule />

      <Section label="Expect">
        <StatRow>
          <Stat label="Power" value={solution ? String(solution.percentMcp) : '—'} unit="% MCP" />
          <Stat label="TAS" value={solution ? String(solution.ktas) : '—'} unit="kts" />
          <Stat label="Range" value={rangeNm !== null ? String(rangeNm) : '—'} unit="nm" />
        </StatRow>

        <Text variant="caption" tone="faint">
          Range assumes {RESERVE_MINUTES} min reserve and excludes start, taxi and climb fuel.
        </Text>

        {solution ? (
          <View style={[styles.targetRow, { borderColor: colors.hairline }]}>
            <Text variant="caption" tone="muted">
              Target {solution.targetPercentMcp}%
            </Text>
            <Text variant="caption" tone={solution.targetAchieved ? 'ok' : 'warning'}>
              {solution.targetAchieved
                ? 'Target met'
                : `Highest the POH publishes here is ${solution.percentMcp}%`}
            </Text>
          </View>
        ) : null}
      </Section>

      {solution && !solution.targetAchieved ? (
        <Notice tone="warning">
          {rpmChoice === AUTO
            ? `No published setting reaches ${solution.targetPercentMcp}% at this altitude and temperature. Descend, or accept ${solution.percentMcp}%.`
            : `${rpmChoice} RPM cannot reach ${solution.targetPercentMcp}% here. Try a higher RPM, or accept ${solution.percentMcp}%.`}
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
