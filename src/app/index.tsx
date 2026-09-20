import { useMemo, useState } from 'react';

import { Notice } from '@/components/ui/Notice';
import { Display, DisplayPair, Rule, Stat, StatRow } from '@/components/ui/Readout';
import { Screen, Section } from '@/components/ui/Screen';
import { Segment } from '@/components/ui/Segment';
import { SliderField } from '@/components/ui/SliderField';
import { useAircraft } from '@/context/aircraft-context';
import { isaTemperatureC, lookupCruisePerformance } from '@/lib/performance';

const POWER_LABELS = ['Economy', 'Balanced', 'Performance'];

export default function CruiseScreen() {
  const { selectedProfile: profile } = useAircraft();

  const [altitudeFt, setAltitudeFt] = useState(8000);
  const [percentPower, setPercentPower] = useState(profile.availablePowerSettings[0]);
  const [isaDeviationC, setIsaDeviationC] = useState(0);

  const powerOptions = useMemo(
    () =>
      profile.availablePowerSettings.map((value, index) => ({
        value,
        label: `${value}%`,
        sublabel: POWER_LABELS[index],
      })),
    [profile.availablePowerSettings]
  );

  const altitude = Math.min(altitudeFt, profile.serviceCeilingFt);
  const outsideAirTempC = isaTemperatureC(altitude) + isaDeviationC;
  const result = lookupCruisePerformance(profile, altitude, isaDeviationC, percentPower);
  const rangeNm =
    result && result.fuelFlowGph > 0
      ? Math.round(result.ktas * (profile.usableFuelGal / result.fuelFlowGph))
      : null;

  return (
    <Screen
      title="Cruise"
      subtitle={`${profile.shortName}${profile.tailNumber ? ` · ${profile.tailNumber}` : ''}`}
      footer="Planning only · Verify against the POH">
      {profile.performanceDataSource === 'placeholder' ? (
        <Notice tone="warning">Placeholder cruise data — not yet transcribed from the POH.</Notice>
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

        <Segment label="Power" options={powerOptions} value={percentPower} onChange={setPercentPower} />

        <SliderField
          label="Temperature"
          valueLabel={`ISA ${isaDeviationC >= 0 ? '+' : ''}${isaDeviationC}°`}
          hint={`${outsideAirTempC.toFixed(1)}°C`}
          min={-20}
          max={30}
          step={1}
          value={isaDeviationC}
          onChange={setIsaDeviationC}
        />
      </Section>

      <Rule />

      <DisplayPair>
        <Display label="MP" value={result ? result.manifoldPressureInHg.toFixed(1) : '—'} note="in Hg" />
        <Display label="RPM" value={result ? String(result.rpm) : '—'} note={`${result?.percentMcp ?? '—'}% MCP`} />
      </DisplayPair>

      <Rule />

      <StatRow>
        <Stat label="TAS" value={result ? String(result.ktas) : '—'} unit="kts" />
        <Stat label="Fuel" value={result ? result.fuelFlowGph.toFixed(1) : '—'} unit="gph" />
        <Stat label="Range" value={rangeNm !== null ? String(rangeNm) : '—'} unit="nm" />
      </StatRow>
    </Screen>
  );
}
