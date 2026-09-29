import { useMemo, useState } from 'react';

import { Dropdown } from '@/components/ui/Dropdown';
import { Notice } from '@/components/ui/Notice';
import { NumberField } from '@/components/ui/NumberField';
import { DataRow, Rule, Stat, StatRow } from '@/components/ui/Readout';
import { Screen, Section } from '@/components/ui/Screen';
import { Segment } from '@/components/ui/Segment';
import { SliderField } from '@/components/ui/SliderField';
import { useAircraft } from '@/context/aircraft-context';
import { useProfileState } from '@/hooks/use-profile-state';
import { solveCruise } from '@/lib/cruise';
import { computeFuelPlan, isaTemperatureC } from '@/lib/performance';

const AUTO = 'auto' as const;

function hoursMinutes(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  return `${Math.floor(totalMinutes / 60)}h ${String(totalMinutes % 60).padStart(2, '0')}m`;
}

export default function FuelScreen() {
  const { selectedProfile: profile } = useAircraft();

  const [altitudeFt, setAltitudeFt] = useState(8000);
  const [targetPercentPower, setTargetPercentPower] = useProfileState(
    profile,
    (p) => p.targetPowerPresets[0].percentPower
  );
  const [rpmChoice, setRpmChoice] = useProfileState<number | typeof AUTO>(profile, () => AUTO);
  const [reserveMinutes, setReserveMinutes] = useState(45);
  const [tripDistanceNm, setTripDistanceNm] = useState(0);

  const altitude = Math.min(altitudeFt, profile.serviceCeilingFt);

  const solution = useMemo(
    () =>
      solveCruise(profile.cruise, {
        altitudeFt: altitude,
        oatC: isaTemperatureC(altitude),
        targetPercentPower,
        rpm: rpmChoice === AUTO ? undefined : rpmChoice,
      }),
    [profile.cruise, altitude, targetPercentPower, rpmChoice]
  );

  const powerOptions = useMemo(
    () =>
      profile.targetPowerPresets.map((preset) => ({
        value: preset.percentPower,
        label: `${preset.percentPower}%`,
        sublabel: preset.label,
      })),
    [profile.targetPowerPresets]
  );

  const rpmOptions = useMemo(
    () => [
      {
        value: AUTO as number | typeof AUTO,
        label: 'Auto',
        note:
          profile.cruise.propeller === 'fixed-pitch'
            ? 'RPM that makes the target'
            : 'Lowest RPM that reaches target',
      },
      ...profile.rpmPresets.map((preset) => ({
        value: preset.rpm as number | typeof AUTO,
        label: `${preset.rpm} RPM`,
        note: preset.label,
      })),
    ],
    [profile.rpmPresets, profile.cruise.propeller]
  );

  const plan = useMemo(
    () =>
      solution
        ? computeFuelPlan(profile.usableFuelGal, solution.gph, solution.ktas, reserveMinutes)
        : null,
    [solution, profile.usableFuelGal, reserveMinutes]
  );

  const tripHours = solution && solution.ktas > 0 ? tripDistanceNm / solution.ktas : 0;
  const tripFuelGal = solution ? tripHours * solution.gph : 0;
  const tripPlanned = tripDistanceNm > 0 && solution !== null;
  const tripFits = tripPlanned && tripFuelGal + (plan?.reserveGal ?? 0) <= profile.usableFuelGal;

  return (
    <Screen
      title="Fuel"
      subtitle={`${profile.shortName}${profile.tailNumber ? ` · ${profile.tailNumber}` : ''}`}
      footer="Planning only · Verify against the POH">
      {profile.performanceDataSource === 'placeholder' ? (
        <Notice tone="warning">Built on placeholder cruise data, not a POH.</Notice>
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
        <Segment
          label="Target power"
          options={powerOptions}
          value={targetPercentPower}
          onChange={setTargetPercentPower}
        />
        <Dropdown label="RPM" value={rpmChoice} options={rpmOptions} onChange={setRpmChoice} />
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
        <Stat label="Burn" value={solution ? solution.gph.toFixed(1) : '—'} unit="gph" />
        <Stat label="Endurance" value={plan ? hoursMinutes(plan.flightEnduranceHours) : '—'} />
        <Stat label="Range" value={plan ? String(Math.round(plan.rangeNm)) : '—'} unit="nm" />
      </StatRow>

      <Section label="Breakdown">
        <DataRow
          label="Setting"
          value={
            solution
              ? solution.manifoldPressureInHg !== undefined
                ? `${solution.rpm} RPM · ${solution.manifoldPressureInHg.toFixed(1)}"`
                : `${solution.rpm} RPM`
              : '—'
          }
        />
        <DataRow
          label="Power delivered"
          value={solution ? `${solution.percentPower}% ${profile.cruise.percentPowerLabel}` : '—'}
        />
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

      <Notice tone="warning">
        Range and endurance assume cruise for the whole flight. They exclude the fuel for start,
        taxi, takeoff and climb — the POH allows 1.7 gal for start, taxi and takeoff alone.
      </Notice>
    </Screen>
  );
}
