import { useState } from 'react';

import { Notice } from '@/components/ui/Notice';
import { Rule, Stat, StatRow } from '@/components/ui/Readout';
import { Screen, Section } from '@/components/ui/Screen';
import { FieldRow, Stepper } from '@/components/ui/Stepper';
import { useAircraft } from '@/context/aircraft-context';
import { useProfileState } from '@/hooks/use-profile-state';
import { isaTemperatureC, lookupFieldPerformance } from '@/lib/performance';

export default function TakeoffLandingScreen() {
  const { selectedProfile: profile } = useAircraft();

  const [altitudeFt, setAltitudeFt] = useState(0);
  const [oatC, setOatC] = useState(15);
  const [weightLbs, setWeightLbs] = useProfileState(
    profile,
    (p) => p.maxGrossWeightLbs,
    `${profile.id}:${profile.maxGrossWeightLbs}`
  );
  const [windKts, setWindKts] = useState(0);

  const isaDeviation = oatC - isaTemperatureC(altitudeFt);
  // The wind correction rates come from this aircraft's own table notes; they
  // differ between types, so they are never assumed here.
  const common = {
    pressureAltitudeFt: altitudeFt,
    oatC,
    windComponentKts: windKts,
    corrections: profile.fieldCorrections,
  };
  const grass = profile.fieldCorrections.dryGrassPercentOfGroundRoll;

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
      info={{
        title: 'About these figures',
        notes: [
          'Short field technique as specified in Section 4 of the POH, on a paved, level, dry runway, with zero wind before the wind correction is applied.',
          `Wind correction uses this aircraft's own table notes: distances decrease ${profile.fieldCorrections.headwind.percent}% for each ${profile.fieldCorrections.headwind.perKts} knots of headwind, and increase ${profile.fieldCorrections.tailwind.percent}% for each ${profile.fieldCorrections.tailwind.perKts} knots of tailwind up to ${profile.fieldCorrections.tailwind.maxKts} knots.`,
          grass
            ? `On dry grass, add ${grass.takeoff}% of the takeoff ground roll and ${grass.landing}% of the landing ground roll.`
            : `The ${profile.shortName} POH publishes no dry grass correction, so these figures are for a paved runway only.`,
          'The POH tabulates landing at the maximum landing weight only. A lighter aeroplane therefore gets the heavier figure, which errs long.',
          'Planning only. Verify every figure against the POH before flight.',
        ],
      }}>
      {profile.performanceDataSource === 'placeholder' ? (
        <Notice tone="warning">Placeholder distance tables — not transcribed from a POH.</Notice>
      ) : null}

      <Section>
        <FieldRow>
          <Stepper
            label="Pressure alt"
            valueLabel={`${altitudeFt.toLocaleString()} ft`}
            min={0}
            max={8000}
            step={250}
            value={altitudeFt}
            onChange={setAltitudeFt}
          />
          <Stepper
            label="Temperature"
            valueLabel={`${oatC}°C`}
            hint={`ISA ${isaDeviation >= 0 ? '+' : ''}${isaDeviation.toFixed(0)}°`}
            min={-20}
            max={45}
            step={1}
            value={oatC}
            onChange={setOatC}
          />
        </FieldRow>
        <FieldRow>
          <Stepper
            label="Wind"
            valueLabel={`${windKts >= 0 ? '+' : ''}${windKts} kt`}
            hint={windKts >= 0 ? 'headwind' : 'tailwind'}
            min={-10}
            max={20}
            step={1}
            value={windKts}
            onChange={setWindKts}
          />
          <Stepper
            label="Weight"
            valueLabel={`${weightLbs.toLocaleString()} lb`}
            min={Math.round(profile.emptyWeightLbs)}
            max={profile.maxGrossWeightLbs}
            step={25}
            value={weightLbs}
            onChange={setWeightLbs}
          />
        </FieldRow>
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
            No takeoff figures published for these conditions.
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
    </Screen>
  );
}
