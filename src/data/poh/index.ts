import { c182tCruise } from './c182t-cruise.ts';
import { c182tPohBase } from './c182t.ts';
import type { PohDocument } from './types.ts';

export const c182tPoh: PohDocument = { ...c182tPohBase, cruise: c182tCruise };

export * from './types.ts';
export { trueAirspeedWeightCorrectionKts } from './c182t-cruise.ts';
export {
  C182T_BAGGAGE_LIMITS,
  C182T_DATUM,
  C182T_FIELD_CORRECTIONS,
  C182T_START_TAXI_TAKEOFF_FUEL_GAL,
} from './c182t.ts';
