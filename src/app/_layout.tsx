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
import { useEffect, useState } from 'react';

import AppTabs from '@/components/app-tabs';
import { AircraftProvider } from '@/context/aircraft-context';
import { FlightProvider } from '@/context/flight-context';
import { ThemeProvider, useTheme } from '@/design/theme';

SplashScreen.preventAutoHideAsync();

/**
 * How long to wait for fonts before showing the app in system type anyway.
 *
 * Long enough that a normal cold start never trips it, short enough that a
 * stalled load does not read as a broken app.
 */
const FONT_TIMEOUT_MS = 4000;

export default function RootLayout() {
  // Ionicons is loaded here too so tab icons can never render as missing-glyph
  // boxes during the window where the icon font hasn't resolved yet.
  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    ...Ionicons.font,
  });

  /**
   * The app must never be invisible because of a typeface.
   *
   * This used to be `if (!fontsLoaded) return null`, with the error from
   * useFonts discarded. A font that failed or simply never resolved therefore
   * rendered nothing, for ever, with no message and no error screen — a black
   * screen that looks exactly like a crash and tells you nothing. Wrong type
   * is a cosmetic problem; no app at all is not.
   *
   * So we give up waiting three ways: the fonts load, the fonts error, or the
   * clock runs out. Any of them shows the app.
   */
  const [waitedLongEnough, setWaitedLongEnough] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setWaitedLongEnough(true), FONT_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (fontError) {
      console.warn('Green Arc: falling back to system type, fonts failed to load.', fontError);
    }
  }, [fontError]);

  const ready = fontsLoaded || fontError != null || waitedLongEnough;

  useEffect(() => {
    // Hide on whichever of the three happened, or the splash outlives the app.
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <ThemeProvider>
      <AircraftProvider>
        {/* Inside AircraftProvider: the flight's fuel load is seeded and
            capped by the selected aircraft's tanks. */}
        <FlightProvider>
          <Chrome />
        </FlightProvider>
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
