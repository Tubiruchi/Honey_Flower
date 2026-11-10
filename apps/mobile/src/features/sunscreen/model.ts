import { currentDay, dayStart, dayStats, DAY_MS, goalsAt, eventsAt } from '../local/model.ts';
import type { HabitEvent, LocalState } from '../local/model.ts';
import { createSunscreenSchedule, sameAppointment } from './schema.ts';
import type { SunscreenAppointment } from './schema.ts';

const MINUTE = 60_000;
const clocks = new Map<string, Map<string, number>>();
/** First actual occurrence in a fixed 24h plant day, including DST folds without duplicate slots. */
export function clockOccurrences(start: number, timeZone: string) {
  const key = `${start}:${timeZone}`;
  const cached = clocks.get(key);
  if (cached) return cached;
  const format = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const times = new Map<string, number>();
  for (let at = Math.ceil(start / MINUTE) * MINUTE; at < start + DAY_MS; at += MINUTE) {
    const time = format.format(at);
    if (!times.has(time)) times.set(time, at);
  }
  if (clocks.size >= 128) clocks.delete(clocks.keys().next().value!);
  clocks.set(key, times);
  return times;
}
export function scheduleAt(state: LocalState, day: number) {
  return [...(state.sunscreenSchedule?.changes ?? [])]
    .reverse()
    .find((change) => change.fromDay <= day);
}
/** Past openings keep their identity; a same-day edit replaces only future openings. */
export function scheduleOccurrences<
  T extends { fromDay: number; effectiveAt?: number; timeZone: string; times: string[] },
