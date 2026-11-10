import { currentDay, dayStart, dayStats, DAY_MS } from '../local/model.ts';
import type { LocalState } from '../local/model.ts';

/** Only an active, saved camera event resolves older incomplete daily windows. */
export function waterPhotoTrigger(
  state: LocalState,
  now: number,
): { day: number; closedAt: number } | null {
  const verifiedAt = state.events.reduce(
    (latest, event) =>
      event.kind === 'water' && event.verification && event.at <= now
        ? Math.max(latest, event.at)
        : latest,
    -1,
  );
  for (let day = 0; day < currentDay(state, now); day++) {
    const closedAt = dayStart(state, day) + DAY_MS;
    if (closedAt > verifiedAt && dayStats(state, day).waterProgress < 1) return { day, closedAt };
  }
  return null;
}
