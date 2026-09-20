import Slider from '@react-native-community/slider';
import { StyleSheet, Text, View } from 'react-native';

import { CalculatorColors, CalculatorSpacing } from '@/constants/calculator-theme';

export function LabeledSlider({
  label,
  valueLabel,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  valueLabel: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{valueLabel}</Text>
      </View>
      <Slider
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor="rgba(255,255,255,0.9)"
        maximumTrackTintColor="rgba(255,255,255,0.28)"
        thumbTintColor="#FFFFFF"
        style={styles.slider}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: CalculatorSpacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: CalculatorColors.textPrimary, fontSize: 15, fontWeight: '600' },
  value: { color: CalculatorColors.textPrimary, fontSize: 15, fontWeight: '600' },
  slider: { width: '100%', height: 36 },
});
