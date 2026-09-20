import { StyleSheet, View } from 'react-native';

import { Slider } from '@/components/ui/Slider';
import { Text } from '@/components/ui/Text';
import { space } from '@/design/tokens';

export function SliderField({
  label,
  value,
  valueLabel,
  hint,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  valueLabel: string;
  /** Secondary value shown next to the primary one, e.g. the resulting OAT. */
  hint?: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text variant="label" tone="muted">
          {label}
        </Text>
        <View style={styles.valueRow}>
          <Text variant="value">{valueLabel}</Text>
          {hint ? (
            <Text variant="caption" tone="faint">
              {hint}
            </Text>
          ) : null}
        </View>
      </View>
      <Slider
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: space.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
});
