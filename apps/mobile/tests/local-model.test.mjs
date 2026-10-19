import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createOnboardingDraft } from '../src/features/onboarding/model.ts';
import {
  advanceCycle,
  completedCycles,
  createLocalState,
  currentDay,
  cycleStats,
  DAY_MS,
  dayStart,
  dayStats,
  editWaterEvent,
  goalsAt,
  parseLocalState,
  recordEvent,
  removeEvent,
  speciesAt,
  streaks,
  updatePreferences,
  WEEK_MS,
} from '../src/features/local/model.ts';
const start = Date.UTC(2026, 9, 18, 17);
const fresh = () =>
  createLocalState(start, { ...createOnboardingDraft('America/Cancun'), preferredName: 'Alex' });
const event = (id, kind, amount, at = start + 1000) => ({ id, kind, amount, at });
test('empieza vacío, sin cifras de muestra ni plantas ganadas', () => {
  const state = fresh();
  assert.equal(state.events.length, 0);
  assert.equal(dayStats(state, 0).progress, 0);
  assert.equal(cycleStats(state, 0, start).health, 'healthy');
  assert.deepEqual(completedCycles(state, start), []);
});
test('cada ventana dura 24 horas incluso al cruzar medianoche y el límite exacto', () => {
  const state = fresh();
  assert.equal(currentDay(state, start + DAY_MS - 1), 0);
  assert.equal(currentDay(state, start + DAY_MS), 1);
  assert.equal(dayStart(state, 1), start + DAY_MS);
});
test('ambos hábitos pesan igual y el progreso se limita al 100%, sin perder el volumen real', () => {
  let state = recordEvent(fresh(), event('water', 'water', 3000), start + 1000);
  assert.equal(dayStats(state, 0).water, 3000);
  assert.equal(dayStats(state, 0).progress, 0.5);
  for (let i = 0; i < 4; i++)
    state = recordEvent(state, event(`sun${i}`, 'sunscreen', 1), start + 1000);
  assert.equal(dayStats(state, 0).progress, 1);
  assert.equal(dayStats(state, 0).sunscreen, 4);
});
test('un ID repetido no duplica eventos y las cantidades inválidas se rechazan', () => {
  const entry = event('one', 'water', 250);
  const state = recordEvent(fresh(), entry, entry.at);
  assert.equal(recordEvent(state, entry, entry.at).events.length, 1);
  for (const amount of [0, -1, 0.5, 10001, NaN])
    assert.throws(() => recordEvent(state, event('new', 'water', amount), start + 1000));
});
test('editar y eliminar solo durante la ventana abierta, conservando el instante original', () => {
  const state = recordEvent(fresh(), event('water', 'water', 250), start + 1000);
  const edited = editWaterEvent(state, 'water', 500, start + 2000);
  assert.equal(edited.events[0].at, start + 1000);
  assert.equal(edited.events[0].editedAt, start + 2000);
  assert.equal(dayStats(edited, 0).water, 500);
  assert.equal(removeEvent(edited, 'water', start + 3000).events.length, 0);
  assert.throws(() => removeEvent(state, 'water', start + DAY_MS));
  assert.throws(() => editWaterEvent(state, 'water', 500, start + WEEK_MS));
});
test('las metas nuevas entran al siguiente día y no modifican datos históricos', () => {
  const state = updatePreferences(
    fresh(),
    {
      ...fresh().preferences,
      waterGoalMl: '2500',
      sunscreenReapplications: 0,
      sunscreenTimes: ['08:00'],
    },
    start + 1000,
  );
  assert.equal(goalsAt(state, 0).water, 2000);
  assert.equal(goalsAt(state, 1).water, 2500);
  assert.equal(goalsAt(state, 1).sunscreen, 1);
  const cancelled = updatePreferences(state, fresh().preferences, start + 2000);
  assert.equal(cancelled.goals.length, 1);
});
test('cerrar el ciclo utiliza el 80% real y la racha exige ambos hábitos completos', () => {
  let state = fresh();
  for (let day = 0; day < 6; day++) {
    const at = start + day * DAY_MS + 1000;
    state = recordEvent(state, event(`w${day}`, 'water', 2000, at), at);
    for (let i = 0; i < 3; i++)
      state = recordEvent(state, event(`s${day}-${i}`, 'sunscreen', 1, at), at);
  }
  assert.equal(streaks(state, start + 6 * DAY_MS).current, 6);
  assert.equal(cycleStats(state, 0, start + WEEK_MS).survived, true);
  assert.equal(streaks(state, start + WEEK_MS).current, 0);
  assert.equal(completedCycles(state, start + WEEK_MS).length, 1);
});
test('una ausencia larga solo cierra el ciclo activo y empieza uno al regresar', () => {
  const state = advanceCycle(fresh(), start + 90 * DAY_MS);
  assert.deepEqual(state.cycleStarts, [start, start + 90 * DAY_MS]);
  assert.equal(currentDay(state, start + 90 * DAY_MS), 7);
  assert.equal(completedCycles(state, start + 90 * DAY_MS).length, 1);
  assert.notEqual(speciesAt(state, 0), speciesAt(state, 1));
  assert.equal(advanceCycle(state, start + 90 * DAY_MS), state);
});
test('la recuperación valida estructura, zona horaria, duplicados y versión', () => {
  const state = fresh();
  assert.deepEqual(parseLocalState(JSON.stringify(state)), state);
  for (const raw of [
    '{',
    'null',
    JSON.stringify({ ...state, version: 2 }),
    JSON.stringify({ ...state, goals: [] }),
    JSON.stringify({ ...state, preferences: { ...state.preferences, timeZone: 'inventada' } }),
    JSON.stringify({ ...state, events: [event('x', 'water', 250), event('x', 'water', 250)] }),
  ])
    assert.equal(parseLocalState(raw), null);
});
test('saltar desde un borrador incompleto usa ajustes válidos y no inventa registros', () => {
  const draft = {
    ...createOnboardingDraft('America/Cancun'),
    waterGoalMl: '',
    waterTimes: [''],
    sunscreenReapplications: 0,
    sunscreenTimes: [''],
    quietPeriods: [{ from: '', to: '' }],
  };
  const state = createLocalState(start, draft);
  assert.equal(parseLocalState(JSON.stringify(state))?.events.length, 0);
  assert.equal(state.preferences.preferredName, 'Invitado');
});
