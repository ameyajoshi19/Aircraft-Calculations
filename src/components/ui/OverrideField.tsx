import { StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design/theme';
import { fonts, radius, space } from '@/design/tokens';

/**
 * A field for a value that may be left unset.
 *
 * Unlike NumberField, blank here means "not entered" rather than zero: the
 * POH's own figure shows through as placeholder text, so it is always clear
 * whether a number is this aircraft's or the book's. That distinction matters
 * for weight and balance — the book's standard empty weight is a stand-in,
 * not a measurement of the aeroplane you are about to fly.
 */
export function NumericOverrideField({
  label,
  value,
  fallback,
  unit,
  hint,
  onChange,
}: {
  label: string;
  value: number | undefined;
  /** Shown greyed when nothing is entered. */
  fallback: number;
  unit?: string;
  hint?: string;
  onChange: (value: number | undefined) => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.block}>
      <View style={styles.row}>
        <Text variant="body" tone="muted" style={styles.label}>
          {label}
        </Text>
        <View style={[styles.inputWrap, { borderColor: colors.hairline }]}>
          <TextInput
            style={[styles.input, { color: colors.ink }]}
            keyboardType="numeric"
            inputMode="decimal"
            placeholder={String(fallback)}
            placeholderTextColor={colors.faint}
            selectionColor={colors.accent}
            value={value === undefined ? '' : String(value)}
            onChangeText={(text) => {
              const cleaned = text.replace(/[^0-9.]/g, '');
              if (cleaned === '') return onChange(undefined);
              const numeric = Number(cleaned);
              // Reject anything that isn't a real positive reading rather than
              // storing it; 0 lb is not a weighing result.
              onChange(Number.isFinite(numeric) && numeric > 0 ? numeric : undefined);
            }}
          />
          {unit ? (
            <Text variant="unit" tone="faint">
              {unit}
            </Text>
          ) : null}
        </View>
      </View>
      {hint ? (
        <Text variant="caption" tone="faint">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/** Free text, for a registration. Blank clears it. */
export function TextOverrideField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string | undefined;
  placeholder: string;
  onChange: (value: string | undefined) => void;
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
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder={placeholder}
          placeholderTextColor={colors.faint}
          selectionColor={colors.accent}
          value={value ?? ''}
          onChangeText={(text) => onChange(text.trim() === '' ? undefined : text)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  label: { flex: 1 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    minWidth: 118,
  },
  input: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 15,
    paddingVertical: space.sm,
    textAlign: 'right',
  },
});
