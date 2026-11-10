import assert from 'node:assert/strict';
import test from 'node:test';
import { LocalRepository } from '../src/shared/data/localRepository.ts';
import {
  createSnapshot,
  LOCAL_SNAPSHOT_KEY,
  parseSnapshot,
} from '../src/shared/data/localSnapshot.ts';
import {
  createLocalState,
  currentDay,
  dayStats,
  goalsAt,
  DAY_MS,
  WEEK_MS,
  LOCAL_STORAGE_KEY,
} from '../src/features/local/model.ts';
import { createOnboardingDraft } from '../src/features/onboarding/model.ts';

const start = Date.UTC(2026, 10, 8, 17, 30);
const fresh = () =>
  createLocalState(
    start,
    {
      ...createOnboardingDraft('America/Cancun'),
      preferredName: 'Alex',
      sunscreenTimes: ['07:00', '12:30', '15:00'],
    },
    'cactus',
  );
function fixture(seed = { [LOCAL_SNAPSHOT_KEY]: JSON.stringify(createSnapshot(fresh())) }) {
  const values = new Map(Object.entries(seed));
  let now = start + 1000;
  let sequence = 0;
  const faults = { read: false, write: false, lostAck: false };
  const writes = [];
  const storage = {
    async getItem(key) {
      if (faults.read) throw new Error('denied');
      return values.get(key) ?? null;
    },
    async setItem(key, value) {
      if (faults.write) throw new Error('quota');
      writes.push({ key, value });
      values.set(key, value);
      if (faults.lostAck) throw new Error('ack lost');
    },
  };
  const clock = { now: () => now };
  const repo = new LocalRepository({ storage, clock, id: () => `id-${++sequence}` });
  return {
    repo,
    values,
    faults,
    writes,
    storage,
    clock,
    setNow: (value) => {
      now = value;
    },
  };
}
const execute = (repo, request) => repo.execute(repo.prepare(request));
function ok(result) {
  assert.equal(result.status, 'confirmed', result.message);
  return result;
}
function failure(result, reason) {
  assert.equal(result.status, 'failed');
  assert.equal(result.reason, reason);
}
const state = (repo) => repo.getSnapshot().snapshot.state;

test('ausencia, lectura denegada y datos dañados son estados distintos; no se sobrescriben', async () => {
  const missing = fixture({});
  assert.equal(missing.repo.getSnapshot().status, 'loading');
  await missing.repo.initialize();
  assert.equal(missing.repo.getSnapshot().status, 'empty');
  for (const seed of [
    { [LOCAL_STORAGE_KEY]: '{' },
    { [LOCAL_SNAPSHOT_KEY]: '{', [LOCAL_STORAGE_KEY]: JSON.stringify(fresh()) },
  ]) {
    const f = fixture(seed);
    await f.repo.initialize();
    assert.equal(f.repo.getSnapshot().status, 'error');
    failure(await execute(f.repo, { type: 'start' }), 'read');
    assert.deepEqual(Object.fromEntries(f.values), seed);
    assert.equal(f.writes.length, 0);
  }
  const denied = fixture();
  denied.faults.read = true;
  await denied.repo.initialize();
  assert.equal(denied.repo.getSnapshot().status, 'error');
  denied.faults.read = false;
  await denied.repo.retry();
  assert.equal(denied.repo.getSnapshot().status, 'ready');
});

