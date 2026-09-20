import { useMemo, useState } from 'react';

import { Notice } from '@/components/ui/Notice';
import { NumberField } from '@/components/ui/NumberField';
import { DataRow, Rule, Stat, StatRow } from '@/components/ui/Readout';
import { Screen, Section } from '@/components/ui/Screen';
import { Segment } from '@/components/ui/Segment';
import { SliderField } from '@/components/ui/SliderField';
import { useAircraft } from '@/context/aircraft-context';
import { computeFuelPlan, lookupCruisePerformance } from '@/lib/performance';

const POWER_LABELS = ['Economy', 'Balanced', 'Performance'];

function hoursMinutes(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  return `${Math.floor(totalMinutes / 60)}h ${String(totalMinutes % 60).padStart(2, '0')}m`;
}

export default function FuelScreen() {
  const { selectedProfile: profile } = useAircraft();

  const [altitudeFt, setAltitudeFt] = useState(8000);
  const [percentPower, setPercentPower] = useState(profile.availablePowerSettings[0]);
  const [reserveMinutes, setReserveMinutes] = useState(45);
  const [tripDistanceNm, setTripDistanceNm] = useState(0);

  const powerOptions = profile.availablePowerSettings.map((value, index) => ({
    value,
    label: `${value}%`,
    sublabel: POWER_LABELS[index],
  }));

  const cruise = lookupCruisePerformance(profile, altitudeFt, 0, percentPower);

  const plan = useMemo(
    () =>
      cruise
        ? computeFuelPlan(profile.usableFuelGal, cruise.fuelFlowGph, cruise.ktas, reserveMinutes)
        : null,
    [cruise, profile.usableFuelGal, reserveMinutes]
  );

  const tripHours = cruise && cruise.ktas > 0 ? tripDistanceNm / cruise.ktas : 0;
  const tripFuelGal = cruise ? tripHours * cruise.fuelFlowGph : 0;
  const tripPlanned = tripDistanceNm > 0 && cruise !== null;
  const tripFits = tripPlanned && tripFuelGal + (plan?.reserveGal ?? 0) <= profile.usableFuelGal;

  return (
    <Screen
      title="Fuel"
      subtitle={`${profile.shortName}${profile.tailNumber ? ` · ${profile.tailNumber}` : ''}`}
      footer="Planning only · Verify against the POH">
      {profile.performanceDataSource === 'placeholder' ? (
        <Notice tone="warning">Built on the placeholder cruise table — not POH data yet.</Notice>
      ) : null}

      <Section>
        <SliderField
          label="Altitude"
          valueLabel={`${altitudeFt.toLocaleString()} ft`}
          min={0}
          max={profile.serviceCeilingFt}
          step={500}
          value={altitudeFt}
          onChange={setAltitudeFt}
        />
        <Segment label="Power" options={powerOptions} value={percentPower} onChange={setPercentPower} />
        <SliderField
          label="Reserve"
          valueLabel={`${reserveMinutes} min`}
          min={0}
          max={90}
          step={5}
          value={reserveMinutes}
          onChange={setReserveMinutes}
        />
      </Section>

      <Rule />

      <StatRow>
        <Stat label="Burn" value={cruise ? cruise.fuelFlowGph.toFixed(1) : '—'} unit="gph" />
        <Stat label="Endurance" value={plan ? hoursMinutes(plan.flightEnduranceHours) : '—'} />
        <Stat label="Range" value={plan ? String(Math.round(plan.rangeNm)) : '—'} unit="nm" />
      </StatRow>

      <Section label="Breakdown">
        <DataRow label="Usable fuel" value={`${profile.usableFuelGal} gal`} />
        <DataRow label="Reserve" value={plan ? `${plan.reserveGal.toFixed(1)} gal` : '—'} />
        <DataRow
          label="Endurance on full fuel"
          value={plan ? hoursMinutes(plan.totalEnduranceHours) : '—'}
        />
      </Section>

      <Rule />

      <Section label="Trip">
        <NumberField label="Distance" unit="nm" value={tripDistanceNm} onChange={setTripDistanceNm} />
        <DataRow label="Time enroute" value={tripPlanned ? hoursMinutes(tripHours) : '—'} />
        <DataRow label="Fuel required" value={tripPlanned ? `${tripFuelGal.toFixed(1)} gal` : '—'} />
      </Section>

      {tripPlanned ? (
        <Notice tone={tripFits ? 'ok' : 'danger'}>
          {tripFits
            ? 'Trip fuel plus reserve fits within usable fuel.'
            : 'Trip fuel plus reserve exceeds usable fuel.'}
        </Notice>
      ) : null}
    </Screen>
  );
}
