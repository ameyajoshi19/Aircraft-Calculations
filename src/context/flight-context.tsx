import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useAircraft } from '@/context/aircraft-context';

const FUEL_KEY = 'fuel-on-board-gal';

interface FlightContextValue {
  /**
   * Fuel actually in the tanks for this flight, in gallons.
   *
   * This is a property of the flight, not of the aeroplane, which is why it
   * lives here rather than on the profile. Weight and balance, endurance,
   * range and the trip-fuel check all read it, so it is entered once and
   * cannot drift between screens: three independent fields for the same
   * quantity is three chances for them to disagree, and a range figure
   * computed from a different fuel load than the CG is worse than useless.
   */
  fuelOnBoardGal: number;
  setFuelOnBoardGal: (gallons: number) => void;
  /** True while fuel on board is still the full-tanks default. */
  isFullTanks: boolean;
}

const FlightContext = createContext<FlightContextValue | null>(null);

/** Reads the stored per-aircraft fuel loads, rejecting anything malformed. */
function parseStored(raw: string | null): Record<string, number> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, number> = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'number' && Number.isFinite(value) && value >= 0) out[id] = value;
    }
    return out;
  } catch {
    return {};
  }
}

export function FlightProvider({ children }: { children: ReactNode }) {
  const { selectedProfile } = useAircraft();
  const [stored, setStored] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(FUEL_KEY)
      .then((raw) => setStored(parseStored(raw)))
      .catch(() => {
        // Nothing persisted, or storage unavailable; full tanks is the default.
      })
      .finally(() => setLoaded(true));
  }, []);

  /**
   * Fuel on board is REMEMBERED rather than reset to full on each launch.
   *
   * The two ways to be wrong are not equal. Forgetting means the app quietly
   * reverts to the largest number it could show, and a stale full-tanks range
   * flatters every figure on three screens. Remembering can leave yesterday's
   * smaller load in place after a top-off, which understates range — the safe
   * direction — and the Cruise and Fuel screens both print the figure they
   * used, so a stale value is visible rather than silent.
   */
  const capacity = selectedProfile.usableFuelGal;
  const rememberedFor = useRef<string | null>(null);
  const remembered = stored[selectedProfile.id];
  const [fuelOnBoardGal, setFuel] = useState(capacity);

  // Re-seed when the aircraft changes, when its tanks are re-sized, or when
  // the persisted value first arrives from storage. Always clamped: a load
  // saved for a larger aeroplane must not survive onto a smaller one.
  const seedKey = `${selectedProfile.id}:${capacity}:${loaded}`;
  if (rememberedFor.current !== seedKey) {
    rememberedFor.current = seedKey;
    setFuel(Math.min(remembered ?? capacity, capacity));
  }

  const setFuelOnBoardGal = useCallback(
    (gallons: number) => {
      // You cannot carry more than the tanks hold, or less than none.
      const safe = Number.isFinite(gallons) ? gallons : 0;
      const clamped = Math.min(Math.max(safe, 0), capacity);
      setFuel(clamped);
      setStored((current) => {
        const next = { ...current, [selectedProfile.id]: clamped };
        AsyncStorage.setItem(FUEL_KEY, JSON.stringify(next)).catch(() => {
          // Still applies for this session even if it can't persist.
        });
        return next;
      });
    },
    [capacity, selectedProfile.id]
  );

  const value = useMemo<FlightContextValue>(
    () => ({
      fuelOnBoardGal,
      setFuelOnBoardGal,
      isFullTanks: fuelOnBoardGal >= capacity,
    }),
    [fuelOnBoardGal, setFuelOnBoardGal, capacity]
  );

  return <FlightContext.Provider value={value}>{children}</FlightContext.Provider>;
}

export function useFlight(): FlightContextValue {
  const ctx = useContext(FlightContext);
  if (!ctx) throw new Error('useFlight must be used within a FlightProvider');
  return ctx;
}