test('migración v1 conserva datos y bytes originales, marca legado y no se repite', async () => {
  const original = fresh();
  original.events = [
    { id: 'water-old', kind: 'water', amount: 321, at: start + 10, editedAt: start + 11 },
    { id: 'sun-old', kind: 'sunscreen', amount: 1, at: start + 12 },
  ];
  original.goals.push({ day: 1, water: 2500, sunscreen: 2 });
  const raw = JSON.stringify(original, null, 2);
  const f = fixture({ [LOCAL_STORAGE_KEY]: raw });
  await f.repo.initialize();
  assert.deepEqual(state(f.repo), original);
  assert.equal(f.values.get(LOCAL_STORAGE_KEY), raw);
  assert.ok(f.repo.getSnapshot().snapshot.eventVersions.every((v) => v.legacy));
  assert.equal(f.repo.getSnapshot().snapshot.operations.length, 0);
  await f.repo.reload();
  assert.equal(f.writes.length, 1);
  assert.ok(parseSnapshot(f.values.get(LOCAL_SNAPSHOT_KEY)));
});

test('si falla la migración se bloquea la entrada y se puede recuperar sin perder el origen', async () => {
  const raw = JSON.stringify(fresh());
  const f = fixture({ [LOCAL_STORAGE_KEY]: raw });
  f.faults.write = true;
  await f.repo.initialize();
  assert.equal(f.repo.getSnapshot().status, 'error');
  assert.equal(f.values.get(LOCAL_STORAGE_KEY), raw);
  assert.equal(f.values.has(LOCAL_SNAPSHOT_KEY), false);
  f.faults.write = false;
  await f.repo.retry();
  assert.deepEqual(state(f.repo), fresh());
});

test('un fallo de escritura no confirma totales; reintentar usa los mismos IDs una sola vez', async () => {
  const f = fixture();
  await f.repo.initialize();
  const command = f.repo.prepare({ type: 'record', kind: 'water', amount: 250 });
  f.faults.write = true;
  failure(await f.repo.execute(command), 'write');
  assert.equal(dayStats(state(f.repo), 0).water, 0);
  assert.deepEqual(f.repo.getSnapshot().pending, command);
  failure(await execute(f.repo, { type: 'record', kind: 'water', amount: 500 }), 'pending');
  f.faults.write = false;
  ok(await f.repo.retry());
  assert.equal(dayStats(state(f.repo), 0).water, 250);
  assert.equal(ok(await f.repo.execute(command)).replayed, true);
  assert.equal(state(f.repo).events[0].id, command.eventId);
  assert.equal(state(f.repo).events.length, 1);
  failure(await f.repo.execute({ ...command, amount: 500 }), 'conflict');
  assert.ok(parseSnapshot(f.values.get(LOCAL_SNAPSHOT_KEY)));
});

test('una escritura confirmada en disco con respuesta perdida se reconoce al reintentar o cerrar', async () => {
  for (const recover of ['retry', 'discard']) {
    const f = fixture();
    await f.repo.initialize();
    f.faults.lostAck = true;
    const command = f.repo.prepare({ type: 'record', kind: 'sunscreen', amount: 1 });
    failure(await f.repo.execute(command), 'write');
    assert.equal(state(f.repo).events.length, 0);
    f.faults.lostAck = false;
    await f.repo[recover]();
    assert.equal(state(f.repo).events.length, 1);
    assert.equal(f.repo.getSnapshot().pending, null);
    assert.equal(ok(await f.repo.execute(command)).replayed, true);
  }
});

test('un reintento ya confirmado sigue confirmado después del cierre; uno no guardado vence', async () => {
  const f = fixture();
  await f.repo.initialize();
  const committed = f.repo.prepare({ type: 'record', kind: 'water', amount: 250 });
  ok(await f.repo.execute(committed));
  const pending = f.repo.prepare({ type: 'record', kind: 'water', amount: 500 });
  f.faults.write = true;
  failure(await f.repo.execute(pending), 'write');
  f.setNow(start + DAY_MS);
  f.faults.write = false;
  failure(await f.repo.retry(), 'expired');
  assert.equal(f.repo.getSnapshot().pending, null);
  assert.equal(ok(await f.repo.execute(committed)).replayed, true);
  assert.equal(state(f.repo).events.length, 1);
  assert.equal(dayStats(state(f.repo), 1).water, 0);
});

