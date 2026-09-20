import { useState } from 'react';

import { Notice } from '@/components/ui/Notice';
import { NumberField } from '@/components/ui/NumberField';
import { Rule, Stat, StatRow } from '@/components/ui/Readout';
import { Screen, Section } from '@/components/ui/Screen';
import { SliderField } from '@/components/ui/SliderField';
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
    <Screen
      title="Takeoff & Landing"
      subtitle={`${profile.shortName}${profile.tailNumber ? ` · ${profile.tailNumber}` : ''}`}
      footer="Planning only · Verify against the POH">
      {profile.performanceDataSource === 'placeholder' ? (
        <Notice tone="warning">
          Placeholder distance tables, and a generic wind correction — neither is from the POH yet.
        </Notice>
      ) : null}

      <Section>
        <SliderField
          label="Pressure altitude"
          valueLabel={`${altitudeFt.toLocaleString()} ft`}
          min={0}
          max={Math.min(profile.serviceCeilingFt, 10000)}
          step={500}
          value={altitudeFt}
          onChange={setAltitudeFt}
        />
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
        <SliderField
          label="Wind component"
          valueLabel={`${windKts >= 0 ? '+' : ''}${windKts} kt`}
          hint={windKts >= 0 ? 'headwind' : 'tailwind'}
          min={-10}
          max={20}
          step={1}
          value={windKts}
          onChange={setWindKts}
        />
        <NumberField
          label="Weight"
          unit="lb"
          max={profile.maxGrossWeightLbs}
          value={weightLbs}
          onChange={setWeightLbs}
        />
      </Section>

      <Rule />

      <Section label="Takeoff">
        <StatRow>
          <Stat label="Ground roll" value={takeoff ? takeoff.groundRollFt.toLocaleString() : '—'} unit="ft" />
          <Stat
            label="Over 50 ft"
            value={takeoff ? takeoff.distanceOver50ftFt.toLocaleString() : '—'}
            unit="ft"
          />
        </StatRow>
      </Section>

      <Section label="Landing">
        <StatRow>
          <Stat label="Ground roll" value={landing ? landing.groundRollFt.toLocaleString() : '—'} unit="ft" />
          <Stat
            label="Over 50 ft"
            value={landing ? landing.distanceOver50ftFt.toLocaleString() : '—'}
            unit="ft"
          />
        </StatRow>
      </Section>
    </Screen>
  );
}
