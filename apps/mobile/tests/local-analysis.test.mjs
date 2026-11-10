import assert from 'node:assert/strict';
import test from 'node:test';
import { analysisFixture } from '../src/stories/fixtures/analysis.ts';
import {
  cycleProgress,
  gardenPlants,
  monthAt,
  monthBounds,
  monthLabel,
} from '../src/features/analysis/model.ts';
import {
  collectionTimeZone,
  upgradeGardenCollection,
} from '../src/features/analysis/collection.ts';
import {
  advanceCycle,
  createLocalState,
  DAY_MS,
  WEEK_MS,
  parseLocalState,
  updatePreferences,
} from '../src/features/local/model.ts';
import { createOnboardingDraft } from '../src/features/onboarding/model.ts';
import { LocalRepository, memoryStorage } from '../src/shared/data/localRepository.ts';
import { createSnapshot, LOCAL_SNAPSHOT_KEY } from '../src/shared/data/localSnapshot.ts';

test('una instalación nueva no inventa plantas ni registros, y deja futuros pendientes', () => {
  const { state, now } = analysisFixture(0);
  const progress = cycleProgress(state, now, 0);
  assert.deepEqual(gardenPlants(state, now, monthBounds(state, now).last), []);
  assert.equal(progress.summary.percentage, 0);
  assert.equal(progress.closed, false);
  assert.deepEqual(
    progress.water.days.map((d) => d.state),
    ['current', 'future', 'future', 'future', 'future', 'future', 'future'],
  );
  assert.deepEqual(
    progress.water.days.map((d) => d.value),
    [0, null, null, null, null, null, null],
  );
});

test('88.1 % cerrado y 34.5 % en curso se calculan con registros, sin valores de maqueta', () => {
  const { state, now } = analysisFixture(4);
  const closed = cycleProgress(state, now, 3);
  const current = cycleProgress(state, now, 4);
  assert.equal(closed.summary.percentage.toFixed(1), '88.1');
  assert.equal(current.summary.percentage.toFixed(1), '34.5');
  assert.equal(closed.closed, true);
  assert.equal(current.closed, false);
  assert.ok(closed.water.days.every((day) => day.state === 'closed'));
  assert.match(closed.water.totalLabel, /12,000 mL/);
  assert.match(closed.sunscreen.totalLabel, /19 aplicaciones/);
  assert.match(current.summary.description, /provisional/);
});

test('los excedentes diarios de ambos hábitos no compensan seis días vacíos', () => {
  const { state, now } = analysisFixture(1);
  const at = state.startedAt + 1000;
  state.events = [
    { id: 'excess', kind: 'water', amount: 10000, at },
    ...Array.from({ length: 10 }, (_, i) => ({ id: `sun${i}`, kind: 'sunscreen', amount: 1, at })),
  ];
  const result = cycleProgress(state, now, 0);
  assert.ok(Math.abs(result.summary.percentage - 100 / 7) < 1e-10);
  assert.equal(result.summary.outcome, 'withered');
  assert.equal(gardenPlants(state, now, monthBounds(state, now).last)[0].survived, false);
  assert.equal(result.water.days[0].value, 10000);
});

test('cada día usa su meta histórica, no la preferencia actual ni el cociente de totales', () => {
  const { state, now } = analysisFixture(1);
  state.goals = [
    { day: 0, water: 2000, sunscreen: 3 },
    { day: 3, water: 1000, sunscreen: 1 },
  ];
  state.events = [];
  for (let day = 0; day < 7; day++) {
    const at = state.startedAt + day * DAY_MS + 1000;
    state.events.push(
      { id: `w${day}`, kind: 'water', amount: 1000, at },
      { id: `s${day}`, kind: 'sunscreen', amount: 1, at },
    );
  }
  state.preferences.waterGoalMl = '9000';
  const result = cycleProgress(state, now, 0);
  assert.equal(result.summary.percentage, (((3 * (0.5 + 1 / 3)) / 2 + 4) / 7) * 100);
  assert.deepEqual(
    result.water.days.map((d) => d.goal),
    [2000, 2000, 2000, 1000, 1000, 1000, 1000],
  );
  assert.deepEqual(
    result.sunscreen.days.map((d) => d.goal),
    [3, 3, 3, 1, 1, 1, 1],
  );
  assert.match(result.water.detail, /históricas/);
});

