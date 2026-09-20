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
  const [oatC, setOatC] = useState(15);
  const [weightLbs, setWeightLbs] = useState(profile.maxGrossWeightLbs);
  const [windKts, setWindKts] = useState(0);

  const isaDeviation = oatC - isaTemperatureC(altitudeFt);
  const common = { pressureAltitudeFt: altitudeFt, oatC, windComponentKts: windKts };

  const takeoff = lookupFieldPerformance(profile.takeoff, { ...common, weightLbs });
  // The POH tabulates landing at the maximum landing weight only, so a lighter
  // aeroplane gets the heavier figure — conservative, which is the right way to err.
  const landing = lookupFieldPerformance(profile.landing, {
    ...common,
    weightLbs: Math.min(weightLbs, profile.maxLandingWeightLbs),
  });

  return (
    <Screen
      title="Takeoff & Landing"
      subtitle={`${profile.shortName}${profile.tailNumber ? ` · ${profile.tailNumber}` : ''}`}
      footer="Planning only · Verify against the POH">
      {profile.performanceDataSource === 'placeholder' ? (
        <Notice tone="warning">Placeholder distance tables — not transcribed from a POH.</Notice>
      ) : null}

      <Section>
        <SliderField
          label="Pressure altitude"
          valueLabel={`${altitudeFt.toLocaleString()} ft`}
          min={0}
          max={8000}
          step={250}
          value={altitudeFt}
          onChange={setAltitudeFt}
        />
        <SliderField
          label="Temperature"
          valueLabel={`${oatC}°C`}
          hint={`ISA ${isaDeviation >= 0 ? '+' : ''}${isaDeviation.toFixed(0)}°`}
          min={-20}
          max={45}
          step={1}
          value={oatC}
          onChange={setOatC}
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

      <Section label="Takeoff · short field">
        {takeoff ? (
          <StatRow>
            <Stat label="Ground roll" value={takeoff.groundRollFt.toLocaleString()} unit="ft" />
            <Stat label="Over 50 ft" value={takeoff.distanceOver50ftFt.toLocaleString()} unit="ft" />
          </StatRow>
        ) : (
          <Notice tone="danger">
            The POH publishes no takeoff figures for these conditions. Above 30°C the charts stop
            early, because climb performance after lift-off drops below 150 fpm.
          </Notice>
        )}
      </Section>

      <Section label="Landing · short field">
        {landing ? (
          <StatRow>
            <Stat label="Ground roll" value={landing.groundRollFt.toLocaleString()} unit="ft" />
            <Stat label="Over 50 ft" value={landing.distanceOver50ftFt.toLocaleString()} unit="ft" />
          </StatRow>
        ) : (
          <Notice tone="danger">The POH publishes no landing figures for these conditions.</Notice>
        )}
        {landing && weightLbs > profile.maxLandingWeightLbs ? (
          <Notice tone="warning">
            {`Above the ${profile.maxLandingWeightLbs.toLocaleString()} lb maximum landing weight. Figures shown are for that weight.`}
          </Notice>
        ) : null}
      </Section>

      <Notice tone="warning">
        Short field technique, paved level dry runway, zero wind before the wind correction. Dry
        grass adds 15% of the takeoff ground roll and 45% of the landing ground roll.
      </Notice>
    </Screen>
  );
}
