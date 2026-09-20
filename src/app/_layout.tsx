import '@/global.css';

import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';

import AppTabs from '@/components/app-tabs';
import { AircraftProvider } from '@/context/aircraft-context';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <AircraftProvider>
      <AppTabs />
    </AircraftProvider>
  );
}
