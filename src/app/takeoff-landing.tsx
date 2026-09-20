import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/calculator/Card';
import { GradientScreen } from '@/components/calculator/GradientScreen';
import { LabeledSlider } from '@/components/calculator/LabeledSlider';
import { NumberField } from '@/components/calculator/NumberField';
import { PlaceholderBanner } from '@/components/calculator/PlaceholderBanner';
import { CalculatorColors } from '@/constants/calculator-theme';
import { useAircraft } from '@/context/aircraft-context';
import { isaTemperatureC, lookupFieldPerformance } from '@/lib/performance';

export default function TakeoffLandingScreen() {
  const { selectedProfile: profile } = useAircraft();

  const [altitudeFt, setAltitudeFt] = useState(0);
  const [isaDeviationC, setIsaDeviationC] = useState(0);
  const [weightLbs, setWeightLbs] = useState(profile.maxGrossWeightLbs);
  const [windKts, setWindKts] = useState(0);

  const outsideAirTempC = isaTemperatureC(altitudeFt) + isaDeviationC;
  const takeoff = lookupFieldPerformance(profile.takeoffTable, altitudeFt, isaDeviationC, weightLbs, windKts);
  const landing = lookupFieldPerformance(profile.landingTable, altitudeFt, isaDeviationC, weightLbs, windKts);

  return (
    <GradientScreen icon="🛫" title="Takeoff & Landing" footer="For planning only • Verify with POH">
      {profile.performanceDataSource === 'placeholder' ? (
        <PlaceholderBanner text="Demo data — distance tables are placeholder, not from the POH yet." />
      ) : null}

      <Card>
        <LabeledSlider
          label="Pressure Altitude"
          valueLabel={`${altitudeFt.toLocaleString()} ft`}
          min={0}
          max={Math.min(profile.serviceCeilingFt, 10000)}
          step={500}
          value={altitudeFt}
          onChange={setAltitudeFt}
        />
        <LabeledSlider
          label="Temperature"
          valueLabel={`ISA ${isaDeviationC >= 0 ? '+' : ''}${isaDeviationC}°C (${outsideAirTempC.toFixed(1)}°C)`}
          min={-20}
          max={30}
          step={1}
          value={isaDeviationC}
          onChange={setIsaDeviationC}
        />
        <NumberField
          label="Weight"
          unit="lbs"
          value={weightLbs}
          onChange={(value) => setWeightLbs(Math.min(Math.max(value, 0), profile.maxGrossWeightLbs))}
        />
        <LabeledSlider
          label="Wind (+head / -tail)"
          valueLabel={`${windKts >= 0 ? '+' : ''}${windKts} kt`}
          min={-10}
          max={20}
          step={1}
          value={windKts}
          onChange={setWindKts}
        />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Takeoff</Text>
        <View style={styles.row}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Ground Roll</Text>
            <Text style={styles.statValue}>{takeoff ? takeoff.groundRollFt.toLocaleString() : '—'} ft</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Over 50 ft Obstacle</Text>
            <Text style={styles.statValue}>
              {takeoff ? takeoff.distanceOver50ftFt.toLocaleString() : '—'} ft
            </Text>
          </View>
        </View>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Landing</Text>
        <View style={styles.row}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Ground Roll</Text>
            <Text style={styles.statValue}>{landing ? landing.groundRollFt.toLocaleString() : '—'} ft</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Over 50 ft Obstacle</Text>
            <Text style={styles.statValue}>
              {landing ? landing.distanceOver50ftFt.toLocaleString() : '—'} ft
            </Text>
          </View>
        </View>
      </Card>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  cardTitle: { color: CalculatorColors.textPrimary, fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, gap: 2 },
  statLabel: { color: CalculatorColors.textSecondary, fontSize: 12 },
  statValue: { color: CalculatorColors.textPrimary, fontSize: 20, fontWeight: '800' },
});
