import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';

/** A selectable block — used for picking the active aircraft. */
export function SelectRow({
  title,
  subtitle,
  selected,
  onPress,
  children,
}: {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
  children?: ReactNode;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.row,
        {
          borderColor: selected ? colors.accent : colors.hairline,
          backgroundColor: selected ? colors.accentSoft : 'transparent',
          opacity: pressed ? 0.7 : 1,
        },
      ]}>
      <View style={styles.head}>
        <View style={styles.heading}>
          <Text variant="value" tone={selected ? 'accent' : 'ink'}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="caption" tone="faint">
              {subtitle}
            </Text>
          ) : null}
        </View>
        {selected ? (
          <Text variant="label" tone="accent">
            Active
          </Text>
        ) : null}
      </View>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.lg,
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.md },
  heading: { gap: 2, flex: 1 },
});
