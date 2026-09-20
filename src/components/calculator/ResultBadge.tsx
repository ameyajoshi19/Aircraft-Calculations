import { StyleSheet, Text, View } from 'react-native';

import { CalculatorColors } from '@/constants/calculator-theme';

export function ResultBadge({ ok, okText, failText }: { ok: boolean; okText: string; failText: string }) {
  return (
    <View style={[styles.badge, ok ? styles.ok : styles.fail]}>
      <Text style={[styles.text, { color: ok ? CalculatorColors.okText : CalculatorColors.dangerText }]}>
        {ok ? okText : failText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  ok: { backgroundColor: CalculatorColors.okBg, borderColor: CalculatorColors.okBorder },
  fail: { backgroundColor: CalculatorColors.dangerBg, borderColor: CalculatorColors.dangerBorder },
  text: { fontSize: 13, fontWeight: '700' },
});
