import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InfoSheet } from '@/components/ui/InfoSheet';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design/theme';
import { space } from '@/design/tokens';

export function Screen({
  title,
  subtitle,
  footer,
  info,
  children,
}: {
  title: string;
  subtitle?: string;
  footer?: string;
  /**
   * The assumptions behind this screen's figures, shown behind an ⓘ in the
   * header rather than as a paragraph on the screen. See InfoSheet.
   */
  info?: { title: string; notes: string[] };
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
          <View style={styles.headerRow}>
            <View style={styles.header}>
              <Text variant="title">{title}</Text>
              {subtitle ? (
                <Text variant="caption" tone="faint" style={styles.subtitle}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            {info ? <InfoSheet title={info.title} notes={info.notes} /> : null}
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
    paddingBottom: space.md,
    // Was xxl, then xl. The screens are designed to fit a phone without
    // scrolling, and the gaps between sections are the cheapest place to find
    // that room — cheaper than type size, which stays as it is. A notched
    // iPhone gives 703px of content where an Android phone gave 751.
    gap: space.md,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.md },
  header: { gap: 2, flex: 1 },
  subtitle: { letterSpacing: 0.4 },
  footer: { textAlign: 'center', marginTop: space.sm },
  section: { gap: space.md },
});
