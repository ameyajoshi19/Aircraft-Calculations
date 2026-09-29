import { useRef, useState } from 'react';

import type { AircraftProfile } from '@/types/aircraft';

/**
 * State seeded from the selected aircraft, re-seeded whenever that aircraft
 * changes.
 *
 * Plain `useState` is wrong here in a way that matters. The seed runs once, on
 * first render — but the persisted aircraft selection is read from storage in
 * an effect, so the screens mount against the default aircraft and only then
 * learn which one is really selected. A weight seeded from the default's
 * maximum gross, or a fuel quantity seeded from its tanks, would survive onto
 * a smaller aeroplane and quietly plan it hundreds of pounds over its limits.
 * Switching aircraft by hand has the same effect.
 *
 * Setting state during render when a prop changes is React's own pattern for
 * derived state: React discards the in-progress render and re-runs this
 * component immediately, before touching the DOM, so nothing ever paints with
 * the stale value.
 */
export function useProfileState<T>(
  profile: AircraftProfile,
  seed: (profile: AircraftProfile) => T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => seed(profile));
  const seededFor = useRef(profile.id);

  if (seededFor.current !== profile.id) {
    seededFor.current = profile.id;
    setValue(seed(profile));
  }

  return [value, setValue];
}
