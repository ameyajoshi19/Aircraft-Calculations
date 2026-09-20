import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CalculatorColors, CalculatorSpacing } from '@/constants/calculator-theme';

export function StatTile({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.unit}>{unit}</Text>
    </View>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: CalculatorSpacing.sm,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingVertical: CalculatorSpacing.md,
    gap: 2,
  },
  label: {
    color: CalculatorColors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  value: {
    color: CalculatorColors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
  },
  unit: {
    color: CalculatorColors.textFaint,
    fontSize: 12,
  },
});
