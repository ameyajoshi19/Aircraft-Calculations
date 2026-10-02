import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Notice } from '@/components/ui/Notice';
import { NumericOverrideField, TextOverrideField } from '@/components/ui/OverrideField';
import { DataRow, Rule } from '@/components/ui/Readout';
import { Screen, Section } from '@/components/ui/Screen';
import { Segment } from '@/components/ui/Segment';
import { Text } from '@/components/ui/Text';
import { useAircraft } from '@/context/aircraft-context';
import { useTheme, type ThemeMode } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import type { AircraftProfile } from '@/types/aircraft';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'Auto' },
  { value: 'light', label: 'Day' },
  { value: 'dark', label: 'Night' },
];

export default function AircraftScreen() {
  const { profiles, selectedProfile, selectProfile } = useAircraft();
  const { mode, setMode } = useTheme();
  const [editing, setEditing] = useState(false);

  const others = profiles.filter((p) => p.id !== selectedProfile.id);

  return (
    <Screen
      title="Aircraft"
      subtitle="Model and airframe"
      info={{
        title: 'About these aircraft',
        notes: [
          'Each aircraft here is a MODEL, described by its POH. Performance tables, CG envelope, station arms and limits are the book’s and are the same for every airframe of that type.',
          'The four values under "This airframe" are the ones that differ between two aeroplanes of the same model. They come from your aircraft’s own weight and balance record, and nothing else can supply them.',
          'Leave a field blank to use the book’s figure. For empty weight that is the model’s STANDARD weight, which is a starting point rather than a measurement of your aeroplane.',
          'Planning only. Verify every figure against the POH before flight.',
        ],
      }}>
      <Section>
        <SelectedCard profile={selectedProfile} onEdit={() => setEditing(true)} />
        {others.map((profile) => (
          <CollapsedRow key={profile.id} profile={profile} onPress={() => selectProfile(profile.id)} />
        ))}
      </Section>

      <Rule />

      <Section label="Appearance">
        <Segment options={THEME_OPTIONS} value={mode} onChange={setMode} />
      </Section>

      <Rule />

      <Section label="Data sources">
        <DataRow
          label="Performance tables"
          value={selectedProfile.performanceDataSource === 'poh' ? 'From POH' : 'Placeholder'}
          tone={selectedProfile.performanceDataSource === 'poh' ? 'ok' : 'danger'}
        />
        <DataRow
          label="Weight & balance"
          value={selectedProfile.weightBalanceDataSource === 'poh' ? 'From POH' : 'Placeholder'}
          tone={selectedProfile.weightBalanceDataSource === 'poh' ? 'ok' : 'danger'}
        />
      </Section>

      <AirframeSheet open={editing} onClose={() => setEditing(false)} />
    </Screen>
  );
}

