import {
  createOnboardingDraft,
  nextUnusedTime,
  readOnboardingSnapshot,
  validateOnboardingStep,
} from '../onboarding/model.ts';
import type { OnboardingDraft } from '../onboarding/model.ts';

export const LOCAL_STORAGE_KEY = 'honeyflower.local.v1';
export const DAY_MS = 86_400_000;
export const WEEK_MS = 7 * DAY_MS;
export type Species = 'sprout' | 'cactus';
export interface HabitEvent {
  id: string;
  kind: 'water' | 'sunscreen';
  amount: number;
  at: number;
  editedAt?: number;
}
export interface GoalChange {
  day: number;
  water: number;
  sunscreen: number;
}
export interface LocalState {
  version: 1;
  startedAt: number;
  cycleStarts: number[];
  firstSpecies: Species;
  preferences: OnboardingDraft;
  goals: GoalChange[];
  events: HabitEvent[];
}

export function createLocalState(
  now: number,
  draft?: OnboardingDraft,
  species: Species = 'sprout',
): LocalState {
  const defaults = createOnboardingDraft();
  const preferences = {
    ...defaults,
    ...draft,
    preferredName: draft?.preferredName.trim() || 'Invitado',
  };
  if (validateOnboardingStep('agua', preferences)) preferences.waterGoalMl = defaults.waterGoalMl;
  if (validateOnboardingStep('protector', preferences))
    preferences.sunscreenReapplications = defaults.sunscreenReapplications;
  if (validateOnboardingStep('horarios', preferences)) {
    preferences.waterTimes = [...defaults.waterTimes];
    preferences.sunscreenTimes = defaults.sunscreenTimes.slice(
      0,
      preferences.sunscreenReapplications + 1,
    );
    while (preferences.sunscreenTimes.length < preferences.sunscreenReapplications + 1)
      preferences.sunscreenTimes.push(nextUnusedTime(preferences.sunscreenTimes));
  }
  if (validateOnboardingStep('avisos', preferences)) {
    for (const key of [
      'notifications',
      'notificationCap',
      'quietPeriods',
      'tone',
      'reinforcedSound',
      'foregroundFlash',
    ] as const)
      Object.assign(preferences, { [key]: defaults[key] });
  }
  return {
    version: 1,
    startedAt: now,
    cycleStarts: [now],
    firstSpecies: species,
    preferences,
    goals: [
      {
        day: 0,
        water: Number(preferences.waterGoalMl),
        sunscreen: 1 + preferences.sunscreenReapplications,
      },
    ],
    events: [],
  };
}
export function currentDay(state: LocalState, now: number) {
  const cycle = state.cycleStarts.length - 1;
  return (
    cycle * 7 + Math.min(7, Math.max(0, Math.floor((now - state.cycleStarts[cycle]!) / DAY_MS)))
  );
}
export function dayStart(state: LocalState, day: number) {
  return state.cycleStarts[Math.floor(day / 7)]! + (day % 7) * DAY_MS;
}
/** After an absence, close the active cycle and start one cycle on return, never fabricate missed cycles. */
export function advanceCycle(state: LocalState, now: number): LocalState {
  return now >= state.cycleStarts.at(-1)! + WEEK_MS
    ? { ...state, cycleStarts: [...state.cycleStarts, now] }
    : state;
}
export function speciesAt(state: LocalState, cycle: number): Species {
  return cycle % 2 === 0
    ? state.firstSpecies
    : state.firstSpecies === 'sprout'
      ? 'cactus'
      : 'sprout';
}
export function goalsAt(state: LocalState, day: number): GoalChange {
  return [...state.goals].reverse().find((goal) => goal.day <= day) ?? state.goals[0]!;
}
export function eventsAt(state: LocalState, day: number) {
  const start = dayStart(state, day);
  return state.events
    .filter((event) => event.at >= start && event.at < start + DAY_MS)
    .sort((a, b) => b.at - a.at || b.id.localeCompare(a.id));
}
export function dayStats(state: LocalState, day: number) {
  const goals = goalsAt(state, day);
  const events = eventsAt(state, day);
  const water = events.filter((e) => e.kind === 'water').reduce((sum, e) => sum + e.amount, 0);
  const sunscreen = events.filter((e) => e.kind === 'sunscreen').length;
  const waterProgress = Math.min(1, water / goals.water);
  const sunscreenProgress = Math.min(1, sunscreen / goals.sunscreen);
  return {
    day,
    goals,
    water,
    sunscreen,
    waterProgress,
    sunscreenProgress,
    progress: (waterProgress + sunscreenProgress) / 2,
    complete: waterProgress === 1 && sunscreenProgress === 1,
  };
}
export function cycleStats(state: LocalState, cycle: number, now: number) {
  const today = currentDay(state, now);
  const days = Array.from({ length: 7 }, (_, i) => dayStats(state, cycle * 7 + i));
  const closed = days.filter((day) => day.day < today);
  const progress = days.reduce((sum, day) => sum + (day.day <= today ? day.progress : 0), 0) / 7;
  const healthScore = closed.length
    ? closed.reduce((sum, day) => sum + day.progress, 0) / closed.length
    : 1;
  return {
    days,
    progress,
    closed: closed.length,
    survived: progress >= 0.8,
    health: healthScore >= 0.8 ? 'healthy' : healthScore >= 0.4 ? 'neglected' : 'withered',
  } as const;
}
export function streaks(state: LocalState, now: number) {
  let current = 0,
    best = 0;
  for (let day = 0; day < currentDay(state, now); day++) {
    current = dayStats(state, day).complete ? current + 1 : 0;
    best = Math.max(best, current);
  }
  return { current, best };
}
export function completedCycles(state: LocalState, now: number) {
  return Array.from({ length: Math.floor(currentDay(state, now) / 7) }, (_, index) => ({
    index,
    species: speciesAt(state, index),
    ...cycleStats(state, index, now),
  }));
}
export function recordEvent(state: LocalState, event: HabitEvent, now: number): LocalState {
  state = advanceCycle(state, now);
  if (state.events.some((e) => e.id === event.id)) return state;
  if (
    !event.id ||
    !Number.isFinite(event.at) ||
    event.at > now ||
    event.at < dayStart(state, currentDay(state, now))
  )
    throw new Error('Solo puedes registrar en el día de planta en curso.');
  if (
    event.kind === 'water'
      ? !Number.isInteger(event.amount) || event.amount < 1 || event.amount > 10000
      : event.kind !== 'sunscreen' || event.amount !== 1
  )
    throw new Error('Escribe una cantidad entera entre 1 y 10,000 mL.');
  return { ...state, events: [...state.events, event] };
}
export function removeEvent(state: LocalState, id: string, now: number) {
  state = advanceCycle(state, now);
  const event = state.events.find((e) => e.id === id);
  if (!event) return state;
  if (event.at < dayStart(state, currentDay(state, now)))
    throw new Error('Los días cerrados conservan sus registros.');
  return { ...state, events: state.events.filter((e) => e.id !== id) };
}
export function editWaterEvent(state: LocalState, id: string, amount: number, now: number) {
  state = advanceCycle(state, now);
  const event = state.events.find((e) => e.id === id);
  if (!event || event.kind !== 'water') throw new Error('No encontramos el registro de agua.');
  if (event.at < dayStart(state, currentDay(state, now)))
    throw new Error('Solo puedes editar registros del día de planta en curso.');
  if (!Number.isInteger(amount) || amount < 1 || amount > 10000)
    throw new Error('Escribe una cantidad entera entre 1 y 10,000 mL.');
  return {
    ...state,
    events: state.events.map((e) => (e.id === id ? { ...e, amount, editedAt: now } : e)),
  };
}
export function updatePreferences(state: LocalState, preferences: OnboardingDraft, now: number) {
  state = advanceCycle(state, now);
  for (const step of ['nombre', 'agua', 'protector', 'horarios', 'avisos'] as const) {
    const error = validateOnboardingStep(step, preferences);
    if (error) throw new Error(error);
  }
  const day = currentDay(state, now) + 1;
  const previous = goalsAt(state, currentDay(state, now));
  const next = {
    day,
    water: Number(preferences.waterGoalMl),
    sunscreen: 1 + preferences.sunscreenReapplications,
  };
  const goals = state.goals.filter((goal) => goal.day < day);
  if (previous.water !== next.water || previous.sunscreen !== next.sunscreen) goals.push(next);
  return { ...state, preferences, goals };
}

