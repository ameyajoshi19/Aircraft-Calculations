import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CalculatorColors, CalculatorSpacing } from '@/constants/calculator-theme';

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: string;
  sublabel?: string;
}

export function SegmentedControl<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label?: string;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.row}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={String(option.value)}
              onPress={() => onChange(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[styles.segment, selected && styles.segmentSelected]}>
              <Text style={[styles.segmentLabel, selected && styles.segmentLabelSelected]}>
                {option.label}
              </Text>
              {option.sublabel ? (
                <Text style={[styles.segmentSublabel, selected && styles.segmentLabelSelected]}>
                  {option.sublabel}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: CalculatorSpacing.sm },
  label: { color: CalculatorColors.textPrimary, fontSize: 15, fontWeight: '600' },
  row: { flexDirection: 'row', gap: CalculatorSpacing.sm },
  segment: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CalculatorColors.cardBorder,
    backgroundColor: CalculatorColors.card,
    paddingVertical: CalculatorSpacing.md,
    alignItems: 'center',
  },
  segmentSelected: {
    backgroundColor: CalculatorColors.cardSelected,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  segmentLabel: {
    color: CalculatorColors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  segmentSublabel: {
    color: CalculatorColors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  segmentLabelSelected: { color: CalculatorColors.textPrimary },
});
