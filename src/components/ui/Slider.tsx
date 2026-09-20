import { useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';

import { useTheme } from '@/design/theme';

const THUMB = 18;
const TRACK = 3;
const HIT_HEIGHT = 32;

/**
 * Minimal cross-platform slider.
 *
 * Written in-house rather than using @react-native-community/slider, which
 * treats a value of exactly 0 as "unset" (`!value ? undefined : value`) and
 * so pins the thumb to the minimum — 0 is a normal value here (ISA deviation,
 * wind component), not an absent one.
 */
export function Slider({
  min,
  max,
  step,
  value,
  onChange,
  accessibilityLabel,
}: {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  const grantX = useRef(0);

  // Reassigned every render so the PanResponder (created once) always calls
  // the current props rather than the ones captured at mount.
  const handleRef = useRef<(x: number) => void>(() => {});
  handleRef.current = (x: number) => {
    const trackWidth = widthRef.current;
    if (trackWidth <= 0) return;
    const fraction = Math.min(Math.max(x / trackWidth, 0), 1);
    const raw = min + fraction * (max - min);
    const stepped = Math.round((raw - min) / step) * step + min;
    onChange(Math.min(Math.max(stepped, min), max));
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        grantX.current = event.nativeEvent.locationX;
        handleRef.current(grantX.current);
      },
      onPanResponderMove: (_event, gesture) => {
        handleRef.current(grantX.current + gesture.dx);
      },
    })
  ).current;

  const range = max - min;
  const fraction = range > 0 ? Math.min(Math.max((value - min) / range, 0), 1) : 0;

  return (
    <View
      {...responder.panHandlers}
      onLayout={(event) => {
        const next = event.nativeEvent.layout.width;
        widthRef.current = next;
        setWidth(next);
      }}
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min, max, now: value }}
      style={styles.hitArea}>
      <View style={[styles.track, { backgroundColor: colors.track }]}>
        <View style={[styles.fill, { backgroundColor: colors.accent, width: `${fraction * 100}%` }]} />
      </View>
      <View
        style={[
          styles.thumb,
          {
            backgroundColor: colors.canvas,
            borderColor: colors.accent,
            left: Math.max(width - THUMB, 0) * fraction,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hitArea: { height: HIT_HEIGHT, justifyContent: 'center' },
  track: { height: TRACK, borderRadius: TRACK / 2, overflow: 'hidden' },
  fill: { height: TRACK, borderRadius: TRACK / 2 },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 2,
  },
});
