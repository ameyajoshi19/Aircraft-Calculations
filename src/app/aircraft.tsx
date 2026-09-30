import { Pressable, StyleSheet, View } from 'react-native';

import { Notice } from '@/components/ui/Notice';
import { NumericOverrideField, TextOverrideField } from '@/components/ui/OverrideField';
import { DataRow, Rule } from '@/components/ui/Readout';
import { Screen, Section } from '@/components/ui/Screen';
import { Segment } from '@/components/ui/Segment';
import { SelectRow } from '@/components/ui/SelectRow';
import { Text } from '@/components/ui/Text';
import { useAircraft } from '@/context/aircraft-context';
import { useTheme, type ThemeMode } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import type { DataSource } from '@/types/aircraft';

const THEME_OPTIONS: { value: ThemeMode; label: string; sublabel: string }[] = [
  { value: 'system', label: 'Auto', sublabel: 'System' },
  { value: 'light', label: 'Day', sublabel: 'Light' },
  { value: 'dark', label: 'Night', sublabel: 'Dark' },
];

export default function AircraftScreen() {
  const { profiles, selectedProfile, selectProfile, overridesFor, bookProfile, setOverride, clearOverrides } =
    useAircraft();
  const { mode, setMode } = useTheme();

  const entered = overridesFor(selectedProfile.id);
  const book = bookProfile(selectedProfile.id);
  const hasEntries = Object.values(entered).some((v) => v !== undefined);
  // Empty weight and its arm are a pair: one without the other gives a CG
  // computed from two different aeroplanes.
  const halfEntered =
    (entered.emptyWeightLbs === undefined) !== (entered.emptyWeightArm === undefined);

  return (
    <Screen title="Aircraft" subtitle="Select the model all calculations use">
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

      <Section label={`This ${selectedProfile.shortName}`}>
        <Text variant="caption" tone="faint">
          The POH describes the model. These four differ between two aeroplanes of the same type,
          so they come from this aircraft&apos;s own weight and balance record. Leave a field blank
          to use the book&apos;s figure.
        </Text>

        <TextOverrideField
          label="Registration"
          value={entered.tailNumber}
          placeholder="e.g. N12345"
          onChange={(v) => setOverride(selectedProfile.id, 'tailNumber', v)}
        />
        <NumericOverrideField
          label="Basic empty weight"
          unit="lb"
          value={entered.emptyWeightLbs}
          fallback={book.emptyWeightLbs}
          hint={`POH standard: ${book.emptyWeightLbs.toLocaleString()} lb`}
          onChange={(v) => setOverride(selectedProfile.id, 'emptyWeightLbs', v)}
        />
        <NumericOverrideField
          label="Empty weight arm"
          unit="in"
          value={entered.emptyWeightArm}
          fallback={book.emptyWeightArm}
          hint={`POH standard: ${book.emptyWeightArm} in aft of datum`}
          onChange={(v) => setOverride(selectedProfile.id, 'emptyWeightArm', v)}
        />
        <NumericOverrideField
          label="Usable fuel"
          unit="gal"
          value={entered.usableFuelGal}
          fallback={book.usableFuelGal}
          hint={`POH standard tanks: ${book.usableFuelGal} gal`}
          onChange={(v) => setOverride(selectedProfile.id, 'usableFuelGal', v)}
        />

        {halfEntered ? (
          <Notice tone="warning">
            Enter the empty weight and its arm together. One from this aircraft and one from the
            book gives a centre of gravity that belongs to neither.
          </Notice>
        ) : null}

        {hasEntries ? (
          <ClearButton onPress={() => clearOverrides(selectedProfile.id)} />
        ) : (
          <Notice tone="warning">
            Using the book&apos;s standard empty weight. Enter this airframe&apos;s weighing record
            before planning a real flight.
          </Notice>
        )}
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
        {selectedProfile.pohDocumentNumber ? (
          <DataRow label="POH document" value={selectedProfile.pohDocumentNumber} />
        ) : null}
      </Section>
    </Screen>
  );
}

function ClearButton({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.clear,
        { borderColor: colors.hairline, opacity: pressed ? 0.6 : 1 },
      ]}>
      <Text variant="caption" tone="muted">
        Clear and use the POH figures
      </Text>
    </Pressable>
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
  clear: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
  },
});
