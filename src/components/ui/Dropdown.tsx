import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';

export interface DropdownOption<T> {
  value: T;
  label: string;
  /** Secondary text shown to the right, e.g. "Economy". */
  note?: string;
}

export function Dropdown<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text variant="label" tone="muted">
          {label}
        </Text>
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${selected?.label ?? ''}`}
          style={({ pressed }) => [
            styles.trigger,
            { borderColor: colors.hairline, opacity: pressed ? 0.7 : 1 },
          ]}>
          <Text variant="value">{selected?.label ?? '—'}</Text>
          <Text variant="caption" tone="faint">
            ▾
          </Text>
        </Pressable>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.hairline }]}
            onPress={(event) => event.stopPropagation()}>
            <Text variant="label" tone="muted" style={styles.sheetTitle}>
              {label}
            </Text>
            <ScrollView bounces={false}>
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <Pressable
                    key={String(option.value)}
                    onPress={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    style={({ pressed }) => [
                      styles.option,
                      {
                        borderColor: colors.hairline,
                        backgroundColor: isSelected ? colors.accentSoft : 'transparent',
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}>
                    <Text variant="value" tone={isSelected ? 'accent' : 'ink'}>
                      {option.label}
                    </Text>
                    {option.note ? (
                      <Text variant="caption" tone={isSelected ? 'accent' : 'faint'}>
                        {option.note}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: space.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    minWidth: 128,
    justifyContent: 'space-between',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: space.xl,
  },
  sheet: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.lg,
    gap: space.sm,
    maxHeight: '70%',
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  sheetTitle: { marginBottom: space.xs },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    marginBottom: space.sm,
  },
});
