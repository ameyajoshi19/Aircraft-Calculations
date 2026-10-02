import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/tabs';
import { StyleSheet, Text, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/design/theme';
import { fonts, space } from '@/design/tokens';

/**
 * Room for a 24px icon, its label, and breathing space above and below.
 *
 * The default bar left about 45px of usable height, which is not enough for
 * both: the icons lost their top edge and the labels their descenders. The
 * icon is 24 and the label line box 14, so 24 + 14 + 6 above + 6 below = 50,
 * plus a little slack.
 */
const BAR_CONTENT_HEIGHT = 56;

// Four tabs, not five: cruise and fuel were asking for the same conditions
// and showing overlapping answers, so they are one "Plan" screen now.
const ICONS = {
  index: 'speedometer',
  'weight-balance': 'scale',
  'takeoff-landing': 'airplane',
  aircraft: 'list',
} as const;

type Route = keyof typeof ICONS;

const TITLES: Record<Route, string> = {
  index: 'Plan',
  'weight-balance': 'W&B',
  'takeoff-landing': 'Takeoff',
  aircraft: 'Aircraft',
};

function TabIcon({ name, focused, color }: { name: Route; focused: boolean; color: ColorValue }) {
  return (
    <Ionicons
      name={focused ? ICONS[name] : (`${ICONS[name]}-outline` as const)}
      size={24}
      color={color as string}
    />
  );
}

/**
 * The tab label, rendered here rather than left to the navigator.
 *
 * React Navigation gives its own label a fixed 9px box with overflow hidden,
 * which cut the bottom off every glyph of an 11px font. `tabBarLabelStyle`
 * cannot widen that box, so the label is supplied as a component instead.
 */
function TabLabel({ name, color }: { name: Route; color: ColorValue }) {
  return (
    <Text style={[styles.label, { color: color as string }]}>
      {TITLES[name]}
    </Text>
  );
}

export default function AppTabs() {
  const { colors } = useTheme();
  // Android gesture navigation and iOS home indicators eat into the bottom of
  // the screen; the bar has to sit above that, not under it.
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        // `muted`, not `faint`: faint on canvas is ~2.3:1, below the 3:1
        // minimum for UI elements, and thin icon strokes washed out at
        // small sizes.
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.canvas,
          borderTopColor: colors.hairline,
          borderTopWidth: 1,
          elevation: 0,
          height: BAR_CONTENT_HEIGHT + insets.bottom,
          paddingTop: space.xs + 2,
          paddingBottom: space.xs + 2 + insets.bottom,
        },
        tabBarIconStyle: { height: 24 },
      }}>
      {(Object.keys(ICONS) as Route[]).map((route) => (
        <Tabs.Screen
          key={route}
          name={route}
          options={{
            title: TITLES[route],
            tabBarIcon: (props) => <TabIcon name={route} {...props} />,
            tabBarLabel: (props) => <TabLabel name={route} color={props.color} />,
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.medium,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.2,
    textAlign: 'center',
    // Space Grotesk at 11px needs about 13px of line box; anything tighter
    // clips the descenders.
    includeFontPadding: false,
  },
});