/** The active aircraft: specs, plus the one row that leads to its own figures. */
function SelectedCard({ profile, onEdit }: { profile: AircraftProfile; onEdit: () => void }) {
  const { colors } = useTheme();
  const { overridesFor } = useAircraft();
  const entered = overridesFor(profile.id);
  const usingBook = entered.emptyWeightLbs === undefined;

  return (
    <View style={[styles.card, { borderColor: colors.accent, backgroundColor: colors.accentSoft }]}>
      <View style={styles.cardHead}>
        <View style={styles.cardTitle}>
          <Text variant="value">{profile.model}</Text>
          <Text variant="caption" tone="muted">
            {[profile.tailNumber, profile.pohDocumentNumber].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <Text variant="label" tone="ok">
          ACTIVE
        </Text>
      </View>

      <View style={styles.specs}>
        <Spec label="Engine" value={`${profile.engineHp} hp`} />
        <Spec label="Speed" value={`${profile.maxSpeedKts} kt`} />
        <Spec label="Fuel" value={`${profile.usableFuelGal} gal`} />
        <Spec label="Gross" value={`${profile.maxGrossWeightLbs.toLocaleString()} lb`} />
      </View>

      <Pressable
        onPress={onEdit}
        accessibilityRole="button"
        accessibilityLabel="Edit this airframe's figures"
        style={({ pressed }) => [
          styles.airframeRow,
          { borderColor: colors.hairline, backgroundColor: pressed ? colors.surface : 'transparent' },
        ]}>
        <View style={styles.airframeText}>
          <Text variant="label" tone="muted">
            THIS AIRFRAME
          </Text>
          <Text variant="caption">
            {`${profile.emptyWeightLbs.toLocaleString()} lb @ ${profile.emptyWeightArm.toFixed(1)} in · ${profile.usableFuelGal} gal`}
          </Text>
          <Text variant="caption" tone={usingBook ? 'warning' : 'faint'}>
            {usingBook ? "Using the POH's standard weight" : 'From your weighing record'}
          </Text>
        </View>
        <Text variant="value" tone="faint">
          ›
        </Text>
      </Pressable>
    </View>
  );
}

/** An aircraft you are not flying: one line, enough to recognise and pick it. */
function CollapsedRow({ profile, onPress }: { profile: AircraftProfile; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Select ${profile.model}`}
      style={({ pressed }) => [
        styles.row,
        { borderColor: colors.hairline, backgroundColor: pressed ? colors.accentSoft : colors.surface },
      ]}>
      <Text variant="body" numberOfLines={1} style={styles.rowTitle}>
        {profile.model}
      </Text>
      <Text variant="caption" tone="faint">
        {`${profile.maxGrossWeightLbs.toLocaleString()} lb`}
      </Text>
    </Pressable>
  );
}

/** The airframe's own figures, off the main screen because they are set once. */
function AirframeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const { selectedProfile, overridesFor, bookProfile, setOverride, clearOverrides } = useAircraft();
  const entered = overridesFor(selectedProfile.id);
  const book = bookProfile(selectedProfile.id);
  const hasEntries = Object.values(entered).some((v) => v !== undefined);
  const halfEntered =
    (entered.emptyWeightLbs === undefined) !== (entered.emptyWeightArm === undefined);

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose} accessibilityViewIsModal>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.canvas, borderColor: colors.hairline }]}>
        <SafeAreaView edges={['bottom']}>
          <View style={styles.grabber}>
            <View style={[styles.grabBar, { backgroundColor: colors.track }]} />
          </View>
          <View style={styles.sheetHead}>
            <Text variant="title">This {selectedProfile.shortName}</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10}>
              <Text variant="value" tone="muted">
                Done
              </Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
            <Text variant="caption" tone="faint">
              These four differ between two aeroplanes of the same model. Leave a field blank to use
              the book&apos;s figure.
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
              <Pressable
                onPress={() => clearOverrides(selectedProfile.id)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.clear,
                  { borderColor: colors.hairline, opacity: pressed ? 0.6 : 1 },
                ]}>
                <Text variant="caption" tone="muted">
                  Clear and use the POH figures
                </Text>
              </Pressable>
            ) : (
              <Notice tone="warning">
                Using the book&apos;s standard empty weight. Enter this airframe&apos;s weighing
                record before planning a real flight.
              </Notice>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
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
  card: { borderWidth: 1, borderRadius: radius.lg, padding: space.md, gap: space.md },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: space.sm },
  cardTitle: { flex: 1, gap: 1 },
  specs: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  spec: { gap: 1 },
  airframeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: space.sm,
    gap: space.sm,
  },
  airframeText: { flex: 1, gap: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    gap: space.sm,
  },
  rowTitle: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '86%',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
  },
  grabber: { alignItems: 'center', paddingTop: space.sm },
  grabBar: { width: 36, height: 4, borderRadius: radius.pill },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xl,
    paddingTop: space.md,
  },
  sheetBody: { paddingHorizontal: space.xl, paddingTop: space.lg, paddingBottom: space.xl, gap: space.lg },
  clear: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
  },
});
