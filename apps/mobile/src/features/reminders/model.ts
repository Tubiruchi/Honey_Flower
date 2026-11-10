import { currentDay, dayStart, dayStats, eventsAt, DAY_MS } from '../local/model.ts';
import type { LocalState } from '../local/model.ts';
import { clockOccurrences, sunscreenWindows } from '../sunscreen/model.ts';
import { inQuietTime } from './preferences.ts';

export const REMINDER_LOG_KEY = 'honeyflower.reminders.v1';
export interface Reminder {
  key: string;
  id: number;
  dayStart: number;
  at: number;
  expiresAt: number;
  kind: 'water' | 'sunscreen';
  level: 'normal' | 'insistent' | 'reinforced';
  title: string;
  body: string;
  sound: boolean;
}
export interface Reservation {
  key: string;
  id: number;
  dayStart: number;
  at: number;
}
export function parseReminderLog(raw: string | null): Reservation[] {
  if (!raw) return [];
  const value = JSON.parse(raw);
  if (value?.version !== 1 || !Array.isArray(value.entries) || value.entries.length > 2500)
    throw new Error('No pudimos recuperar la agenda de avisos. Tus registros se conservan.');
  const keys = new Set<string>(),
    ids = new Set<number>();
  for (const e of value.entries) {
    if (
      !e ||
      typeof e.key !== 'string' ||
      !e.key ||
      keys.has(e.key) ||
      ids.has(e.id) ||
      !Number.isSafeInteger(e.id) ||
      e.id < 1_000_000_000 ||
      e.id >= 2_000_000_000 ||
      !Number.isFinite(e.dayStart) ||
      e.dayStart < 0 ||
      !Number.isFinite(e.at) ||
      e.at < e.dayStart ||
      e.at >= e.dayStart + DAY_MS
    )
      throw new Error('La agenda de avisos necesita recuperación. Tus registros se conservan.');
    keys.add(e.key);
    ids.add(e.id);
  }
  return value.entries.map(({ key, id, dayStart, at }: Reservation) => ({ key, id, dayStart, at }));
}
export function isReminderId(id: number) {
  return id >= 1_000_000_000 && id < 2_000_000_000;
}
function reminderId(key: string, used: Set<number>) {
  let hash = 2166136261;
  for (const char of key) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  let id = 1_000_000_000 + (hash % 1_000_000_000);
  while (used.has(id)) id = id === 1_999_999_999 ? 1_000_000_000 : id + 1;
  return id;
}
/** Calendar only for already-created plant days. No background cycle or missed-week fabrication. */
export function planReminders(
  state: LocalState,
  now: number,
  history: readonly Reservation[] = [],
) {
  const retained = history.filter((entry) => entry.at <= now && entry.at > now - 32 * DAY_MS);
  if (!state.preferences.notifications)
    return { reminders: [] as Reminder[], reservations: retained };
  const today = currentDay(state, now);
  const end = state.cycleStarts.length * 7;
  const result: Reminder[] = [];
  const count = new Map<number, number>();
  retained.forEach((entry) => count.set(entry.dayStart, (count.get(entry.dayStart) ?? 0) + 1));
  const used = new Set(history.map((entry) => entry.id));
  for (let day = today; day < end; day++) {
    const start = dayStart(state, day);
    const stats = dayStats(state, day);
    const schedule = [...(state.waterSchedule?.changes ?? [])]
      .reverse()
      .find((v) => v.fromDay <= day);
    const waterSlots = schedule
      ? [...clockOccurrences(start, schedule.timeZone)]
          .filter(([time]) => schedule.times.includes(time))
          .map(([time, at]) => ({ time, at }))
          .sort((a, b) => a.at - b.at)
      : [];
    const sun = sunscreenWindows(state, day);
    const candidates: Omit<Reminder, 'id' | 'title' | 'body' | 'sound'>[] = [];
    const waterEvents = eventsAt(state, day).filter((e) => e.kind === 'water');
    for (const [i, slot] of waterSlots.entries()) {
      if (stats.waterProgress >= 1) continue;
      const missed = waterSlots
        .slice(0, i)
        .filter(
          (previous, j) =>
            !waterEvents.some((e) => e.at >= previous.at && e.at < waterSlots[j + 1]!.at),
        ).length;
      candidates.push({
        key: `water:${start}:${slot.at}`,
        dayStart: start,
        at: slot.at,
        expiresAt: waterSlots[i + 1]?.at ?? start + DAY_MS,
        kind: 'water',
        level: missed >= 2 ? 'reinforced' : missed ? 'insistent' : 'normal',
      });
    }
    for (const window of sun) {
      if (window.event || window.opensAt === null || stats.sunscreenProgress >= 1) continue;
      for (const [phase, at] of [
        ['opening', window.opensAt],
        ['context', window.contextAt!],
      ] as const) {
        const missed = sun.filter(
          (previous) => !previous.event && previous.closesAt !== null && previous.closesAt <= at,
        ).length;
        candidates.push({
          key: `${window.id}:${phase}`,
          dayStart: start,
          at,
          expiresAt: window.closesAt!,
          kind: 'sunscreen',
          level: missed >= 2 ? 'reinforced' : missed ? 'insistent' : 'normal',
        });
      }
    }
    candidates.sort(
      (a, b) => a.at - b.at || a.kind.localeCompare(b.kind) || a.key.localeCompare(b.key),
    );
    for (const entry of candidates) {
      if (
        entry.at <= now ||
        entry.expiresAt <= now ||
        retained.some((old) => old.key === entry.key)
      )
        continue;
      const time = new Intl.DateTimeFormat('en-GB', {
        timeZone: state.preferences.timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).format(entry.at);
      if (
        inQuietTime(time, state.preferences.quietPeriods) ||
        (count.get(start) ?? 0) >= state.preferences.notificationCap
      )
        continue;
      const previous = history.find((old) => old.key === entry.key);
      const id = previous?.id ?? reminderId(entry.key, used);
      used.add(id);
      count.set(start, (count.get(start) ?? 0) + 1);
      const intensified = entry.level !== 'normal';
      const phrase =
        state.preferences.tone === 'gentle'
          ? 'Un pequeño cuidado a la vez.'
          : state.preferences.tone === 'intense'
            ? 'Las buenas intenciones aún no aparecen en tus registros.'
            : 'Tu planta sigue esperando noticias de esta cita.';
      result.push({
        ...entry,
        id,
        title: entry.kind === 'water' ? 'Tu cita de agua' : 'Tu cita de protector',
        body: `${intensified ? phrase + ' ' : ''}${entry.kind === 'water' ? 'Puedes revisar y registrar tu agua.' : 'Revisa tu horario antes de confirmar una aplicación.'}`,
        sound: entry.level === 'reinforced' && state.preferences.reinforcedSound,
      });
    }
  }
  return {
    reminders: result,
    reservations: [
      ...retained,
      ...result.map(({ key, id, dayStart, at }) => ({ key, id, dayStart, at })),
    ],
  };
}
