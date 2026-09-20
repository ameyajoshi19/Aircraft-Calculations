import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/calculator/Card';
import { GradientScreen } from '@/components/calculator/GradientScreen';
import { NumberField } from '@/components/calculator/NumberField';
import { PlaceholderBanner } from '@/components/calculator/PlaceholderBanner';
import { ResultBadge } from '@/components/calculator/ResultBadge';
import { CalculatorColors, CalculatorSpacing } from '@/constants/calculator-theme';
import { useAircraft } from '@/context/aircraft-context';
import { computeWeightAndBalance } from '@/lib/performance';

export default function WeightBalanceScreen() {
  const { selectedProfile: profile } = useAircraft();
  const [stationWeights, setStationWeights] = useState<Record<string, number>>({});
  const [fuelGal, setFuelGal] = useState(profile.usableFuelGal);

  const result = useMemo(
    () => computeWeightAndBalance(profile, stationWeights, fuelGal),
    [profile, stationWeights, fuelGal]
  );

  return (
    <GradientScreen icon="⚖️" title="Weight & Balance" footer="For planning only • Verify with POH">
      {profile.weightBalanceDataSource === 'placeholder' ? (
        <PlaceholderBanner text="Demo data — arms, envelope and stations are placeholder, not from the POH yet." />
      ) : null}

      <Card>
        <Text style={styles.cardTitle}>Empty Aircraft</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Weight</Text>
          <Text style={styles.summaryValue}>{profile.emptyWeightLbs.toLocaleString()} lbs</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Arm</Text>
          <Text style={styles.summaryValue}>{profile.emptyWeightArm.toFixed(1)} in</Text>
        </View>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Load Stations</Text>
        {profile.stations.map((station) => (
          <NumberField
            key={station.id}
            label={station.label}
            unit="lbs"
            value={stationWeights[station.id] ?? 0}
            onChange={(value) =>
              setStationWeights((prev) => ({
                ...prev,
                [station.id]: station.maxWeight ? Math.min(value, station.maxWeight) : value,
              }))
            }
          />
        ))}
        <NumberField
          label="Fuel"
          unit="gal"
          value={fuelGal}
          onChange={(value) => setFuelGal(Math.min(Math.max(value, 0), profile.usableFuelGal))}
        />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Result</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Weight</Text>
          <Text style={styles.summaryValue}>{result.totalWeightLbs.toLocaleString()} lbs</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>CG</Text>
          <Text style={styles.summaryValue}>{result.cgInches.toFixed(2)} in</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Envelope Limits</Text>
          <Text style={styles.summaryValue}>
            {result.forwardLimitInches.toFixed(1)}–{result.aftLimitInches.toFixed(1)} in
          </Text>
        </View>

        <View style={styles.badgeRow}>
          <ResultBadge
            ok={result.withinGrossWeight}
            okText={`Within max gross (${profile.maxGrossWeightLbs.toLocaleString()} lbs)`}
            failText={`Over max gross (${profile.maxGrossWeightLbs.toLocaleString()} lbs)`}
          />
          <ResultBadge ok={result.withinEnvelope} okText="CG within envelope" failText="CG out of envelope" />
        </View>
      </Card>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  cardTitle: {
    color: CalculatorColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: { color: CalculatorColors.textSecondary, fontSize: 14 },
  summaryValue: { color: CalculatorColors.textPrimary, fontSize: 14, fontWeight: '700' },
  badgeRow: { gap: CalculatorSpacing.sm },
});