test('una vista del día anterior no registra silenciosamente en el siguiente', async () => {
  const f = fixture();
  await f.repo.initialize();
  f.setNow(start + DAY_MS);
  failure(await execute(f.repo, { type: 'record', kind: 'water', amount: 250 }), 'expired');
  failure(
    await execute(f.repo, { type: 'record', kind: 'water', amount: 250 }),
    'capture-required',
  );
  const command = f.repo.prepare({ type: 'record', kind: 'water', amount: 250 });
  ok(
    await f.repo.execute({
      ...command,
      verification: {
        version: 1,
        captureId: 'new-day',
        capturedAt: f.clock.now(),
        source: 'web',
        assessment: 'uncertain',
      },
    }),
  );
  assert.equal(dayStats(state(f.repo), 1).water, 250);
});

test('un fallo al avanzar el ciclo no revoca una operación que ya estaba confirmada', async () => {
  const f = fixture();
  await f.repo.initialize();
  const command = f.repo.prepare({ type: 'record', kind: 'water', amount: 250 });
  ok(await f.repo.execute(command));
  f.setNow(start + WEEK_MS);
  f.faults.write = true;
  assert.equal(ok(await f.repo.execute(command)).replayed, true);
  assert.equal(f.repo.getSnapshot().status, 'error');
  assert.equal(f.repo.getSnapshot().pending, null);
  assert.equal(state(f.repo).events.length, 1);
  f.faults.write = false;
  await f.repo.retry();
  assert.equal(state(f.repo).cycleStarts.length, 2);
  assert.equal(state(f.repo).events.length, 1);
});

test('las mutaciones concurrentes se serializan sin perder registros distintos', async () => {
  const f = fixture();
  await f.repo.initialize();
  const commands = [250, 500, 125].map((amount) =>
    f.repo.prepare({ type: 'record', kind: 'water', amount }),
  );
  const tasks = commands.map((c) => f.repo.execute(c));
  assert.equal(f.repo.getSnapshot().busy, true);
  (await Promise.all(tasks)).forEach(ok);
  assert.equal(f.repo.getSnapshot().busy, false);
  assert.equal(dayStats(state(f.repo), 0).water, 875);
  assert.equal(state(f.repo).events.length, 3);
});

test('dos envíos concurrentes del mismo intento y una reapertura mantienen un solo evento', async () => {
  const f = fixture();
  await f.repo.initialize();
  const command = f.repo.prepare({ type: 'record', kind: 'water', amount: 250 });
  const results = await Promise.all([f.repo.execute(command), f.repo.execute(command)]);
  assert.deepEqual(
    results.map((r) => ok(r).replayed),
    [false, true],
  );
  const reopened = new LocalRepository({ storage: f.storage, clock: f.clock });
  await reopened.initialize();
  assert.equal(state(reopened).events.length, 1);
  assert.equal(ok(await reopened.execute(command)).replayed, true);
  assert.equal(dayStats(state(reopened), 0).water, 250);
});

test('la revisión impide que una edición antigua o deshacer pise una corrección posterior', async () => {
  const f = fixture();
  await f.repo.initialize();
  const add = ok(await execute(f.repo, { type: 'record', kind: 'water', amount: 250 }));
  const eventId = add.receipt.after.id;
  const stale = f.repo.prepare({ type: 'edit', eventId, amount: 750 });
  ok(await execute(f.repo, { type: 'edit', eventId, amount: 500 }));
  failure(await f.repo.execute(stale), 'conflict');
  failure(await execute(f.repo, { type: 'undo', targetOperationId: add.operationId }), 'conflict');
  assert.equal(state(f.repo).events[0].amount, 500);
});

