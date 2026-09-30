import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { aircraftProfiles, defaultAircraftProfileId } from '@/data/aircraft-profiles';
import type { AircraftProfile, AirframeOverrides } from '@/types/aircraft';

const SELECTED_KEY = 'selected-aircraft-profile-id';
const AIRFRAMES_KEY = 'airframe-overrides';

interface AircraftContextValue {
  /** Each model, with this airframe's own figures applied. */
  profiles: AircraftProfile[];
  selectedProfile: AircraftProfile;
  selectProfile: (id: string) => void;
  /** What the owner has entered for a model, before defaults are applied. */
  overridesFor: (profileId: string) => AirframeOverrides;
  /** The model's own figures, with nothing overridden. */
  bookProfile: (profileId: string) => AircraftProfile;
  setOverride: <K extends keyof AirframeOverrides>(
    profileId: string,
    key: K,
    value: AirframeOverrides[K]
  ) => void;
  clearOverrides: (profileId: string) => void;
}

const AircraftContext = createContext<AircraftContextValue | null>(null);

/**
 * Applies an airframe's own figures over the model's.
 *
 * An override is used only when it is actually set. A blank field is not a
 * zero: an empty weight of 0 lb is not a reading anyone took, so an unset
 * value falls through to the book's standard figure rather than to nothing.
 */
function withOverrides(profile: AircraftProfile, overrides: AirframeOverrides): AircraftProfile {
  return {
    ...profile,
    tailNumber: overrides.tailNumber?.trim() || undefined,
    emptyWeightLbs: overrides.emptyWeightLbs ?? profile.emptyWeightLbs,
    emptyWeightArm: overrides.emptyWeightArm ?? profile.emptyWeightArm,
    usableFuelGal: overrides.usableFuelGal ?? profile.usableFuelGal,
  };
}

/** Reads stored overrides defensively — persisted JSON is not to be trusted. */
function parseOverrides(raw: string | null): Record<string, AirframeOverrides> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, AirframeOverrides> = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!aircraftProfiles.some((p) => p.id === id)) continue;
      if (!value || typeof value !== 'object') continue;
      const v = value as Record<string, unknown>;
      const entry: AirframeOverrides = {};
      if (typeof v.tailNumber === 'string') entry.tailNumber = v.tailNumber;
      // A stored weight must be a real positive number; anything else is
      // treated as unset so the book's figure shows instead of a bad one.
      if (typeof v.emptyWeightLbs === 'number' && v.emptyWeightLbs > 0) {
        entry.emptyWeightLbs = v.emptyWeightLbs;
      }
      if (typeof v.emptyWeightArm === 'number' && v.emptyWeightArm > 0) {
        entry.emptyWeightArm = v.emptyWeightArm;
      }
      if (typeof v.usableFuelGal === 'number' && v.usableFuelGal > 0) {
        entry.usableFuelGal = v.usableFuelGal;
      }
      out[id] = entry;
    }
    return out;
  } catch {
    return {};
  }
}

export function AircraftProvider({ children }: { children: ReactNode }) {
  const [selectedId, setSelectedId] = useState(defaultAircraftProfileId);
  const [overrides, setOverrides] = useState<Record<string, AirframeOverrides>>({});

  useEffect(() => {
    // getMany, not multiGet: v3 of this package returns a keyed object rather
    // than the array of pairs the older API gave.
    AsyncStorage.getMany([SELECTED_KEY, AIRFRAMES_KEY])
      .then((stored) => {
        const id = stored[SELECTED_KEY];
        if (id && aircraftProfiles.some((p) => p.id === id)) setSelectedId(id);
        setOverrides(parseOverrides(stored[AIRFRAMES_KEY] ?? null));
      })
      .catch(() => {
        // Nothing persisted yet (first launch, or storage unavailable); the
        // book's own figures are a working default.
      });
  }, []);

  const selectProfile = useCallback((id: string) => {
    setSelectedId(id);
    AsyncStorage.setItem(SELECTED_KEY, id).catch(() => {
      // Selection still applies for this session even if it can't persist.
    });
  }, []);

  const persist = useCallback((next: Record<string, AirframeOverrides>) => {
    setOverrides(next);
    AsyncStorage.setItem(AIRFRAMES_KEY, JSON.stringify(next)).catch(() => {
      // Entry still applies for this session even if it can't persist.
    });
  }, []);

  const setOverride = useCallback<AircraftContextValue['setOverride']>(
    (profileId, key, value) => {
      setOverrides((current) => {
        const entry = { ...(current[profileId] ?? {}) };
        if (value === undefined || value === '') delete entry[key];
        else entry[key] = value;
        const next = { ...current, [profileId]: entry };
        AsyncStorage.setItem(AIRFRAMES_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    []
  );

  const clearOverrides = useCallback(
    (profileId: string) => {
      persist({ ...overrides, [profileId]: {} });
    },
    [overrides, persist]
  );

  const profiles = useMemo(
    () => aircraftProfiles.map((p) => withOverrides(p, overrides[p.id] ?? {})),
    [overrides]
  );

  const selectedProfile = useMemo(
    () => profiles.find((p) => p.id === selectedId) ?? profiles[0],
    [profiles, selectedId]
  );

  const value = useMemo<AircraftContextValue>(
    () => ({
      profiles,
      selectedProfile,
      selectProfile,
      overridesFor: (profileId) => overrides[profileId] ?? {},
      bookProfile: (profileId) =>
        aircraftProfiles.find((p) => p.id === profileId) ?? aircraftProfiles[0],
      setOverride,
      clearOverrides,
    }),
    [profiles, selectedProfile, selectProfile, overrides, setOverride, clearOverrides]
  );

  return <AircraftContext.Provider value={value}>{children}</AircraftContext.Provider>;
}

export function useAircraft(): AircraftContextValue {
  const ctx = useContext(AircraftContext);
  if (!ctx) throw new Error('useAircraft must be used within an AircraftProvider');
  return ctx;
}
