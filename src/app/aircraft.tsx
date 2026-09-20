import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/calculator/Card';
import { GradientScreen } from '@/components/calculator/GradientScreen';
import { CalculatorColors, CalculatorSpacing } from '@/constants/calculator-theme';
import { useAircraft } from '@/context/aircraft-context';

export default function AircraftScreen() {
  const { profiles, selectedProfile, selectProfile } = useAircraft();

  return (
    <GradientScreen icon="🛩️" title="Aircraft">
      {profiles.map((profile) => {
        const selected = profile.id === selectedProfile.id;
        const isPlaceholder =
          profile.performanceDataSource === 'placeholder' || profile.weightBalanceDataSource === 'placeholder';

        return (
          <Pressable key={profile.id} onPress={() => selectProfile(profile.id)}>
            <Card style={selected ? styles.selectedCard : undefined}>
              <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.model}>{profile.model}</Text>
                  {profile.tailNumber ? <Text style={styles.tail}>{profile.tailNumber}</Text> : null}
                </View>
                {selected ? (
                  <View style={styles.selectedPill}>
                    <Text style={styles.selectedPillText}>Selected</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.specGrid}>
                <Spec label="Engine" value={`${profile.engineHp} hp`} />
                <Spec label="Max Speed" value={`${profile.maxSpeedKts} kt`} />
                <Spec label="Usable Fuel" value={`${profile.usableFuelGal} gal`} />
                <Spec label="Max Gross Wt" value={`${profile.maxGrossWeightLbs.toLocaleString()} lbs`} />
              </View>

              {isPlaceholder ? (
                <Text style={styles.warning}>⚠️ {profile.sourceNote}</Text>
              ) : (
                <Text style={styles.verified}>✅ Performance & W&B data from POH</Text>
              )}
            </Card>
          </Pressable>
        );
      })}
    </GradientScreen>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.spec}>
      <Text style={styles.specLabel}>{label}</Text>
      <Text style={styles.specValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  selectedCard: { borderColor: 'rgba(255,255,255,0.6)', borderWidth: 2 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: CalculatorSpacing.sm },
  model: { color: CalculatorColors.textPrimary, fontSize: 17, fontWeight: '700' },
  tail: { color: CalculatorColors.textSecondary, fontSize: 13, marginTop: 2 },
  selectedPill: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  selectedPillText: { color: CalculatorColors.textPrimary, fontSize: 11, fontWeight: '700' },
  specGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: CalculatorSpacing.md },
  spec: { width: '45%' },
  specLabel: { color: CalculatorColors.textFaint, fontSize: 11, textTransform: 'uppercase' },
  specValue: { color: CalculatorColors.textPrimary, fontSize: 15, fontWeight: '700' },
  warning: { color: CalculatorColors.warningText, fontSize: 12, fontWeight: '600' },
  verified: { color: CalculatorColors.okText, fontSize: 12, fontWeight: '600' },
});
