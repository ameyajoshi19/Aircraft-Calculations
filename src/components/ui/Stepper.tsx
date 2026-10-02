import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';

/**
 * A compact value control: minus, the value, plus.
 *
 * Replaces a full-width slider, which cost a label row plus a track — about
 * 68px each, stacked. Two of these sit side by side in roughly the height of
 * one slider.
 *
 * It is also the more honest control for these quantities. A slider asks you
 * to find 8,000 ft with your thumb somewhere along a 20,000 ft track; a
 * stepper moves in the increment the POH tabulates, so every value you can
 * reach is one the tables actually address.
 *
 * Holding is not implemented: these ranges are short enough to tap, and a
 * repeat-on-hold that overshoots a pressure altitude is worse than a tap.
 */
export function Stepper({
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
  /** Rendered value, including its unit — e.g. "8,000 ft". */
  valueLabel: string;
  /** Optional second line, e.g. the OAT a given ISA deviation implies. */
  hint?: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const { colors } = useTheme();

  const clamp = (next: number) => Math.min(Math.max(next, min), max);
  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <View style={[styles.wrap, { borderColor: colors.hairline }]}>
      <Text variant="label" tone="faint" numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.row}>
        <Button
          glyph="−"
          disabled={atMin}
          onPress={() => onChange(clamp(value - step))}
          accessibilityLabel={`Decrease ${label}`}
        />
        <View style={styles.valueBox}>
          <Text variant="value" numberOfLines={1} adjustsFontSizeToFit>
            {valueLabel}
          </Text>
          {hint ? (
            <Text variant="caption" tone="faint" numberOfLines={1}>
              {hint}
            </Text>
          ) : null}
        </View>
        <Button
          glyph="+"
          disabled={atMax}
          onPress={() => onChange(clamp(value + step))}
          accessibilityLabel={`Increase ${label}`}
        />
      </View>
    </View>
  );
}

function Button({
  glyph,
  onPress,
  disabled,
  accessibilityLabel,
}: {
  glyph: string;
  onPress: () => void;
  disabled: boolean;
  accessibilityLabel: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      // A 28pt box inside a 44pt hit area: compact on screen, still reachable
      // with a thumb in turbulence.
      hitSlop={8}
      style={({ pressed }) => [
        styles.btn,
        {
          borderColor: colors.hairline,
          backgroundColor: pressed ? colors.accentSoft : colors.canvas,
          opacity: disabled ? 0.35 : 1,
        },
      ]}>
      <Text variant="value" tone={disabled ? 'faint' : 'muted'}>
        {glyph}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingTop: space.sm,
    paddingBottom: space.sm,
    gap: space.xs,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  valueBox: { flex: 1, alignItems: 'center' },
  btn: {
    width: 28,
    height: 28,
    borderWidth: 1,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

/** Lays fields out two per row, which is what makes the compact grid compact. */
export function FieldRow({ children }: { children: React.ReactNode }) {
  return <View style={styles2.row}>{children}</View>;
}

const styles2 = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm, alignItems: 'stretch' },
});