test('deshacer edición conserva otros registros y el instante original; se puede reintentar', async () => {
  const f = fixture();
  await f.repo.initialize();
  const add = ok(await execute(f.repo, { type: 'record', kind: 'water', amount: 250 }));
  f.setNow(start + 2000);
  const edit = ok(
    await execute(f.repo, { type: 'edit', eventId: add.receipt.after.id, amount: 500 }),
  );
  const sun = ok(await execute(f.repo, { type: 'record', kind: 'sunscreen', amount: 1 }));
  const undo = f.repo.prepare({ type: 'undo', targetOperationId: edit.operationId });
  f.faults.write = true;
  failure(await f.repo.execute(undo), 'write');
  assert.equal(dayStats(state(f.repo), 0).water, 500);
  f.faults.write = false;
  ok(await f.repo.retry());
  assert.equal(dayStats(state(f.repo), 0).water, 250);
  assert.equal(state(f.repo).events.find((e) => e.kind === 'water').at, add.receipt.after.at);
  assert.deepEqual(
    state(f.repo).events.find((e) => e.kind === 'sunscreen'),
    sun.receipt.after,
  );
  assert.equal(ok(await f.repo.execute(undo)).replayed, true);
  failure(await execute(f.repo, { type: 'undo', targetOperationId: edit.operationId }), 'conflict');
  assert.ok(parseSnapshot(f.values.get(LOCAL_SNAPSHOT_KEY)));
});

test('deshacer eliminación restaura el mismo evento sin borrar altas posteriores', async () => {
  const f = fixture();
  await f.repo.initialize();
  const add = ok(await execute(f.repo, { type: 'record', kind: 'water', amount: 250 }));
  const removed = ok(await execute(f.repo, { type: 'remove', eventId: add.receipt.after.id }));
  ok(await execute(f.repo, { type: 'record', kind: 'water', amount: 500 }));
  ok(await execute(f.repo, { type: 'undo', targetOperationId: removed.operationId }));
  assert.equal(dayStats(state(f.repo), 0).water, 750);
  assert.deepEqual(
    state(f.repo).events.find((e) => e.id === add.receipt.after.id),
    add.receipt.after,
  );
  assert.ok(parseSnapshot(f.values.get(LOCAL_SNAPSHOT_KEY)));
});

test('deshacer alta afecta solo al evento; ni edición, baja ni deshacer entran en un día cerrado', async () => {
  const f = fixture();
  await f.repo.initialize();
  const add = ok(await execute(f.repo, { type: 'record', kind: 'water', amount: 250 }));
  ok(await execute(f.repo, { type: 'record', kind: 'water', amount: 500 }));
  ok(await execute(f.repo, { type: 'undo', targetOperationId: add.operationId }));
  assert.equal(dayStats(state(f.repo), 0).water, 500);
  const eventId = state(f.repo).events[0].id;
  const latest = f.repo.getSnapshot().snapshot.operations.find((r) => r.after?.id === eventId);
  f.setNow(start + DAY_MS);
  await f.repo.refresh();
  for (const request of [
    { type: 'edit', eventId, amount: 800 },
    { type: 'remove', eventId },
    { type: 'undo', targetOperationId: latest.command.id },
  ])
    failure(await execute(f.repo, request), 'expired');
  assert.equal(dayStats(state(f.repo), 0).water, 500);
});

test('preferencias esperan guardado, respetan revisión y aplican metas al siguiente día', async () => {
  const f = fixture();
  await f.repo.initialize();
  const draft = { ...state(f.repo).preferences, preferredName: 'Noemí', waterGoalMl: '2500' };
  const stale = f.repo.prepare({ type: 'preferences', draft: { ...draft, preferredName: 'Ana' } });
  const command = f.repo.prepare({ type: 'preferences', draft });
  f.faults.write = true;
  failure(await f.repo.execute(command), 'write');
  assert.equal(state(f.repo).preferences.preferredName, 'Alex');
  f.faults.write = false;
  ok(await f.repo.retry());
  assert.equal(state(f.repo).preferences.preferredName, 'Noemí');
  assert.equal(goalsAt(state(f.repo), 0).water, 2000);
  assert.equal(goalsAt(state(f.repo), 1).water, 2500);
  failure(await f.repo.execute(stale), 'conflict');
});

