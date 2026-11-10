import type { OnboardingDraft } from '../onboarding/model.ts';

/** Logging policy agreed on 2026-11-08. These are eligibility windows, not application advice. */
export const SUNSCREEN_POLICY = { version: 1, minutes: 60, contextFraction: 0.5 } as const;
export interface SunscreenScheduleVersion {
  revision: number;
  fromDay: number;
  timeZone: string;
  times: string[];
  policy: typeof SUNSCREEN_POLICY;
}
export interface SunscreenSchedule {
  version: 1;
  activatedAt: number;
  revision: number;
  changes: SunscreenScheduleVersion[];
}
export interface SunscreenAppointment {
  scheduleRevision: number;
  dayStart: number;
  time: string;
}
const isTime = (v: unknown): v is string =>
  typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const positive = (v: unknown) => Number.isSafeInteger(v) && Number(v) > 0;
export function validAppointment(v: unknown): v is SunscreenAppointment {
  if (!v || typeof v !== 'object') return false;
  const r = v as SunscreenAppointment;
  return (
    Object.keys(r).every((key) => ['scheduleRevision', 'dayStart', 'time'].includes(key)) &&
    positive(r.scheduleRevision) &&
    Number.isFinite(r.dayStart) &&
    r.dayStart >= 0 &&
    isTime(r.time)
  );
}
export function validSunscreenSchedule(v: SunscreenSchedule): boolean {
  if (
    !v ||
    v.version !== 1 ||
    !Number.isFinite(v.activatedAt) ||
    v.activatedAt < 0 ||
    !positive(v.revision) ||
    !Array.isArray(v.changes) ||
    !v.changes.length
  )
    return false;
  if (
    !Object.keys(v).every((key) => ['version', 'activatedAt', 'revision', 'changes'].includes(key))
  )
    return false;
  const revisions = new Set<number>();
  return v.changes.every((change, index) => {
    if (
      !change ||
      !Object.keys(change).every((key) =>
        ['revision', 'fromDay', 'timeZone', 'times', 'policy'].includes(key),
      ) ||
      !change.policy ||
      !Object.keys(change.policy).every((key) =>
        ['version', 'minutes', 'contextFraction'].includes(key),
      )
    )
      return false;
    if (
      !change ||
      !positive(change.revision) ||
      change.revision > v.revision ||
      revisions.has(change.revision) ||
      !Number.isSafeInteger(change.fromDay) ||
      change.fromDay < 0 ||
      (index > 0 && change.fromDay <= v.changes[index - 1]!.fromDay) ||
      !Array.isArray(change.times) ||
      change.times.length < 1 ||
      change.times.length > 13 ||
      !change.times.every(isTime) ||
      new Set(change.times).size !== change.times.length ||
      !change.policy ||
      change.policy.version !== 1 ||
      change.policy.minutes !== 60 ||
      change.policy.contextFraction !== 0.5
    )
      return false;
    try {
      new Intl.DateTimeFormat('es-MX', { timeZone: change.timeZone });
    } catch {
      return false;
    }
    if (typeof change.timeZone !== 'string' || !change.timeZone) return false;
    revisions.add(change.revision);
    return true;
  });
}
export function createSunscreenSchedule(
  draft: OnboardingDraft,
  activatedAt: number,
  fromDay = 0,
): SunscreenSchedule {
  return {
    version: 1,
    activatedAt,
    revision: 1,
    changes: [
      {
        revision: 1,
        fromDay,
        timeZone: draft.timeZone,
        times: [...draft.sunscreenTimes].sort(),
        policy: { ...SUNSCREEN_POLICY },
      },
    ],
  };
}
export function changeSunscreenSchedule(
  schedule: SunscreenSchedule,
  draft: OnboardingDraft,
  fromDay: number,
): SunscreenSchedule {
  const changes = schedule.changes.filter((change) => change.fromDay < fromDay);
  const previous = changes.at(-1);
  const times = [...draft.sunscreenTimes].sort();
  if (
    previous &&
    previous.timeZone === draft.timeZone &&
    JSON.stringify(previous.times) === JSON.stringify(times)
  )
    return { ...schedule, changes };
  const revision = schedule.revision + 1;
  return {
    ...schedule,
    revision,
    changes: [
      ...changes,
      { revision, fromDay, timeZone: draft.timeZone, times, policy: { ...SUNSCREEN_POLICY } },
    ],
  };
}
export function sameAppointment(
  a: SunscreenAppointment | undefined,
  b: SunscreenAppointment | undefined,
) {
  return (
    !!a &&
    !!b &&
    a.scheduleRevision === b.scheduleRevision &&
    a.dayStart === b.dayStart &&
    a.time === b.time
  );
}
