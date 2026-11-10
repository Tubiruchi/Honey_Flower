import { currentDay, cycleStats, dayStart, dayStats, speciesAt } from '../local/model.ts';
import type { LocalState } from '../local/model.ts';

/** The repository has already confirmed cycle advancement before exposing this state. */
export function homeState(state: LocalState, now: number, selection: number | null = null) {
  const today = currentDay(state, now);
  const cycle = Math.floor(today / 7);
  const selected =
    selection !== null &&
    Number.isInteger(selection) &&
    selection >= cycle * 7 &&
    selection < cycle * 7 + 7
      ? selection
      : today;
  return {
    today,
    cycle,
    selected,
    active: selected === today,
    start: dayStart(state, selected),
    stats: dayStats(state, selected),
    summary: cycleStats(state, cycle, now),
    species: speciesAt(state, cycle),
  };
}
export { waterPhotoTrigger } from '../water/policy.ts';
