import { c162Cruise } from './c162-cruise.ts';
import { c162PohBase } from './c162.ts';
import { c172sCruise } from './c172s-cruise.ts';
import { c172sPohBase } from './c172s.ts';
import { c182tCruise } from './c182t-cruise.ts';
import { c182tPohBase } from './c182t.ts';
import type { PohDocument } from './types.ts';

export const c182tPoh: PohDocument = { ...c182tPohBase, cruise: c182tCruise };
export const c172sPoh: PohDocument = { ...c172sPohBase, cruise: c172sCruise };
export const c162Poh: PohDocument = { ...c162PohBase, cruise: c162Cruise };

export * from './types.ts';
export { trueAirspeedWeightCorrectionKts } from './c182t-cruise.ts';
export {
  C182T_BAGGAGE_LIMITS,
  C182T_DATUM,
  C182T_FIELD_CORRECTIONS,
  C182T_START_TAXI_TAKEOFF_FUEL_GAL,
} from './c182t.ts';
export {
  C162_BAGGAGE_LIMITS,
  C162_DATUM,
  C162_FIELD_CORRECTIONS,
  C162_MAX_EMPTY_WEIGHT_LBS,
  C162_START_TAXI_TAKEOFF_FUEL_GAL,
} from './c162.ts';
export {
  C172S_BAGGAGE_LIMITS,
  C172S_DATUM,
  C172S_FIELD_CORRECTIONS,
  C172S_START_TAXI_TAKEOFF_FUEL_GAL,
  C172S_UTILITY_CATEGORY,
} from './c172s.ts';
