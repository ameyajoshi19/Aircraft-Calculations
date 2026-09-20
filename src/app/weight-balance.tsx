import { useMemo, useState } from 'react';

import { Notice } from '@/components/ui/Notice';
import { DataRow, Rule, Stat, StatRow } from '@/components/ui/Readout';
import { NumberField } from '@/components/ui/NumberField';
import { Screen, Section } from '@/components/ui/Screen';
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

  const overGross = !result.withinGrossWeight;
  const outOfEnvelope = !result.withinEnvelope;

  return (
    <Screen
      title="Weight & Balance"
      subtitle={`${profile.shortName}${profile.tailNumber ? ` · ${profile.tailNumber}` : ''}`}
      footer="Planning only · Verify against the POH">
      {profile.weightBalanceDataSource === 'placeholder' ? (
        <Notice tone="warning">
          Placeholder arms, envelope and empty weight — not yet taken from the POH or this
          aircraft&apos;s weighing record.
        </Notice>
      ) : null}

      <Section label="Load">
        {profile.stations.map((station) => (
          <NumberField
            key={station.id}
            label={station.label}
            unit="lb"
            max={station.maxWeight}
            value={stationWeights[station.id] ?? 0}
            onChange={(value) => setStationWeights((prev) => ({ ...prev, [station.id]: value }))}
          />
        ))}
        <NumberField
          label="Fuel"
          unit="gal"
          max={profile.usableFuelGal}
          value={fuelGal}
          onChange={setFuelGal}
        />
      </Section>

      <Rule />

      <StatRow>
        <Stat label="Weight" value={result.totalWeightLbs.toLocaleString()} unit="lb" />
        <Stat label="CG" value={result.cgInches.toFixed(2)} unit="in" />
      </StatRow>

      <Section label="Detail">
        <DataRow
          label="CG limits at this weight"
          value={`${result.forwardLimitInches.toFixed(1)} – ${result.aftLimitInches.toFixed(1)} in`}
          tone={outOfEnvelope ? 'danger' : 'ink'}
        />
        <DataRow
          label="Empty weight"
          value={`${profile.emptyWeightLbs.toLocaleString()} lb @ ${profile.emptyWeightArm.toFixed(1)} in`}
        />
        <DataRow label="Max gross" value={`${profile.maxGrossWeightLbs.toLocaleString()} lb`} />
        <DataRow
          label="Margin to gross"
          value={`${(profile.maxGrossWeightLbs - result.totalWeightLbs).toLocaleString()} lb`}
          tone={overGross ? 'danger' : 'ink'}
        />
      </Section>

      <Notice tone={overGross || outOfEnvelope ? 'danger' : 'ok'}>
        {overGross && outOfEnvelope
          ? 'Over max gross weight and CG outside the envelope.'
          : overGross
            ? 'Over max gross weight.'
            : outOfEnvelope
              ? 'CG outside the envelope for this weight.'
              : 'Within max gross weight and CG envelope.'}
      </Notice>
    </Screen>
  );
}
