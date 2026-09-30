import { useRef, useState } from 'react';

import type { AircraftProfile } from '@/types/aircraft';

/**
 * State seeded from the selected aircraft, re-seeded whenever the thing it
 * was seeded from changes.
 *
 * Plain `useState` is wrong here in a way that matters. The seed runs once, on
 * first render — but the persisted aircraft selection is read from storage in
 * an effect, so the screens mount against the default aircraft and only then
 * learn which one is really selected. A weight seeded from the default's
 * maximum gross, or a fuel quantity seeded from its tanks, would survive onto
 * a smaller aeroplane and quietly plan it hundreds of pounds over its limits.
 *
 * `identity` is what the seed depends on, and defaults to the aircraft's id.
 * Pass more than the id when the seeded value can change without the aircraft
 * changing — the owner editing this airframe's usable fuel, say, which must
 * not leave a full-tanks figure from the larger book value sitting in the
 * field.
 *
 * Setting state during render when an input changes is React's own pattern for
 * derived state: React discards the in-progress render and re-runs this
 * component immediately, before touching the DOM, so nothing ever paints with
 * the stale value.
 */
export function useProfileState<T>(
  profile: AircraftProfile,
  seed: (profile: AircraftProfile) => T,
  identity: string = profile.id
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => seed(profile));
  const seededFor = useRef(identity);

  if (seededFor.current !== identity) {
    seededFor.current = identity;
    setValue(seed(profile));
  }

  return [value, setValue];
}