/** Validate persisted data before it participates in calculations; never import account/session fields. */
export function parseLocalState(raw: string | null): LocalState | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as LocalState;
    if (
      value.version !== 1 ||
      !Number.isFinite(value.startedAt) ||
      value.startedAt < 0 ||
      !['sprout', 'cactus'].includes(value.firstSpecies)
    )
      return null;
    if (
      !Array.isArray(value.cycleStarts) ||
      value.cycleStarts[0] !== value.startedAt ||
      !value.cycleStarts.every(
        (at, i) => Number.isFinite(at) && (!i || at >= value.cycleStarts[i - 1]! + WEEK_MS),
      )
    )
      return null;
    const snapshot = readOnboardingSnapshot({
      getItem: () => JSON.stringify({ version: 1, step: 'resumen', draft: value.preferences }),
    });
    if (
      !snapshot ||
      !Array.isArray(value.goals) ||
      !value.goals.length ||
      value.goals[0]?.day !== 0 ||
      !Array.isArray(value.events)
    )
      return null;
    const preferences = snapshot.draft;
    new Intl.DateTimeFormat('es-MX', { timeZone: preferences.timeZone });
    for (const step of ['nombre', 'agua', 'protector', 'horarios', 'avisos'] as const)
      if (validateOnboardingStep(step, preferences)) return null;
    if (
      !value.goals.every(
        (g, i) =>
          Number.isSafeInteger(g.day) &&
          g.day >= 0 &&
          (!i || g.day > value.goals[i - 1]!.day) &&
          Number.isInteger(g.water) &&
          g.water >= 250 &&
          g.water <= 10000 &&
          Number.isInteger(g.sunscreen) &&
          g.sunscreen >= 1 &&
          g.sunscreen <= 13,
      )
    )
      return null;
    const ids = new Set<string>();
    for (const e of value.events) {
      if (
        !e ||
        typeof e.id !== 'string' ||
        !e.id ||
        ids.has(e.id) ||
        !Number.isFinite(e.at) ||
        (e.editedAt !== undefined && (!Number.isFinite(e.editedAt) || e.editedAt < e.at)) ||
        !value.cycleStarts.some((start) => e.at >= start && e.at < start + WEEK_MS) ||
        (e.kind === 'water'
          ? !Number.isInteger(e.amount) || e.amount < 1 || e.amount > 10000
          : e.kind !== 'sunscreen' || e.amount !== 1)
      )
        return null;
      ids.add(e.id);
    }
    return {
      version: 1,
      startedAt: value.startedAt,
      cycleStarts: [...value.cycleStarts],
      firstSpecies: value.firstSpecies,
      preferences,
      goals: value.goals.map(({ day, water, sunscreen }) => ({ day, water, sunscreen })),
      events: value.events.map(({ id, kind, amount, at, editedAt }) => ({
        id,
        kind,
        amount,
        at,
        ...(editedAt !== undefined ? { editedAt } : {}),
      })),
    };
  } catch {
    return null;
  }
}
