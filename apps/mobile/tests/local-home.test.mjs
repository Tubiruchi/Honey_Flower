import assert from 'node:assert/strict';
import test from 'node:test';
import { homeState, waterPhotoTrigger } from '../src/features/home/model.ts';
import {
  createLocalState,
  recordEvent,
  advanceCycle,
  DAY_MS,
  WEEK_MS,
  parseLocalState,
} from '../src/features/local/model.ts';

const start = Date.UTC(2026, 10, 2, 17);
function fixture(species = 'sprout', care = 'healthy') {
  const state = createLocalState(start, undefined, species);
  for (let day = 0; day < 2; day++) {
    state.events.push({
      id: `w-${day}`,
      kind: 'water',
      amount: care === 'withered' ? 1000 : 2000,
      at: start + day * DAY_MS + 1000,
    });
    if (care === 'healthy')
      for (let i = 0; i < 3; i++)
        state.events.push({
          id: `s-${day}-${i}`,
          kind: 'sunscreen',
          amount: 1,
          at: start + day * DAY_MS + 2000 + i,
        });
  }
  return state;
}
test('Inicio resuelve las seis combinaciones desde eventos y la especie del ciclo', () => {
  for (const species of ['sprout', 'cactus'])
    for (const health of ['healthy', 'neglected', 'withered']) {
      const view = homeState(fixture(species, health), start + 2 * DAY_MS);
      assert.equal(view.species, species);
      assert.equal(view.summary.health, health);
      assert.equal(view.summary.closed, 2);
      assert.equal(
        view.summary.healthScore,
        { healthy: 1, neglected: 0.5, withered: 0.25 }[health],
      );
    }
});
test('sin días cerrados empieza saludable, vacío y con siete fechas operativas reales', () => {
  const state = createLocalState(start);
  const view = homeState(state, start);
  assert.equal(view.summary.health, 'healthy');
  assert.equal(view.summary.closed, 0);
  assert.equal(view.stats.water, 0);
  assert.deepEqual(
    view.summary.days.map((d) => d.day),
    [0, 1, 2, 3, 4, 5, 6],
  );
  assert.equal(view.start, start);
});
test('los límites 80 y 40 por ciento se aplican al valor real sin redondear', () => {
  for (const [water, sun, health] of [
    [1200, 3, 'healthy'],
    [1199, 3, 'neglected'],
    [1600, 0, 'neglected'],
    [1599, 0, 'withered'],
  ]) {
    const state = createLocalState(start);
    state.events = [
      { id: 'w', kind: 'water', amount: water, at: start + 1000 },
      ...Array.from({ length: sun }, (_, i) => ({
        id: `s${i}`,
        kind: 'sunscreen',
        amount: 1,
        at: start + 2000 + i,
      })),
    ];
    assert.equal(homeState(state, start + DAY_MS).summary.health, health);
  }
});
test('completar hoy no cambia la salud hasta cerrar; un cierre posterior puede recuperarla', () => {
  let state = fixture('sprout', 'withered');
  const now = start + 2 * DAY_MS + 1000;
  state = recordEvent(state, { id: 'new-water', kind: 'water', amount: 10000, at: now }, now);
  for (let i = 0; i < 3; i++)
    state = recordEvent(state, { id: `new-sun-${i}`, kind: 'sunscreen', amount: 1, at: now }, now);
  assert.equal(homeState(state, now).summary.health, 'withered');
  assert.equal(homeState(state, now).stats.progress, 1);
  assert.equal(homeState(state, start + 3 * DAY_MS).summary.health, 'neglected');
});
test('seleccionar cerrado o futuro consulta sus datos sin habilitar altas y descarta selecciones de otro ciclo', () => {
  const state = fixture();
  const now = start + 2 * DAY_MS;
  const past = homeState(state, now, 0);
  assert.equal(past.active, false);
  assert.equal(past.stats.water, 2000);
  assert.equal(past.today, 2);
  const future = homeState(state, now, 3);
  assert.equal(future.active, false);
  assert.equal(future.stats.water, 0);
  for (const selected of [-1, 7, NaN, 0.5])
    assert.equal(homeState(state, now, selected).selected, 2);
});
test('el volumen real puede superar la meta y el progreso se limita a uno', () => {
  let state = createLocalState(start);
  for (const [id, amount] of [
    ['one', 10000],
    ['two', 2000],
  ])
    state = recordEvent(state, { id, kind: 'water', amount, at: start + 1000 }, start + 1000);
  const view = homeState(state, start + 1000);
  assert.equal(view.stats.water, 12000);
  assert.equal(view.stats.waterProgress, 1);
});
test('el cambio de ciclo y una ausencia alternan especie sin reiniciar historia o fabricar ciclos', () => {
  const original = fixture();
  let state = advanceCycle(original, start + WEEK_MS);
  let view = homeState(state, start + WEEK_MS, 6);
  assert.equal(view.today, 7);
  assert.equal(view.selected, 7);
  assert.equal(view.species, 'cactus');
  assert.equal(view.summary.health, 'healthy');
  state = advanceCycle(state, start + 90 * DAY_MS);
  view = homeState(state, start + 90 * DAY_MS);
  assert.equal(view.today, 14);
  assert.equal(view.species, 'sprout');
  assert.deepEqual(state.cycleStarts, [start, start + WEEK_MS, start + 90 * DAY_MS]);
  assert.deepEqual(state.events, original.events);
  assert.equal(state.startedAt, start);
});
test('la solicitud de foto nace al cerrar 24 horas con agua incompleta, aunque sea parcial', () => {
  const state = createLocalState(start);
  state.events = [{ id: 'partial', kind: 'water', amount: 1999, at: start + 1000 }];
  assert.equal(waterPhotoTrigger(state, start + 12 * 3600000), null);
  assert.equal(waterPhotoTrigger(state, start + DAY_MS - 1), null);
  assert.deepEqual(waterPhotoTrigger(state, start + DAY_MS), { day: 0, closedAt: start + DAY_MS });
});
test('citas omitidas, protector incompleto y supervivencia semanal no originan una solicitud de agua', () => {
  const state = createLocalState(start);
  assert.equal(waterPhotoTrigger(state, start + 20 * 3600000), null);
  for (let day = 0; day < 7; day++)
    state.events.push({
      id: `w-${day}`,
      kind: 'water',
      amount: 2000,
      at: start + day * DAY_MS + 1000,
    });
  assert.equal(homeState(state, start + 6 * DAY_MS).summary.survived, false);
  const advanced = advanceCycle(state, start + WEEK_MS);
  assert.equal(waterPhotoTrigger(advanced, start + WEEK_MS), null);
});
test('un registro manual de un día nuevo y la recarga no borran el cierre que originó la solicitud', () => {
  let state = createLocalState(start);
  const now = start + DAY_MS + 1000;
  state = recordEvent(state, { id: 'manual', kind: 'water', amount: 2000, at: now }, now);
  assert.deepEqual(waterPhotoTrigger(state, now), { day: 0, closedAt: start + DAY_MS });
  state = parseLocalState(JSON.stringify(state));
  assert.deepEqual(waterPhotoTrigger(state, now), { day: 0, closedAt: start + DAY_MS });
});
