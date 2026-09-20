import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { aircraftProfiles, defaultAircraftProfileId } from '@/data/aircraft-profiles';
import type { AircraftProfile } from '@/types/aircraft';

const STORAGE_KEY = 'selected-aircraft-profile-id';

interface AircraftContextValue {
  profiles: AircraftProfile[];
  selectedProfile: AircraftProfile;
  selectProfile: (id: string) => void;
}

const AircraftContext = createContext<AircraftContextValue | null>(null);

export function AircraftProvider({ children }: { children: ReactNode }) {
  const [selectedId, setSelectedId] = useState(defaultAircraftProfileId);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored && aircraftProfiles.some((p) => p.id === stored)) {
          setSelectedId(stored);
        }
      })
      .catch(() => {
        // No persisted selection available (e.g. first launch); keep the default.
      });
  }, []);

  const selectProfile = (id: string) => {
    setSelectedId(id);
    AsyncStorage.setItem(STORAGE_KEY, id).catch(() => {
      // Selection still applies for this session even if it can't persist.
    });
  };

  const selectedProfile = useMemo(
    () => aircraftProfiles.find((p) => p.id === selectedId) ?? aircraftProfiles[0],
    [selectedId]
  );

  const value = useMemo(
    () => ({ profiles: aircraftProfiles, selectedProfile, selectProfile }),
    [selectedProfile]
  );

  return <AircraftContext.Provider value={value}>{children}</AircraftContext.Provider>;
}

export function useAircraft(): AircraftContextValue {
  const ctx = useContext(AircraftContext);
  if (!ctx) throw new Error('useAircraft must be used within an AircraftProvider');
  return ctx;
}
