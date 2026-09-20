import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design/theme';
import { space } from '@/design/tokens';

export function Screen({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string;
  subtitle?: string;
  footer?: string;
  children: ReactNode;
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: colors.canvas }]}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text variant="title">{title}</Text>
            {subtitle ? (
              <Text variant="caption" tone="faint" style={styles.subtitle}>
                {subtitle}
              </Text>
            ) : null}
          </View>

          {children}

          {footer ? (
            <Text variant="caption" tone="faint" style={styles.footer}>
              {footer}
            </Text>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/** Groups related rows under a small uppercase label. */
export function Section({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      {label ? (
        <Text variant="label" tone="muted">
          {label}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  content: {
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: space.xxxl,
    gap: space.xxl,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  header: { gap: 2 },
  subtitle: { letterSpacing: 0.4 },
  footer: { textAlign: 'center', marginTop: space.sm },
  section: { gap: space.lg },
});
