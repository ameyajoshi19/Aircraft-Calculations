import { Children, Fragment, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design/theme';
import { space } from '@/design/tokens';

/** Hairline divider. */
export function Rule({ inset = 0 }: { inset?: number }) {
  const { colors } = useTheme();
  return <View style={[styles.rule, { backgroundColor: colors.hairline, marginHorizontal: inset }]} />;
}

/** A large primary readout, e.g. MP or RPM. */
export function Display({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <View style={styles.display}>
      <Text variant="label" tone="muted">
        {label}
      </Text>
      {/* A four-digit RPM wrapped to two lines at 360px before this. */}
      <Text variant="display" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </Text>
      {note ? (
        <Text variant="caption" tone="faint">
          {note}
        </Text>
      ) : null}
    </View>
  );
}

/** Large readouts side by side, split by vertical hairlines. */
export function DisplayPair({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const items = Children.toArray(children);

  return (
    <View style={styles.pair}>
      {items.map((child, index) => (
        <Fragment key={index}>
          {index > 0 ? <View style={[styles.vRule, { backgroundColor: colors.hairline }]} /> : null}
          {child}
        </Fragment>
      ))}
    </View>
  );
}

/** A smaller labelled figure with a unit suffix. */
export function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="label" tone="muted" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {label}
      </Text>
      <View style={styles.statValueRow}>
        <Text variant="stat" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {value}
        </Text>
        {unit ? (
          <Text variant="unit" tone="faint">
            {unit}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return <View style={styles.statRow}>{children}</View>;
}

/** Label on the left, value on the right — for computed summary lines. */
export function DataRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'ink' | 'danger' | 'ok';
}) {
  return (
    <View style={styles.dataRow}>
      <Text variant="body" tone="muted">
        {label}
      </Text>
      <Text variant="value" tone={tone ?? 'ink'}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rule: { height: 1 },
  display: { flex: 1, gap: space.xs },
  // Was xl. At 360px that left each column 79px while a four-digit RPM needs
  // 82, so "2200" wrapped. Narrowing the gaps buys the width back without
  // touching the type size.
  pair: { flexDirection: 'row', gap: space.sm },
  vRule: { width: 1, alignSelf: 'stretch' },
  stat: { flex: 1, gap: space.xs },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  statRow: { flexDirection: 'row', gap: space.md },
  dataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
});
