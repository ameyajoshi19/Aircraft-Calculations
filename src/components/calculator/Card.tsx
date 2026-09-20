import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { CalculatorColors, CalculatorRadii, CalculatorSpacing } from '@/constants/calculator-theme';

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CalculatorColors.card,
    borderColor: CalculatorColors.cardBorder,
    borderWidth: 1,
    borderRadius: CalculatorRadii.card,
    padding: CalculatorSpacing.lg,
    gap: CalculatorSpacing.md,
  },
});
