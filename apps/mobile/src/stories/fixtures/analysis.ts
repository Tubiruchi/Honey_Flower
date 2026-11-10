import { createLocalState, DAY_MS, WEEK_MS } from '../../features/local/model.ts';
import { createOnboardingDraft } from '../../features/onboarding/model.ts';

/** Isolated story/test data. The installed app always starts with zero events and zero plants. */
export function analysisFixture(count = 4, withered: readonly number[] = []) {
  const firstClosure = Date.UTC(2026, 8, 1, 17);
  const start = count ? firstClosure - WEEK_MS : firstClosure;
  const state = createLocalState(start, {
    ...createOnboardingDraft('America/Cancun'),
    preferredName: 'Alex',
  });
  state.cycleStarts = Array.from({ length: count + 1 }, (_, index) => start + index * WEEK_MS);
  const currentDays = count === 0 ? 0 : count === 5 ? 1 : 2;
  const now = state.cycleStarts.at(-1)! + currentDays * DAY_MS + 60_000;
  for (let cycle = 0; cycle <= count; cycle++) {
    if (!count || withered.includes(cycle)) continue;
    for (let day = 0; day < (cycle === count ? currentDays + 1 : 7); day++) {
      const at = state.cycleStarts[cycle]! + day * DAY_MS + 1000;
      const water = cycle === count ? (day === currentDays ? 1000 : 2000) : day < 6 ? 2000 : 0;
      const sun = cycle === count ? (day === currentDays ? 1 : 3) : day < 6 ? 3 : 1;
      if (water) state.events.push({ id: `w-${cycle}-${day}`, kind: 'water', amount: water, at });
      for (let i = 0; i < sun; i++)
        state.events.push({ id: `s-${cycle}-${day}-${i}`, kind: 'sunscreen', amount: 1, at });
    }
  }
  return { state, now };
}