test('el reloj compartido respeta 24 h, cierra a 168 h y no fabrica ciclos durante ausencias', async () => {
  const f = fixture();
  await f.repo.initialize();
  for (const [now, day] of [
    [start + DAY_MS - 1, 0],
    [start + DAY_MS, 1],
    [start + WEEK_MS - 1, 6],
    [start + WEEK_MS, 7],
  ]) {
    f.setNow(now);
    await f.repo.refresh();
    assert.equal(currentDay(state(f.repo), f.repo.getSnapshot().now), day);
  }
  assert.deepEqual(state(f.repo).cycleStarts, [start, start + WEEK_MS]);
  f.setNow(start + 90 * DAY_MS);
  await f.repo.refresh();
  await f.repo.refresh();
  assert.deepEqual(state(f.repo).cycleStarts, [start, start + WEEK_MS, start + 90 * DAY_MS]);
});

test('un fallo al cerrar ciclo bloquea la vista antes de publicar un reloj incompatible', async () => {
  const f = fixture();
  await f.repo.initialize();
  const previousNow = f.repo.getSnapshot().now;
  f.setNow(start + WEEK_MS);
  f.faults.write = true;
  await f.repo.refresh();
  assert.equal(f.repo.getSnapshot().status, 'error');
  assert.equal(f.repo.getSnapshot().now, previousNow);
  assert.equal(state(f.repo).cycleStarts.length, 1);
  f.faults.write = false;
  await f.repo.retry();
  assert.equal(f.repo.getSnapshot().status, 'ready');
  assert.equal(state(f.repo).cycleStarts.length, 2);
});

test('entrada repetida conserva activación, especie y preferencias del perfil existente', async () => {
  const f = fixture({});
  await Promise.all([f.repo.initialize(), f.repo.initialize()]);
  const command = f.repo.prepare({ type: 'start' });
  ok(await f.repo.execute(command));
  const original = structuredClone(state(f.repo));
  f.setNow(start + 6000);
  ok(await execute(f.repo, { type: 'start' }));
  assert.deepEqual(state(f.repo), original);
  assert.equal(ok(await f.repo.execute(command)).replayed, true);
  assert.equal(state(f.repo).events.length, 0);
});

test('cerrar un intento pendiente sin escritura conserva el estado confirmado', async () => {
  const f = fixture();
  await f.repo.initialize();
  f.faults.write = true;
  failure(await execute(f.repo, { type: 'record', kind: 'water', amount: 250 }), 'write');
  await f.repo.discard();
  assert.equal(f.repo.getSnapshot().pending, null);
  assert.equal(state(f.repo).events.length, 0);
});

test('validación rechaza cantidades, fechas y recibos corruptos antes de sobrescribir', async () => {
  const f = fixture();
  await f.repo.initialize();
  for (const amount of [0, -1, 0.5, 10001, NaN])
    failure(await execute(f.repo, { type: 'record', kind: 'water', amount }), 'validation');
  const command = f.repo.prepare({ type: 'record', kind: 'water', amount: 250 });
  failure(await f.repo.execute({ ...command, createdAt: start + DAY_MS }), 'validation');
  ok(await f.repo.execute(command));
  const raw = f.values.get(LOCAL_SNAPSHOT_KEY);
  for (const mutate of [
    (s) => {
      s.operations[0].after.id = 'another';
    },
    (s) => {
      s.operations[0].after = null;
    },
    (s) => {
      s.eventVersions = [];
    },
    (s) => {
      s.operations.push(s.operations[0]);
    },
    (s) => {
      s.preferencesRevision = -1;
    },
  ]) {
    const snapshot = JSON.parse(raw);
    mutate(snapshot);
    assert.equal(parseSnapshot(JSON.stringify(snapshot)), null);
  }
});
