import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';

type NoticeTone = 'warning' | 'danger' | 'ok';

/** A bordered strip used for data-provenance warnings and limit results. */
export function Notice({ tone, children }: { tone: NoticeTone; children: string }) {
  const { colors } = useTheme();

  const background = { warning: colors.warningSoft, danger: colors.dangerSoft, ok: colors.okSoft }[tone];
  const border = { warning: colors.warningLine, danger: colors.dangerLine, ok: colors.okLine }[tone];

  return (
    <View style={[styles.notice, { backgroundColor: background, borderColor: border }]}>
      <Text variant="caption" tone={tone} style={styles.text}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
  },
  text: { lineHeight: 17 },
});
