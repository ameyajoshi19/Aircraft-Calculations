import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/tabs';
import type { ColorValue } from 'react-native';

import { useTheme } from '@/design/theme';
import { fonts } from '@/design/tokens';

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

export default function AppTabs() {
  const { colors } = useTheme();

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
        },
        tabBarLabelStyle: {
          fontFamily: fonts.medium,
          fontSize: 11,
          letterSpacing: 0.2,
        },
      }}>
      {(Object.keys(ICONS) as Route[]).map((route) => (
        <Tabs.Screen
          key={route}
          name={route}
          options={{
            title: TITLES[route],
            tabBarIcon: (props) => <TabIcon name={route} {...props} />,
          }}
        />
      ))}
    </Tabs>
  );
}
