import { StyleSheet, Text, TextInput, View } from 'react-native';

import { CalculatorColors, CalculatorSpacing } from '@/constants/calculator-theme';

export function NumberField({
  label,
  value,
  unit,
  onChange,
  placeholder = '0',
}: {
  label: string;
  value: number;
  unit?: string;
  onChange: (value: number) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          inputMode="decimal"
          placeholder={placeholder}
          placeholderTextColor={CalculatorColors.textFaint}
          value={value === 0 ? '' : String(value)}
          onChangeText={(text) => {
            const numeric = Number(text.replace(/[^0-9.]/g, ''));
            onChange(Number.isFinite(numeric) ? numeric : 0);
          }}
        />
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: CalculatorSpacing.sm,
  },
  label: { color: CalculatorColors.textPrimary, fontSize: 15, fontWeight: '600', flex: 1 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingHorizontal: CalculatorSpacing.md,
    gap: CalculatorSpacing.xs,
    minWidth: 110,
  },
  input: {
    color: CalculatorColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: CalculatorSpacing.sm,
    textAlign: 'right',
    flex: 1,
  },
  unit: { color: CalculatorColors.textFaint, fontSize: 12 },
});
