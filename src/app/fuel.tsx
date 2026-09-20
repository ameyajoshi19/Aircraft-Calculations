import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/calculator/Card';
import { GradientScreen } from '@/components/calculator/GradientScreen';
import { LabeledSlider } from '@/components/calculator/LabeledSlider';
import { NumberField } from '@/components/calculator/NumberField';
import { PlaceholderBanner } from '@/components/calculator/PlaceholderBanner';
import { ResultBadge } from '@/components/calculator/ResultBadge';
import { SegmentedControl } from '@/components/calculator/SegmentedControl';
import { CalculatorColors } from '@/constants/calculator-theme';
import { useAircraft } from '@/context/aircraft-context';
import { computeFuelPlan, isaTemperatureC, lookupCruisePerformance } from '@/lib/performance';

const POWER_LABELS = ['Economy', 'Balanced', 'Performance'];

function formatHoursMinutes(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

export default function FuelPlanningScreen() {
  const { selectedProfile: profile } = useAircraft();

  const [altitudeFt, setAltitudeFt] = useState(8000);
  const [percentPower, setPercentPower] = useState(profile.availablePowerSettings[0]);
  const [reserveMinutes, setReserveMinutes] = useState(45);
  const [tripDistanceNm, setTripDistanceNm] = useState(0);

  const powerOptions = profile.availablePowerSettings.map((value, index) => ({
    value,
    label: `${value}%`,
    sublabel: POWER_LABELS[index] ?? undefined,
  }));

  const isaDeviationC = 0;
  const outsideAirTempC = isaTemperatureC(altitudeFt) + isaDeviationC;
  const cruise = lookupCruisePerformance(profile, altitudeFt, isaDeviationC, percentPower);

  const plan = useMemo(() => {
    if (!cruise) return null;
    return computeFuelPlan(profile.usableFuelGal, cruise.fuelFlowGph, cruise.ktas, reserveMinutes);
  }, [cruise, profile.usableFuelGal, reserveMinutes]);

  const tripHours = cruise && cruise.ktas > 0 ? tripDistanceNm / cruise.ktas : 0;
  const tripFuelGal = cruise ? tripHours * cruise.fuelFlowGph : 0;
  const reserveGal = plan?.reserveGal ?? 0;
  const tripFitsWithReserve = tripDistanceNm > 0 && tripFuelGal + reserveGal <= profile.usableFuelGal;

  return (
    <GradientScreen icon="⛽" title="Fuel Planning" footer="For planning only • Verify with POH">
      {profile.performanceDataSource === 'placeholder' ? (
        <PlaceholderBanner text="Demo data — built on the placeholder cruise table, not the POH yet." />
      ) : null}

      <Card>
        <LabeledSlider
          label="Altitude"
          valueLabel={`${altitudeFt.toLocaleString()} ft (${outsideAirTempC.toFixed(1)}°C ISA)`}
          min={0}
          max={profile.serviceCeilingFt}
          step={500}
          value={altitudeFt}
          onChange={setAltitudeFt}
        />
        <SegmentedControl
          label="Cruise Power"
          options={powerOptions}
          value={percentPower}
          onChange={setPercentPower}
        />
        <LabeledSlider
          label="Reserve"
          valueLabel={`${reserveMinutes} min`}
          min={0}
          max={90}
          step={5}
          value={reserveMinutes}
          onChange={setReserveMinutes}
        />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Endurance & Range</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Fuel Flow</Text>
          <Text style={styles.summaryValue}>{cruise ? `${cruise.fuelFlowGph.toFixed(1)} gph` : '—'}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Endurance (full fuel)</Text>
          <Text style={styles.summaryValue}>{plan ? formatHoursMinutes(plan.totalEnduranceHours) : '—'}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Reserve Fuel</Text>
          <Text style={styles.summaryValue}>{plan ? `${plan.reserveGal.toFixed(1)} gal` : '—'}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Usable Endurance (after reserve)</Text>
          <Text style={styles.summaryValue}>{plan ? formatHoursMinutes(plan.flightEnduranceHours) : '—'}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Range (after reserve)</Text>
          <Text style={styles.summaryValue}>{plan ? `${Math.round(plan.rangeNm)} nm` : '—'}</Text>
        </View>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Trip Fuel</Text>
        <NumberField label="Trip Distance" unit="nm" value={tripDistanceNm} onChange={setTripDistanceNm} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Time Enroute</Text>
          <Text style={styles.summaryValue}>{tripDistanceNm > 0 ? formatHoursMinutes(tripHours) : '—'}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Trip Fuel Burn</Text>
          <Text style={styles.summaryValue}>{tripDistanceNm > 0 ? `${tripFuelGal.toFixed(1)} gal` : '—'}</Text>
        </View>
        {tripDistanceNm > 0 ? (
          <ResultBadge
            ok={tripFitsWithReserve}
            okText="Trip fuel + reserve fits usable fuel"
            failText="Not enough fuel for this trip + reserve"
          />
        ) : null}
      </Card>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  cardTitle: { color: CalculatorColors.textPrimary, fontSize: 16, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { color: CalculatorColors.textSecondary, fontSize: 14 },
  summaryValue: { color: CalculatorColors.textPrimary, fontSize: 14, fontWeight: '700' },
});
