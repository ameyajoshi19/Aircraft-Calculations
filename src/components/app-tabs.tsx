import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/tabs';
import type { ColorValue } from 'react-native';

import { useTheme } from '@/design/theme';
import { fonts } from '@/design/tokens';

const ICONS = {
  index: 'speedometer',
  'weight-balance': 'scale',
  'takeoff-landing': 'airplane',
  fuel: 'water',
  aircraft: 'options',
} as const;

type Route = keyof typeof ICONS;

const TITLES: Record<Route, string> = {
  index: 'Cruise',
  'weight-balance': 'W&B',
  'takeoff-landing': 'Takeoff',
  fuel: 'Fuel',
  aircraft: 'Aircraft',
};

function TabIcon({ name, focused, color }: { name: Route; focused: boolean; color: ColorValue }) {
  return (
    <Ionicons
      name={focused ? ICONS[name] : (`${ICONS[name]}-outline` as const)}
      size={21}
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
        tabBarInactiveTintColor: colors.faint,
        tabBarStyle: {
          backgroundColor: colors.canvas,
          borderTopColor: colors.hairline,
          borderTopWidth: 1,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.medium,
          fontSize: 10,
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
