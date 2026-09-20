import { StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design/theme';
import { fonts, radius, space } from '@/design/tokens';

export function NumberField({
  label,
  value,
  unit,
  onChange,
  max,
}: {
  label: string;
  value: number;
  unit?: string;
  onChange: (value: number) => void;
  /** Clamps entry to this ceiling, e.g. a baggage compartment limit. */
  max?: number;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      <Text variant="body" tone="muted" style={styles.label}>
        {label}
      </Text>
      <View style={[styles.inputWrap, { borderColor: colors.hairline }]}>
        <TextInput
          style={[styles.input, { color: colors.ink }]}
          keyboardType="numeric"
          inputMode="decimal"
          placeholder="0"
          placeholderTextColor={colors.faint}
          selectionColor={colors.accent}
          value={value === 0 ? '' : String(value)}
          onChangeText={(text) => {
            const numeric = Number(text.replace(/[^0-9.]/g, ''));
            const safe = Number.isFinite(numeric) ? numeric : 0;
            onChange(max !== undefined ? Math.min(safe, max) : safe);
          }}
        />
        {unit ? (
          <Text variant="unit" tone="faint">
            {unit}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  label: { flex: 1 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    minWidth: 104,
  },
  input: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 15,
    paddingVertical: space.sm,
    textAlign: 'right',
  },
});
