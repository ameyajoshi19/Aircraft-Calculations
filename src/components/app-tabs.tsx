import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/tabs';
import type { ColorValue } from 'react-native';

const ICONS = {
  index: 'speedometer',
  'weight-balance': 'scale',
  'takeoff-landing': 'airplane',
  fuel: 'water',
  aircraft: 'list',
} as const;

function TabIcon({
  name,
  focused,
  color,
}: {
  name: keyof typeof ICONS;
  focused: boolean;
  color: ColorValue;
}) {
  const iconName = focused ? ICONS[name] : (`${ICONS[name]}-outline` as const);
  return <Ionicons name={iconName} size={22} color={color} />;
}

export default function AppTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#5B6EE1',
        tabBarInactiveTintColor: '#9AA0AC',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Cruise',
          tabBarIcon: (props) => <TabIcon name="index" {...props} />,
        }}
      />
      <Tabs.Screen
        name="weight-balance"
        options={{
          title: 'W&B',
          tabBarIcon: (props) => <TabIcon name="weight-balance" {...props} />,
        }}
      />
      <Tabs.Screen
        name="takeoff-landing"
        options={{
          title: 'Takeoff/Ldg',
          tabBarIcon: (props) => <TabIcon name="takeoff-landing" {...props} />,
        }}
      />
      <Tabs.Screen
        name="fuel"
        options={{
          title: 'Fuel',
          tabBarIcon: (props) => <TabIcon name="fuel" {...props} />,
        }}
      />
      <Tabs.Screen
        name="aircraft"
        options={{
          title: 'Aircraft',
          tabBarIcon: (props) => <TabIcon name="aircraft" {...props} />,
        }}
      />
    </Tabs>
  );
}
