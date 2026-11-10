import assert from 'node:assert/strict';
import test from 'node:test';
import { recordDay, recordsForDay } from '../src/features/records/model.ts';
import {
  createLocalState,
  DAY_MS,
  advanceCycle,
  removeEvent,
} from '../src/features/local/model.ts';

const start = Date.UTC(2026, 9, 26, 17);
function fixture() {
  const state = createLocalState(start);
  state.events = [
    { id: 'w', kind: 'water', amount: 250, at: start + 100 },
    { id: 'initial', kind: 'sunscreen', amount: 1, at: start + 200 },
    { id: 'again', kind: 'sunscreen', amount: 1, at: start + 300 },
  ];
  return state;
}
test('el selector de día valida límites, parámetros de URL y ausencia de selección', () => {
  for (const value of [null, undefined, '', -1, 3, 1.5, '1e0', 'x', 'Infinity'])
    assert.equal(recordDay(value, 2), 2);
  assert.equal(recordDay('0', 2), 0);
  assert.equal(recordDay(1, 2), 1);
});
test('la lista utiliza eventos del día operativo, ordena de reciente a antiguo y no los altera', () => {
  const state = fixture();
  const before = structuredClone(state);
  assert.deepEqual(
    recordsForDay(state, 0).map((e) => e.id),
    ['again', 'initial', 'w'],
  );
  assert.equal(recordsForDay(state, 1).length, 0);
  assert.deepEqual(state, before);
});
test('protector reclasifica inicial y reaplicación al eliminar o restaurar el mismo evento', () => {
  const state = fixture();
  const removed = removeEvent(state, 'initial', start + 1000);
  assert.equal(
    recordsForDay(state, 0).find((e) => e.id === 'again').title,
    'Reaplicación de protector',
  );
  assert.equal(recordsForDay(removed, 0).find((e) => e.id === 'again').title, 'Aplicación inicial');
  assert.equal(
    recordsForDay({ ...removed, events: [...removed.events, state.events[1]] }, 0).find(
      (e) => e.id === 'again',
    ).title,
    'Reaplicación de protector',
  );
});
test('la navegación por días atraviesa una ausencia sin fabricar días ni registros intermedios', () => {
  const state = advanceCycle(fixture(), start + 90 * DAY_MS);
  assert.equal(recordsForDay(state, 7).length, 0);
  assert.equal(recordsForDay(state, 0).length, 3);
  assert.deepEqual(state.cycleStarts, [start, start + 90 * DAY_MS]);
});
