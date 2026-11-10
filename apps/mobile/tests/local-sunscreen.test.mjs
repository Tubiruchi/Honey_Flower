import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createLocalState,
  currentDay,
  dayStats,
  DAY_MS,
  updatePreferences,
} from '../src/features/local/model.ts';
import { createOnboardingDraft } from '../src/features/onboarding/model.ts';
import {
  createSnapshot,
  parseSnapshot,
  LOCAL_SNAPSHOT_KEY,
} from '../src/shared/data/localSnapshot.ts';
import { LocalRepository } from '../src/shared/data/localRepository.ts';
import {
  sunscreenState,
  sunscreenWindows,
  scheduleAt,
  containsNow,
  pendingSunscreenWindows,
} from '../src/features/sunscreen/model.ts';
import { sameAppointment } from '../src/features/sunscreen/schema.ts';
import { recordsForDay } from '../src/features/records/model.ts';
import { waterPhotoTrigger } from '../src/features/water/policy.ts';
const H = 3_600_000,
  M = 60_000,
  start = Date.UTC(2026, 10, 8);
function fixture({
  times = ['08:00', '11:00', '14:00'],
  zone = 'UTC',
  initialAt = start,
  at = initialAt + 11 * H + 10 * M,
  legacy = false,
} = {}) {
  const state = createLocalState(initialAt, {
    ...createOnboardingDraft(zone),
    sunscreenReapplications: times.length - 1,
    sunscreenTimes: times,
  });
  if (legacy) delete state.sunscreenSchedule;
  const values = new Map([[LOCAL_SNAPSHOT_KEY, JSON.stringify(createSnapshot(state))]]);
  let now = at,
    sequence = 0;
  const faults = { read: false, write: false, lostAck: false };
  const storage = {
    getItem: (key) => {
      if (faults.read) throw Error('read');
      return values.get(key) ?? null;
    },
    setItem: (key, value) => {
      if (faults.write) throw Error('quota');
      values.set(key, value);
      if (faults.lostAck) throw Error('lost ack');
    },
  };
  const repo = new LocalRepository({
    storage,
    clock: { now: () => now },
    id: () => `sun-${++sequence}`,
  });
  return {
    repo,
    storage,
    values,
    faults,
    setNow: (value) => {
      now = value;
    },
    get now() {
      return now;
    },
    get state() {
      return repo.getSnapshot().snapshot?.state ?? state;
    },
  };
}
const command = (f) => f.repo.prepare({ type: 'record', kind: 'sunscreen', amount: 1 });
const expectOk = (result) => {
  assert.equal(result.status, 'confirmed', result.message);
  return result;
};
const record = async (f) => expectOk(await f.repo.execute(command(f)));

