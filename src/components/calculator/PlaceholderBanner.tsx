import { StyleSheet, Text } from 'react-native';

import { CalculatorColors, CalculatorSpacing } from '@/constants/calculator-theme';

export function PlaceholderBanner({ text }: { text: string }) {
  return <Text style={styles.banner}>⚠️ {text}</Text>;
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: CalculatorColors.warningBg,
    borderColor: CalculatorColors.warningBorder,
    borderWidth: 1,
    borderRadius: 14,
    padding: CalculatorSpacing.md,
    color: CalculatorColors.warningText,
    fontSize: 13,
    fontWeight: '600',
  },
});
