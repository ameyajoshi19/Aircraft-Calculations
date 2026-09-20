import { StyleSheet, View } from 'react-native';

import { DataRow, Rule } from '@/components/ui/Readout';
import { Screen, Section } from '@/components/ui/Screen';
import { Segment } from '@/components/ui/Segment';
import { SelectRow } from '@/components/ui/SelectRow';
import { Text } from '@/components/ui/Text';
import { useAircraft } from '@/context/aircraft-context';
import { useTheme, type ThemeMode } from '@/design/theme';
import { space } from '@/design/tokens';
import type { DataSource } from '@/types/aircraft';

const THEME_OPTIONS: { value: ThemeMode; label: string; sublabel: string }[] = [
  { value: 'system', label: 'Auto', sublabel: 'System' },
  { value: 'light', label: 'Day', sublabel: 'Light' },
  { value: 'dark', label: 'Night', sublabel: 'Dark' },
];

export default function AircraftScreen() {
  const { profiles, selectedProfile, selectProfile } = useAircraft();
  const { mode, setMode } = useTheme();

  return (
    <Screen title="Aircraft" subtitle="Select the airframe all calculations use">
      <Section>
        {profiles.map((profile) => {
          const placeholder =
            profile.performanceDataSource === 'placeholder' ||
            profile.weightBalanceDataSource === 'placeholder';

          return (
            <SelectRow
              key={profile.id}
              title={profile.model}
              subtitle={profile.tailNumber}
              selected={profile.id === selectedProfile.id}
              onPress={() => selectProfile(profile.id)}>
              <View style={styles.specs}>
                <Spec label="Engine" value={`${profile.engineHp} hp`} />
                <Spec label="Max speed" value={`${profile.maxSpeedKts} kt`} />
                <Spec label="Usable fuel" value={`${profile.usableFuelGal} gal`} />
                <Spec label="Max gross" value={`${profile.maxGrossWeightLbs.toLocaleString()} lb`} />
              </View>
              <Text variant="caption" tone={placeholder ? 'warning' : 'ok'}>
                {placeholder ? profile.sourceNote : 'Performance and W&B data transcribed from the POH.'}
              </Text>
            </SelectRow>
          );
        })}
      </Section>

      <Rule />

      <Section label="Appearance">
        <Segment options={THEME_OPTIONS} value={mode} onChange={setMode} />
        <Text variant="caption" tone="faint">
          Night mode uses warm, low-blue tones to protect night vision in a dark cockpit.
        </Text>
      </Section>

      <Rule />

      <Section label="Data sources">
        <DataRow
          label="Performance tables"
          value={sourceLabel(selectedProfile.performanceDataSource)}
          tone={selectedProfile.performanceDataSource === 'poh' ? 'ok' : 'danger'}
        />
        <DataRow
          label="Weight & balance"
          value={sourceLabel(selectedProfile.weightBalanceDataSource)}
          tone={selectedProfile.weightBalanceDataSource === 'poh' ? 'ok' : 'danger'}
        />
      </Section>
    </Screen>
  );
}

function sourceLabel(source: DataSource): string {
  return source === 'poh' ? 'From POH' : 'Placeholder';
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.spec}>
      <Text variant="label" tone="faint">
        {label}
      </Text>
      <Text variant="value">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  specs: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space.md, columnGap: space.lg },
  spec: { width: '45%', gap: 2 },
});
