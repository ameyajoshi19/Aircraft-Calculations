import '@/global.css';

import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
  useFonts,
} from '@expo-google-fonts/space-grotesk';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import AppTabs from '@/components/app-tabs';
import { AircraftProvider } from '@/context/aircraft-context';
import { ThemeProvider, useTheme } from '@/design/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Ionicons is loaded here too so tab icons can never render as missing-glyph
  // boxes during the window where the icon font hasn't resolved yet.
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    ...Ionicons.font,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider>
      <AircraftProvider>
        <Chrome />
      </AircraftProvider>
    </ThemeProvider>
  );
}

function Chrome() {
  const { scheme } = useTheme();
  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <AppTabs />
    </>
  );
}