test('el umbral usa el valor sin redondear, aunque la pantalla muestre 80.0 %', () => {
  const { state, now } = analysisFixture(1);
  state.events = [];
  for (let day = 0; day < 7; day++) {
    const at = state.startedAt + day * DAY_MS + 1000;
    state.events.push({ id: `w${day}`, kind: 'water', amount: day ? 1200 : 1199, at });
    for (let i = 0; i < 3; i++)
      state.events.push({ id: `s${day}-${i}`, kind: 'sunscreen', amount: 1, at });
  }
  const progress = cycleProgress(state, now, 0);
  assert.equal(progress.summary.percentage.toFixed(1), '80.0');
  assert.equal(progress.summary.outcome, 'withered');
  state.events[0].amount = 1200;
  assert.equal(cycleProgress(state, now, 0).summary.outcome, 'survived');
});

for (const count of [1, 2, 4, 5])
  test(`${count} cierres semanales dan ${count} plantas mensuales, sin incluir la actual`, () => {
    const { state, now } = analysisFixture(count);
    const plants = gardenPlants(state, now, monthBounds(state, now).last);
    assert.equal(plants.length, count);
    assert.deepEqual(
      plants.map((p) => p.slot),
      Array.from({ length: count }, (_, i) => i),
    );
    assert.equal(new Set(plants.map((p) => p.id)).size, count);
    assert.ok(plants.every((p) => p.index < count));
  });

test('la identidad y el anclaje no dependen de orden de lista, filtro ni resultado corregido', () => {
  const { state, now } = analysisFixture(4, [1]);
  const month = monthBounds(state, now).last;
  const original = gardenPlants(state, now, month);
  assert.deepEqual(
    original.filter((p) => p.survived).map((p) => p.slot),
    [0, 2, 3],
  );
  state.events = analysisFixture(4).state.events.reverse();
  assert.deepEqual(
    gardenPlants(state, now, month).map((p) => [p.id, p.slot]),
    original.map((p) => [p.id, p.slot]),
  );
});

test('el mes es el del cierre programado en la zona fija, incluso en fin de año', () => {
  const closure = Date.UTC(2027, 0, 1, 2);
  const state = createLocalState(closure - WEEK_MS, createOnboardingDraft('America/Cancun'));
  state.cycleStarts.push(closure);
  const plants = gardenPlants(state, closure + DAY_MS, 2026 * 12 + 11);
  assert.equal(plants.length, 1);
  assert.equal(gardenPlants(state, closure + DAY_MS, 2027 * 12).length, 0);
  assert.equal(monthAt(closure, 'UTC'), 2027 * 12);
  assert.equal(monthAt(closure, collectionTimeZone(state)), 2026 * 12 + 11);
  assert.equal(monthLabel(2027 * 12), 'Enero de 2027');
});

test('viajar/cambiar zona no mueve plantas; la configuración se conserva al guardar/reabrir', () => {
  const { state, now } = analysisFixture(4);
  const updated = updatePreferences(
    state,
    { ...state.preferences, timeZone: 'Pacific/Auckland' },
    now,
  );
  assert.equal(updated.preferences.timeZone, 'Pacific/Auckland');
  assert.equal(collectionTimeZone(updated), 'America/Cancun');
  const restored = parseLocalState(JSON.stringify(updated));
  assert.equal(collectionTimeZone(restored), 'America/Cancun');
  assert.deepEqual(
    gardenPlants(restored, now, monthBounds(state, now).last),
    gardenPlants(updated, now, monthBounds(state, now).last),
  );
});

