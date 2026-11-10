import { isTime } from '../onboarding/model.ts';
import type { OnboardingDraft } from '../onboarding/model.ts';
import type { LocalState } from '../local/model.ts';

export interface WaterSchedule {
  version: 1;
  changes: { fromDay: number; effectiveAt?: number; timeZone: string; times: string[] }[];
}
export function createWaterSchedule(draft: OnboardingDraft, fromDay = 0): WaterSchedule {
  return {
    version: 1,
    changes: [{ fromDay, timeZone: draft.timeZone, times: [...draft.waterTimes] }],
  };
}
export function validWaterSchedule(value: WaterSchedule) {
  if (!value || value.version !== 1 || !Array.isArray(value.changes) || !value.changes.length)
    return false;
  if (!Object.keys(value).every((key) => ['version', 'changes'].includes(key))) return false;
  return value.changes.every((change, index) => {
    if (
      !change ||
      !Object.keys(change).every((key) =>
        ['fromDay', 'effectiveAt', 'timeZone', 'times'].includes(key),
      ) ||
      !Number.isSafeInteger(change.fromDay) ||
      change.fromDay < 0 ||
      (change.effectiveAt !== undefined &&
        (!Number.isFinite(change.effectiveAt) || change.effectiveAt < 0)) ||
      (index > 0 &&
        (change.fromDay < value.changes[index - 1]!.fromDay ||
          (change.fromDay === value.changes[index - 1]!.fromDay &&
            (change.effectiveAt ?? 0) <= (value.changes[index - 1]!.effectiveAt ?? 0)))) ||
      !Array.isArray(change.times) ||
      change.times.length < 1 ||
      change.times.length > 12 ||
      !change.times.every(isTime) ||
      new Set(change.times).size !== change.times.length ||
      typeof change.timeZone !== 'string' ||
      !change.timeZone
    )
      return false;
    try {
      new Intl.DateTimeFormat('es-MX', { timeZone: change.timeZone });
      return true;
    } catch {
      return false;
    }
  });
}
export function changeWaterSchedule(
  schedule: WaterSchedule,
  draft: OnboardingDraft,
  day: number,
  effectiveAt?: number,
): WaterSchedule {
  if (effectiveAt !== undefined) {
    const last = schedule.changes.filter((change) => change.fromDay === day).at(-1);
    effectiveAt = Math.max(effectiveAt, (last?.effectiveAt ?? -1) + 1);
  }
  const past = schedule.changes.filter(
    (change) =>
      change.fromDay < day ||
      (effectiveAt !== undefined &&
        change.fromDay === day &&
        (change.effectiveAt ?? 0) < effectiveAt),
  );
  const previous = past.at(-1);
  return {
    version: 1,
    changes:
      previous?.timeZone === draft.timeZone &&
      JSON.stringify(previous.times) === JSON.stringify(draft.waterTimes)
        ? past
        : [
            ...past,
            {
              fromDay: day,
              ...(effectiveAt === undefined ? {} : { effectiveAt }),
              timeZone: draft.timeZone,
              times: [...draft.waterTimes],
            },
          ],
  };
}
export function upgradeWaterSchedule(state: LocalState, day: number): LocalState {
  return state.waterSchedule
    ? state
    : { ...state, waterSchedule: createWaterSchedule(state.preferences, day) };
}