>(start: number, day: number, changes: readonly T[]) {
  const baseline = changes.filter((change) => change.fromDay < day).at(-1);
  const versions = [
    ...(baseline ? [baseline] : []),
    ...changes.filter((change) => change.fromDay === day),
  ];
  return versions
    .flatMap((change, i) => {
      const from = change.fromDay < day ? start : Math.max(start, change.effectiveAt ?? start);
      const until = versions[i + 1]?.effectiveAt ?? start + DAY_MS;
      return [...clockOccurrences(start, change.timeZone)]
        .filter(([time, at]) => change.times.includes(time) && at >= from && at < until)
        .map(([time, at]) => ({ time, at, change }));
    })
    .sort((a, b) => a.at - b.at || a.time.localeCompare(b.time));
}
export function upgradeSunscreenSchedule(state: LocalState, now: number): LocalState {
  if (state.sunscreenSchedule) return state;
  const day = currentDay(state, now);
  // Old preferences could already contain tomorrow's target; do not invent today's missing hours.
  const fromDay =
    goalsAt(state, day).sunscreen === state.preferences.sunscreenTimes.length ? day : day + 1;
  return { ...state, sunscreenSchedule: createSunscreenSchedule(state.preferences, now, fromDay) };
}
export interface SunscreenWindow {
  id: string;
  appointment: SunscreenAppointment;
  time: string;
  timeZone: string;
  opensAt: number | null;
  closesAt: number | null;
  contextAt: number | null;
  event: HabitEvent | null;
}
export function sunscreenWindows(state: LocalState, day: number): SunscreenWindow[] {
  const schedule = scheduleAt(state, day);
  if (!schedule) return [];
  const start = dayStart(state, day);
  if (!Number.isFinite(start)) return [];
  const actual = scheduleOccurrences(start, day, state.sunscreenSchedule!.changes);
  // Keep nonexistent DST hours visible, without fabricating an opening.
  const entries = [
    ...actual,
    ...schedule.times
      .filter((time) => !clockOccurrences(start, schedule.timeZone).has(time))
      .map((time) => ({ time, at: null, change: schedule })),
  ];
  return entries.map(({ time, at, change }, index) => {
    const appointment = { scheduleRevision: change.revision, dayStart: start, time };
    const closesAt =
      at === null
        ? null
        : Math.min(
            at + change.policy.minutes * MINUTE,
            entries[index + 1]?.at ?? start + DAY_MS,
            start + DAY_MS,
          );
    return {
      id: `sun:${change.revision}:${start}:${time}`,
      appointment,
      time,
      timeZone: change.timeZone,
      opensAt: at,
      closesAt,
      contextAt: at === null ? null : at + (closesAt! - at) * change.policy.contextFraction,
      event:
        state.events.find(
          (event) => event.kind === 'sunscreen' && sameAppointment(event.appointment, appointment),
        ) ?? null,
    };
  });
}
export function containsNow(window: SunscreenWindow, at: number) {
  return window.opensAt !== null && at >= window.opensAt && at < window.closesAt!;
}
export function sunscreenState(state: LocalState, now: number) {
  const day = currentDay(state, now);
  const stats = dayStats(state, day);
  const windows = sunscreenWindows(state, day);
  const current = windows.find((window) => containsNow(window, now)) ?? null;
  const complete = stats.sunscreenProgress >= 1;
  const available = !complete && current && !current.event ? current : null;
  const next =
    windows.find((window) => !window.event && window.opensAt !== null && window.opensAt > now) ??
    null;
  const registered =
    [...windows]
      .filter((window) => window.event)
      .sort((a, b) => b.event!.at - a.event!.at || b.event!.id.localeCompare(a.event!.id))[0] ??
    null;
  const status = available
    ? now >= available.contextAt!
      ? 'context'
      : 'in-window'
    : complete || (registered && (current?.event || next))
      ? 'registered'
      : next || !scheduleAt(state, day)
        ? 'upcoming'
        : 'closed';
  return {
    day,
    stats,
    windows,
    current,
    available,
    next,
    registered,
    complete,
    status,
    legacy: eventsAt(state, day).filter((event) => event.kind === 'sunscreen' && !event.appointment)
      .length,
  } as const;
}
export function formatSunscreenTime(at: number, timeZone: string, seconds = false) {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    ...(seconds ? { second: '2-digit' } : {}),
    hourCycle: 'h23',
  }).format(at);
}
export function windowLabel(window: SunscreenWindow) {
  return window.opensAt === null
    ? 'Hora no disponible en este día'
    : `${formatSunscreenTime(window.opensAt, window.timeZone)}–${formatSunscreenTime(window.closesAt!, window.timeZone, window.closesAt! % MINUTE !== 0)}`;
}
export function eligibleAppointment(
  state: LocalState,
  appointment: SunscreenAppointment,
  createdAt: number,
  now: number,
): 'valid' | 'expired' | 'duplicate' | 'complete' {
  const view = sunscreenState(state, now);
  const window = view.windows.find((window) => sameAppointment(window.appointment, appointment));
  if (!window || !containsNow(window, createdAt) || !containsNow(window, now)) return 'expired';
  if (window.event) return 'duplicate';
  if (view.complete) return 'complete';
  return 'valid';
}
/** The future notification adapter consumes only still-actionable windows; none are sent here. */
export function pendingSunscreenWindows(state: LocalState, now: number) {
  const view = sunscreenState(state, now);
  return view.complete
    ? []
    : view.windows.filter(
        (window) => !window.event && window.closesAt !== null && window.closesAt > now,
      );
}
export function validSunscreenAssignments(state: LocalState) {
  const used = new Set<string>();
  for (const event of state.events) {
    if (!event.appointment) continue;
    const cycle = state.cycleStarts.findIndex(
      (start) => event.at >= start && event.at < start + 7 * DAY_MS,
    );
    if (cycle < 0) return false;
    const day = cycle * 7 + Math.floor((event.at - state.cycleStarts[cycle]!) / DAY_MS);
    const window = sunscreenWindows(state, day).find((window) =>
      sameAppointment(window.appointment, event.appointment),
    );
    if (
      event.kind !== 'sunscreen' ||
      !window ||
      !containsNow(window, event.at) ||
      used.has(window.id)
    )
      return false;
    used.add(window.id);
  }
  return true;
}
