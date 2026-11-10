import type { LocalState } from '../local/model.ts';

export interface GardenCollection {
  version: 1;
  groupBy: 'cycle-end';
  timeZone: string;
}
export function validGardenCollection(value: GardenCollection): boolean {
  if (!value || value.version !== 1 || value.groupBy !== 'cycle-end') return false;
  if (!Object.keys(value).every((key) => ['version', 'groupBy', 'timeZone'].includes(key)))
    return false;
  if (typeof value.timeZone !== 'string' || !value.timeZone) return false;
  try {
    new Intl.DateTimeFormat('es-MX', { timeZone: value.timeZone });
    return true;
  } catch {
    return false;
  }
}
/** Older profiles retain the earliest recorded zone; travel never regroups their collection. */
export function collectionTimeZone(state: LocalState): string {
  return (
    state.garden?.timeZone ??
    state.sunscreenSchedule?.changes[0]?.timeZone ??
    state.preferences.timeZone
  );
}
export function upgradeGardenCollection(state: LocalState): LocalState {
  return state.garden
    ? state
    : {
        ...state,
        garden: { version: 1, groupBy: 'cycle-end', timeZone: collectionTimeZone(state) },
      };
}