test('la política aprobada abre a la hora, cambia contexto a mitad y cierra a los 60 minutos', () => {
  const f = fixture();
  const window = sunscreenWindows(f.state, 0).find((w) => w.time === '11:00');
  assert.equal(window.opensAt, start + 11 * H);
  assert.equal(window.contextAt, start + 11 * H + 30 * M);
  assert.equal(window.closesAt, start + 12 * H);
  for (const [offset, status] of [
    [11 * H - 1, 'upcoming'],
    [11 * H, 'in-window'],
    [11 * H + 30 * M - 1, 'in-window'],
    [11 * H + 30 * M, 'context'],
    [12 * H, 'upcoming'],
  ])
    assert.equal(sunscreenState(f.state, start + offset).status, status);
  assert.equal(containsNow(window, window.closesAt), false);
});
test('solapamientos y fin de día recortan ventana y contexto sin crear citas extra', () => {
  const f = fixture({ times: ['11:00', '11:20', '23:40'] });
  const windows = sunscreenWindows(f.state, 0);
  assert.equal(windows[0].closesAt, start + 11 * H + 20 * M);
  assert.equal(windows[0].contextAt, start + 11 * H + 10 * M);
  assert.equal(windows[2].closesAt, start + DAY_MS);
  assert.equal(windows[2].contextAt, start + 23 * H + 50 * M);
  assert.equal(sunscreenState(f.state, start + 11 * H + 20 * M).available.time, '11:20');
});
test('activar a mitad de una franja no inventa citas anteriores al día de planta', () => {
  const f = fixture({ initialAt: start + 11 * H + 10 * M, at: start + 11 * H + 11 * M });
  const windows = sunscreenWindows(f.state, 0);
  assert.equal(windows.length, 3);
  assert.ok(
    windows.every(
      (w) => w.opensAt >= f.state.startedAt && w.closesAt <= f.state.startedAt + DAY_MS,
    ),
  );
  assert.equal(sunscreenState(f.state, f.now).available, null);
  assert.equal(windows[0].time, '14:00');
  assert.equal(windows.at(-1).time, '11:00');
});
test('cero reaplicaciones completa 1/1 con un alta y no habilita otras citas', async () => {
  const f = fixture({ times: ['11:00'] });
  await f.repo.initialize();
  await record(f);
  const view = sunscreenState(f.state, f.now);
  assert.equal(view.stats.goals.sunscreen, 1);
  assert.equal(view.stats.sunscreen, 1);
  assert.equal(view.complete, true);
  assert.equal(view.status, 'registered');
  assert.equal(view.available, null);
  assert.deepEqual(pendingSunscreenWindows(f.state, f.now), []);
});
test('cada cita admite un único evento y la confirmación repetida mantiene el mismo recibo', async () => {
  const f = fixture();
  await f.repo.initialize();
  const c = command(f);
  const [first, duplicate] = await Promise.all([
    f.repo.execute(c),
    f.repo.execute({ ...c, id: 'other', eventId: 'other-event' }),
  ]);
  expectOk(first);
  assert.equal(duplicate.reason, 'conflict');
  assert.equal(f.state.events.length, 1);
  assert.equal(expectOk(await f.repo.execute(c)).replayed, true);
  assert.ok(sameAppointment(f.state.events[0].appointment, c.appointment));
  assert.ok(parseSnapshot(f.values.get(LOCAL_SNAPSHOT_KEY)));
});
test('no confirmar, entrar antes de apertura o salir de la pantalla no crea un evento', async () => {
  const f = fixture({ at: start + 7 * H });
  await f.repo.initialize();
  assert.equal(sunscreenState(f.state, f.now).available, null);
  assert.equal((await f.repo.execute(command(f))).reason, 'expired');
  assert.equal(f.state.events.length, 0);
  assert.equal(f.repo.getSnapshot().snapshot.operations.length, 0);
});
test('el cierre durante confirmación impide que el comando salte a una cita posterior', async () => {
  const f = fixture({ at: start + 11 * H + 59 * M });
  await f.repo.initialize();
  const c = command(f);
  f.setNow(start + 14 * H + 1);
  assert.equal((await f.repo.execute(c)).reason, 'expired');
  assert.equal(f.state.events.length, 0);
  assert.equal(sunscreenState(f.state, f.now).available.time, '14:00');
  assert.equal(c.appointment.time, '11:00');
});
test('un fallo de escritura conserva el intento; reintentar dentro de plazo guarda una vez', async () => {
  const f = fixture();
  await f.repo.initialize();
  const c = command(f);
  f.faults.write = true;
  assert.equal((await f.repo.execute(c)).reason, 'write');
  assert.equal(dayStats(f.state, 0).sunscreen, 0);
  assert.deepEqual(f.repo.getSnapshot().pending, c);
  f.faults.write = false;
  expectOk(await f.repo.retry());
  assert.equal(f.state.events.length, 1);
  expectOk(await f.repo.execute(c));
  assert.equal(f.state.events.length, 1);
});
test('reintento sin escritura vence, pero respuesta perdida sigue confirmada tras cerrar hora o día', async () => {
  for (const lost of [false, true]) {
    const f = fixture();
    await f.repo.initialize();
    const c = command(f);
    f.faults.write = !lost;
    f.faults.lostAck = lost;
    assert.equal((await f.repo.execute(c)).reason, 'write');
    f.faults.write = false;
    f.faults.lostAck = false;
    f.setNow(start + DAY_MS + 15 * H);
    const result = await f.repo.retry();
    if (lost) {
      expectOk(result);
      assert.equal(result.replayed, true);
      assert.equal(f.state.events.length, 1);
    } else {
      assert.equal(result.reason, 'expired');
      assert.equal(f.state.events.length, 0);
    }
  }
});
test('eliminar y deshacer alta tras cerrar la hora no reabren la cita ni recuperan una omitida', async () => {
  const f = fixture();
  await f.repo.initialize();
  const added = await record(f);
  f.setNow(start + 13 * H);
  await f.repo.refresh();
  expectOk(
    await f.repo.execute(f.repo.prepare({ type: 'undo', targetOperationId: added.operationId })),
  );
  assert.equal(f.state.events.length, 0);
  const view = sunscreenState(f.state, f.now);
  assert.equal(view.available, null);
  assert.equal(view.windows.find((w) => w.time === '11:00').event, null);
  assert.equal(view.stats.goals.sunscreen, 3);
  assert.equal(view.stats.sunscreenProgress, 0);
});
test('deshacer una eliminación restaura el mismo evento válido aunque su hora haya cerrado', async () => {
  const f = fixture();
  await f.repo.initialize();
  const added = await record(f);
  f.setNow(start + 13 * H);
  await f.repo.refresh();
  const removed = expectOk(
    await f.repo.execute(f.repo.prepare({ type: 'remove', eventId: added.receipt.after.id })),
  );
  expectOk(
    await f.repo.execute(f.repo.prepare({ type: 'undo', targetOperationId: removed.operationId })),
  );
  assert.deepEqual(f.state.events[0], added.receipt.after);
  assert.equal(sunscreenState(f.state, f.now).available, null);
  assert.ok(parseSnapshot(f.values.get(LOCAL_SNAPSHOT_KEY)));
});
test('restaurar una eliminación no pisa una nueva aplicación en la misma cita', async () => {
  const f = fixture();
  await f.repo.initialize();
  const added = await record(f);
  const removed = expectOk(
    await f.repo.execute(f.repo.prepare({ type: 'remove', eventId: added.receipt.after.id })),
  );
  await record(f);
  assert.equal(
    (await f.repo.execute(f.repo.prepare({ type: 'undo', targetOperationId: removed.operationId })))
      .reason,
    'conflict',
  );
  assert.equal(f.state.events.length, 1);
});
test('la primera aplicación restante es inicial aunque su cita no sea la primera del día', async () => {
  const f = fixture();
  await f.repo.initialize();
  const first = await record(f);
  f.setNow(start + 14 * H + 10 * M);
  await f.repo.refresh();
  const second = await record(f);
  assert.equal(
    recordsForDay(f.state, 0).find((e) => e.id === first.receipt.after.id).title,
    'Aplicación inicial',
  );
  expectOk(
    await f.repo.execute(f.repo.prepare({ type: 'remove', eventId: first.receipt.after.id })),
  );
  assert.equal(
    recordsForDay(f.state, 0).find((e) => e.id === second.receipt.after.id).title,
    'Aplicación inicial',
  );
  assert.equal(sunscreenState(f.state, f.now).windows[0].event, null);
  assert.equal(dayStats(f.state, 0).sunscreen, 1);
});
test('horarios y meta nuevos entran mañana; el comando de hoy conserva su versión', async () => {
  const f = fixture();
  await f.repo.initialize();
  const frozen = command(f),
    old = structuredClone(scheduleAt(f.state, 0));
  const draft = {
    ...f.state.preferences,
    sunscreenReapplications: 1,
    sunscreenTimes: ['09:00', '16:00'],
  };
  expectOk(await f.repo.execute(f.repo.prepare({ type: 'preferences', draft })));
  assert.deepEqual(scheduleAt(f.state, 0), old);
  assert.equal(dayStats(f.state, 0).goals.sunscreen, 3);
  assert.equal(dayStats(f.state, 1).goals.sunscreen, 2);
  assert.deepEqual(scheduleAt(f.state, 1).times, ['09:00', '16:00']);
  expectOk(await f.repo.execute(frozen));
  f.setNow(start + DAY_MS + 9 * H + 10 * M);
  await f.repo.refresh();
  assert.equal(sunscreenState(f.state, f.now).available.time, '09:00');
  assert.notEqual(scheduleAt(f.state, 1).revision, old.revision);
  assert.ok(parseSnapshot(f.values.get(LOCAL_SNAPSHOT_KEY)));
});
test('cambios repetidos y reversión antes de mañana conservan agenda histórica e IDs inequívocos', () => {
  const f = fixture();
  const first = updatePreferences(
    f.state,
    { ...f.state.preferences, sunscreenTimes: ['08:00', '12:00', '17:00'] },
    f.now,
  );
  const second = updatePreferences(
    first,
    { ...first.preferences, sunscreenTimes: ['07:00', '11:00', '16:00'] },
    f.now,
  );
  assert.ok(scheduleAt(second, 1).revision > scheduleAt(first, 1).revision);
  const reverted = updatePreferences(second, f.state.preferences, f.now);
  assert.deepEqual(scheduleAt(reverted, 0), scheduleAt(f.state, 0));
  assert.deepEqual(scheduleAt(reverted, 1), scheduleAt(f.state, 0));
});
test('la zona de la agenda no cambia al modificar preferencias del día en curso', () => {
  const f = fixture();
  const next = updatePreferences(
    f.state,
    { ...f.state.preferences, timeZone: 'America/Cancun' },
    f.now,
  );
  assert.equal(scheduleAt(next, 0).timeZone, 'UTC');
  assert.equal(scheduleAt(next, 1).timeZone, 'America/Cancun');
  assert.equal(sunscreenState(next, f.now).available.time, '11:00');
});
test('DST: una hora inexistente no se fabrica, y la hora repetida tiene un solo identificador', () => {
  const spring = fixture({
    initialAt: Date.UTC(2026, 2, 8, 5),
    at: Date.UTC(2026, 2, 8, 12),
    zone: 'America/New_York',
    times: ['02:30', '08:00'],
  });
  assert.equal(sunscreenWindows(spring.state, 0).find((w) => w.time === '02:30').opensAt, null);
  assert.equal(sunscreenState(spring.state, spring.now).stats.goals.sunscreen, 2);
  const fall = fixture({
    initialAt: Date.UTC(2026, 10, 1, 4),
    at: Date.UTC(2026, 10, 1, 5, 30),
    zone: 'America/New_York',
    times: ['01:30'],
  });
  const windows = sunscreenWindows(fall.state, 0);
  assert.equal(windows.length, 1);
  assert.equal(windows[0].opensAt, Date.UTC(2026, 10, 1, 5, 30));
  assert.equal(containsNow(windows[0], Date.UTC(2026, 10, 1, 6, 30)), false);
});
test('migrar la versión anterior conserva eventos sin asignar citas retrospectivas y persiste una vez', async () => {
  const f = fixture({ legacy: true });
  const raw = JSON.parse(f.values.get(LOCAL_SNAPSHOT_KEY));
  raw.state.events = [{ id: 'old-sun', kind: 'sunscreen', amount: 1, at: start + 8 * H }];
  raw.eventVersions = [{ id: 'old-sun', revision: 1, legacy: true }];
  f.values.set(LOCAL_SNAPSHOT_KEY, JSON.stringify(raw));
  await f.repo.initialize();
  assert.equal(f.state.events[0].appointment, undefined);
  assert.equal(dayStats(f.state, 0).sunscreen, 1);
  assert.equal(sunscreenState(f.state, f.now).legacy, 1);
  const revision = f.repo.getSnapshot().snapshot.revision;
  await f.repo.reload();
  assert.equal(f.repo.getSnapshot().snapshot.revision, revision);
  await record(f);
  assert.equal(dayStats(f.state, 0).sunscreen, 2);
  assert.equal(f.state.events[0].appointment, undefined);
});
test('una migración con meta de mañana distinta no inventa la agenda antigua ni cambia totales', async () => {
  const f = fixture({ legacy: true });
  const raw = JSON.parse(f.values.get(LOCAL_SNAPSHOT_KEY));
  raw.state.preferences.sunscreenReapplications = 0;
  raw.state.preferences.sunscreenTimes = ['14:00'];
  raw.state.goals.push({ day: 1, water: 2000, sunscreen: 1 });
  f.values.set(LOCAL_SNAPSHOT_KEY, JSON.stringify(raw));
  await f.repo.initialize();
  assert.equal(scheduleAt(f.state, 0), undefined);
  assert.equal(sunscreenState(f.state, f.now).status, 'upcoming');
  assert.equal(sunscreenState(f.state, f.now).stats.goals.sunscreen, 3);
  assert.equal(scheduleAt(f.state, 1).times.length, 1);
});
test('fallar al migrar bloquea la vista y protege los bytes previos hasta recuperar', async () => {
  const f = fixture({ legacy: true }),
    before = f.values.get(LOCAL_SNAPSHOT_KEY);
  f.faults.write = true;
  await f.repo.initialize();
  assert.equal(f.repo.getSnapshot().status, 'error');
  assert.equal(f.values.get(LOCAL_SNAPSHOT_KEY), before);
  f.faults.write = false;
  await f.repo.retry();
  assert.equal(f.repo.getSnapshot().status, 'ready');
  assert.ok(f.state.sunscreenSchedule);
});
test('registros heredados completos no producen nuevas altas ni se fingen citas registradas', async () => {
  const f = fixture({ times: ['11:00'] });
  const raw = JSON.parse(f.values.get(LOCAL_SNAPSHOT_KEY));
  raw.state.events = [{ id: 'legacy', kind: 'sunscreen', amount: 1, at: start + 10 * H }];
  raw.eventVersions = [{ id: 'legacy', revision: 1, legacy: true }];
  f.values.set(LOCAL_SNAPSHOT_KEY, JSON.stringify(raw));
  await f.repo.initialize();
  const view = sunscreenState(f.state, f.now);
  assert.equal(view.complete, true);
  assert.equal(view.status, 'registered');
  assert.equal(view.windows[0].event, null);
  assert.equal((await f.repo.execute(command(f))).status, 'failed');
  assert.equal(f.state.events.length, 1);
});
test('validación rechaza asociaciones imposibles, citas duplicadas y recibos alterados', async () => {
  const f = fixture();
  await f.repo.initialize();
  const added = await record(f),
    raw = f.values.get(LOCAL_SNAPSHOT_KEY);
  for (const alter of [
    (s) => {
      s.state.events[0].appointment.time = '07:00';
    },
    (s) => {
      s.state.sunscreenSchedule.changes[0].policy.minutes = 30;
    },
    (s) => {
      s.operations[0].after.appointment.dayStart += DAY_MS;
    },
    (s) => {
      s.operations[0].command.appointment.time = '14:00';
    },
    (s) => {
      const event = { ...s.state.events[0], id: 'other' };
      s.state.events.push(event);
      s.eventVersions.push({ id: 'other', revision: 1, legacy: true });
    },
  ]) {
    const s = JSON.parse(raw);
    alter(s);
    assert.equal(parseSnapshot(JSON.stringify(s)), null);
  }
  assert.ok(added.receipt.after.appointment);
});
test('cada cierre retira ventanas accionables y protector nunca activa la condición de cámara', async () => {
  const f = fixture();
  await f.repo.initialize();
  assert.equal(pendingSunscreenWindows(f.state, f.now).length, 2);
  await record(f);
  assert.equal(pendingSunscreenWindows(f.state, f.now).length, 1);
  f.setNow(start + 15 * H);
  await f.repo.refresh();
  assert.equal(pendingSunscreenWindows(f.state, f.now).length, 0);
  assert.equal(sunscreenState(f.state, f.now).complete, false);
  const allWater = {
    ...f.state,
    events: [{ id: 'water', kind: 'water', amount: 2000, at: start + 10 * H }],
  };
  assert.equal(waterPhotoTrigger(allWater, start + DAY_MS), null);
  assert.equal(currentDay(f.state, f.now), 0);
});
