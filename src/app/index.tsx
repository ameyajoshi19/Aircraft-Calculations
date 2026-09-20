import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/calculator/Card';
import { GradientScreen } from '@/components/calculator/GradientScreen';
import { LabeledSlider } from '@/components/calculator/LabeledSlider';
import { PlaceholderBanner } from '@/components/calculator/PlaceholderBanner';
import { SegmentedControl } from '@/components/calculator/SegmentedControl';
import { StatRow, StatTile } from '@/components/calculator/StatTile';
import { CalculatorColors, CalculatorSpacing } from '@/constants/calculator-theme';
import { useAircraft } from '@/context/aircraft-context';
import { isaTemperatureC, lookupCruisePerformance } from '@/lib/performance';

const POWER_LABELS = ['Economy', 'Balanced', 'Performance'];

export default function CruisePerformanceScreen() {
  const { selectedProfile: profile } = useAircraft();

  const [altitudeFt, setAltitudeFt] = useState(8000);
  const [percentPower, setPercentPower] = useState(profile.availablePowerSettings[0]);
  const [isaDeviationC, setIsaDeviationC] = useState(0);

  const powerOptions = useMemo(
    () =>
      profile.availablePowerSettings.map((value, index) => ({
        value,
        label: `${value}%`,
        sublabel: POWER_LABELS[index] ?? undefined,
      })),
    [profile.availablePowerSettings]
  );

  const clampedAltitude = Math.min(altitudeFt, profile.serviceCeilingFt);
  const outsideAirTempC = isaTemperatureC(clampedAltitude) + isaDeviationC;
  const result = lookupCruisePerformance(profile, clampedAltitude, isaDeviationC, percentPower);
  const rangeNm =
    result && result.fuelFlowGph > 0
      ? Math.round(result.ktas * (profile.usableFuelGal / result.fuelFlowGph))
      : 0;

  return (
    <GradientScreen icon="✈️" title={profile.displayName} footer="For planning only • Verify with POH">
      {profile.performanceDataSource === 'placeholder' ? (
        <PlaceholderBanner text="Demo data — cruise table is placeholder, not from the POH yet." />
      ) : null}

      <Card>
        <LabeledSlider
          label="Altitude"
          valueLabel={`${Math.round(clampedAltitude).toLocaleString()} ft`}
          min={0}
          max={profile.serviceCeilingFt}
          step={500}
          value={clampedAltitude}
          onChange={setAltitudeFt}
        />

        <SegmentedControl
          label="Target Power"
          options={powerOptions}
          value={percentPower}
          onChange={setPercentPower}
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
      </Card>

      <Card>
        <View style={styles.mpRpmRow}>
          <View style={styles.mpRpmColumn}>
            <Text style={styles.mpRpmLabel}>MP</Text>
            <Text style={styles.mpRpmValue}>{result ? result.manifoldPressureInHg.toFixed(1) : '—'}</Text>
            <Text style={styles.autoLabel}>AUTO</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.mpRpmColumn}>
            <Text style={styles.mpRpmLabel}>RPM</Text>
            <Text style={styles.mpRpmValue}>{result ? result.rpm : '—'}</Text>
            <Text style={styles.autoLabel}>AUTO</Text>
          </View>
        </View>
        <View style={styles.mcpRow}>
          <Text style={styles.mcpLabel}>%MCP</Text>
          <Text style={styles.mcpValue}>{result ? result.percentMcp : '—'}</Text>
        </View>
      </Card>

      <StatRow>
        <StatTile label="TAS" value={result ? String(result.ktas) : '—'} unit="kts" />
        <StatTile label="Fuel" value={result ? result.fuelFlowGph.toFixed(1) : '—'} unit="GPH" />
        <StatTile label="Range" value={result ? String(rangeNm) : '—'} unit="nm" />
      </StatRow>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  mpRpmRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mpRpmColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  mpRpmLabel: {
    color: CalculatorColors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  mpRpmValue: {
    color: CalculatorColors.textPrimary,
    fontSize: 40,
    fontWeight: '800',
  },
  autoLabel: {
    color: CalculatorColors.textFaint,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  divider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: CalculatorColors.divider,
    marginVertical: CalculatorSpacing.sm,
  },
  mcpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    gap: CalculatorSpacing.sm,
    borderTopWidth: 1,
    borderTopColor: CalculatorColors.divider,
    paddingTop: CalculatorSpacing.md,
  },
  mcpLabel: {
    color: CalculatorColors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  mcpValue: {
    color: CalculatorColors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
});
