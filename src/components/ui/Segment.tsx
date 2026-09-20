import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';

export interface SegmentOption<T extends string | number> {
  value: T;
  label: string;
  sublabel?: string;
}

export function Segment<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label?: string;
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {label ? (
        <Text variant="label" tone="muted">
          {label}
        </Text>
      ) : null}
      <View style={styles.row}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={String(option.value)}
              onPress={() => onChange(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={({ pressed }) => [
                styles.segment,
                {
                  borderColor: selected ? colors.accent : colors.hairline,
                  backgroundColor: selected ? colors.accentSoft : 'transparent',
                  opacity: pressed ? 0.7 : 1,
                },
              ]}>
              <Text variant="value" tone={selected ? 'accent' : 'muted'}>
                {option.label}
              </Text>
              {option.sublabel ? (
                <Text
                  variant="label"
                  tone={selected ? 'accent' : 'faint'}
                  style={styles.sublabel}>
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
  container: { gap: space.sm },
  row: { flexDirection: 'row', gap: space.sm },
  segment: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: space.md,
  },
  sublabel: { fontSize: 9, letterSpacing: 0.8, marginTop: 2 },
});
