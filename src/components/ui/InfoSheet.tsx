import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';

/**
 * The ⓘ in a screen header, and the sheet it opens.
 *
 * Every screen carried a paragraph or two explaining what its figures assume —
 * which reserve, which runway surface, what is excluded. That text is true and
 * worth having, but it was costing 90-150px on screens that had none to spare,
 * and a pilot reads it once rather than on every look.
 *
 * So it moves here. What stays inline is anything that is a decision rather
 * than an explanation: out of envelope, target unreachable, placeholder data.
 */
export function InfoSheet({ title, notes }: { title: string; notes: string[] }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`About ${title}`}
        hitSlop={10}
        style={({ pressed }) => [
          styles.badge,
          { borderColor: colors.hairline, backgroundColor: pressed ? colors.accentSoft : 'transparent' },
        ]}>
        <Text variant="label" tone="muted">
          i
        </Text>
      </Pressable>

      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
        accessibilityViewIsModal>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={[styles.sheet, { backgroundColor: colors.canvas, borderColor: colors.hairline }]}>
          <SafeAreaView edges={['bottom']}>
            <View style={styles.grabber}>
              <View style={[styles.grabBar, { backgroundColor: colors.track }]} />
            </View>
            <View style={styles.head}>
              <Text variant="title">{title}</Text>
              <Pressable
                onPress={() => setOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={10}>
                <Text variant="value" tone="muted">
                  Done
                </Text>
              </Pressable>
            </View>
            <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
              {notes.map((note) => (
                <Text key={note} variant="caption" tone="muted" style={styles.note}>
                  {note}
                </Text>
              ))}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '72%',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
  },
  grabber: { alignItems: 'center', paddingTop: space.sm },
  grabBar: { width: 36, height: 4, borderRadius: radius.pill },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xl,
    paddingTop: space.md,
  },
  body: { marginTop: space.md },
  bodyContent: { paddingHorizontal: space.xl, paddingBottom: space.xl, gap: space.md },
  note: { lineHeight: 18 },
});