test('cambio de horario estacional no cambia los siete días de 24 horas ni fabrica ciclos', () => {
  const start = Date.UTC(2026, 9, 30, 17);
  const state = createLocalState(start, createOnboardingDraft('America/New_York'));
  assert.equal(advanceCycle(state, start + WEEK_MS - 1), state);
  const closed = advanceCycle(state, start + WEEK_MS);
  assert.equal(closed.cycleStarts.length, 2);
  assert.equal(gardenPlants(closed, start + WEEK_MS, 2026 * 12 + 10)[0].endedAt, start + WEEK_MS);
});

test('una ausencia prolongada solo cierra la planta pendiente y respeta su mes original', () => {
  const { state } = analysisFixture(0);
  const now = Date.UTC(2027, 0, 10, 17);
  const result = advanceCycle(state, now);
  assert.equal(result.cycleStarts.length, 2);
  assert.equal(gardenPlants(result, now, 2026 * 12 + 8).length, 1);
  assert.equal(gardenPlants(result, now, monthBounds(result, now).last).length, 0);
  assert.equal(monthBounds(result, now).first, 2026 * 12 + 8);
});

test('actualización de perfil antiguo fija su primera zona registrada y es idempotente', async () => {
  const { state, now } = analysisFixture(4);
  delete state.garden;
  state.preferences.timeZone = 'Asia/Tokyo';
  const storage = memoryStorage({ [LOCAL_SNAPSHOT_KEY]: JSON.stringify(createSnapshot(state)) });
  const repo = new LocalRepository({ storage, clock: { now: () => now } });
  await repo.initialize();
  const snapshot = repo.getSnapshot().snapshot;
  assert.equal(snapshot.state.garden.timeZone, 'America/Cancun');
  assert.deepEqual(snapshot.state.events, state.events);
  assert.deepEqual(snapshot.state.goals, state.goals);
  assert.deepEqual(snapshot.state.sunscreenSchedule, state.sunscreenSchedule);
  assert.equal(upgradeGardenCollection(snapshot.state), snapshot.state);
  await repo.refresh();
  assert.equal(repo.getSnapshot().snapshot.revision, snapshot.revision);
  const reopened = new LocalRepository({ storage, clock: { now: () => now } });
  await reopened.initialize();
  assert.deepEqual(reopened.getSnapshot().snapshot, snapshot);
});

test('sin historial de zonas, la migración conserva la preferencia existente y nunca usa la zona del equipo', () => {
  const { state } = analysisFixture(0);
  delete state.garden;
  delete state.sunscreenSchedule;
  state.preferences.timeZone = 'Asia/Tokyo';
  assert.equal(upgradeGardenCollection(state).garden.timeZone, 'Asia/Tokyo');
});

test('configuración dañada bloquea la lectura, sin sobrescribir la colección ni ofrecer un falso vacío', async () => {
  const { state, now } = analysisFixture(4);
  state.garden.timeZone = 'Not/AZone';
  const raw = JSON.stringify(createSnapshot(state));
  const storage = memoryStorage({ [LOCAL_SNAPSHOT_KEY]: raw });
  const repo = new LocalRepository({ storage, clock: { now: () => now } });
  await repo.initialize();
  assert.equal(repo.getSnapshot().status, 'error');
  assert.equal(await storage.getItem(LOCAL_SNAPSHOT_KEY), raw);
});

test('un fallo al guardar la actualización deja los bytes anteriores; reintentar recupera todos los cierres', async () => {
  const { state, now } = analysisFixture(4);
  delete state.garden;
  const raw = JSON.stringify(createSnapshot(state));
  const source = memoryStorage({ [LOCAL_SNAPSHOT_KEY]: raw });
  let fail = true;
  const repo = new LocalRepository({
    storage: {
      ...source,
      setItem(key, value) {
        if (fail) throw new Error('sin espacio');
        return source.setItem(key, value);
      },
    },
    clock: { now: () => now },
  });
  await repo.initialize();
  assert.equal(repo.getSnapshot().status, 'error');
  assert.equal(await source.getItem(LOCAL_SNAPSHOT_KEY), raw);
  fail = false;
  await repo.retry();
  assert.equal(repo.getSnapshot().status, 'ready');
  assert.equal(
    gardenPlants(repo.getSnapshot().snapshot.state, now, monthBounds(state, now).last).length,
    4,
  );
});
