import test from 'node:test';
import assert from 'node:assert/strict';
import { WaterController } from '../src/features/water/WaterController.ts';
import {
  WaterAttemptStore,
  WATER_ATTEMPT_KEY,
  parseWaterAttempt,
} from '../src/features/water/attempt.ts';
import { personalWaterReview } from '../src/features/water/analysis.ts';
import { waterPhotoTrigger } from '../src/features/water/policy.ts';
import { validWaterVerification } from '../src/features/water/verification.ts';
import { isOwnedCameraFile } from '../src/shared/native/waterCameraFiles.ts';
import { cameraError } from '../src/shared/native/waterCameraErrors.ts';
import { LocalRepository, memoryStorage } from '../src/shared/data/localRepository.ts';
import {
  createSnapshot,
  LOCAL_SNAPSHOT_KEY,
  parseSnapshot,
} from '../src/shared/data/localSnapshot.ts';
import { createLocalState, DAY_MS, dayStats } from '../src/features/local/model.ts';
const start = Date.UTC(2026, 10, 8, 17);
test('permisos y capacidad reconocen excepciones DOM y errores nativos que no heredan Error', () => {
  assert.equal(cameraError({ name: 'NotAllowedError', message: '' }).code, 'denied');
  assert.equal(cameraError({ message: 'User denied camera permission' }).code, 'denied');
  assert.equal(cameraError({ name: 'NotFoundError', message: '' }).code, 'unavailable');
  assert.equal(cameraError({ message: 'User cancelled photos app' }).code, 'cancelled');
  assert.equal(cameraError(null).code, 'failed');
});
test('la limpieza acepta solo archivos de cámara propios, sin galería ni rutas externas', () => {
  const name = 'JPEG_20261108_193102_4780341676986649196.jpg';
  for (const base of [
    'file:///data/user/0/com.honeyflower.app/cache/',
    'file:///data/data/com.honeyflower.app/cache/',
    'file:///storage/emulated/0/Android/data/com.honeyflower.app/files/Pictures/',
  ])
    assert.equal(isOwnedCameraFile(base + name), true);
  for (const value of [
    'file:///storage/emulated/0/DCIM/' + name,
    'file:///data/user/0/com.other.app/cache/' + name,
    'file:///data/user/0/com.honeyflower.app/cache/../' + name,
    'file:///data/user/0/com.honeyflower.app/cache/profile.jpg',
    'content://photos/' + name,
  ])
    assert.equal(isOwnedCameraFile(value), false);
});
function fixture({ source = 'web', inline = false } = {}) {
  let now = start + DAY_MS + 1000;
  let sequence = 0;
  let calls = 0;
  let stops = 0;
  let releases = 0;
  let deny = false;
  let cancel = false;
  let analyze = personalWaterReview.analyze;
  const state = createLocalState(start);
  const storage = memoryStorage({ [LOCAL_SNAPSHOT_KEY]: JSON.stringify(createSnapshot(state)) });
  const clock = { now: () => now };
  const store = new WaterAttemptStore(storage);
  const repo = new LocalRepository({ storage, clock });
  const camera = {
    open: async () => {
      calls++;
      if (deny) throw Error('Permiso denegado');
      return {
        source,
        ...(inline ? { stream: {} } : {}),
        stop: () => {
          stops++;
        },
        capture: async (id) => {
          if (cancel) throw Error('Captura cancelada');
          let released = false;
          return {
            id,
            url: 'blob:private-test-photo',
            capturedAt: now,
            source,
            dispose: async () => {
              if (!released) {
                releases++;
                released = true;
              }
            },
          };
        },
      };
    },
  };
  const make = (commit = (command) => repo.execute(command)) =>
    new WaterController({
      store,
      camera,
      analyzer: { analyze: (photo) => analyze(photo) },
      now: clock.now,
      id: () => `attempt-${++sequence}`,
      dayStart: start + DAY_MS,
      amount: '250',
      commit,
    });
  return {
    repo,
    store,
    storage,
    make,
    state,
    camera,
    setNow: (value) => {
      now = value;
    },
    deny: () => {
      deny = true;
    },
    cancel: () => {
      cancel = true;
    },
    analyzer: (fn) => {
      analyze = fn;
    },
    get calls() {
      return calls;
    },
    get stops() {
      return stops;
    },
    get releases() {
      return releases;
    },
  };
}
const events = (f) => f.repo.getSnapshot().snapshot.state.events;
async function photo(f, c) {
  await f.repo.initialize();
  await c.initialize();
  await c.activateCamera();
  await c.capture();
  assert.equal(c.getSnapshot().phase, 'review');
}
test('no abre cámara ni registra hasta una acción explícita, foto y confirmación personal', async () => {
  const f = fixture(),
    c = f.make();
  await f.repo.initialize();
  await c.initialize();
  assert.equal(f.calls, 0);
  assert.equal(events(f).length, 0);
  await c.confirm();
  assert.equal(events(f).length, 0);
  await c.activateCamera();
  await c.capture();
  assert.equal(c.getSnapshot().analysis.status, 'uncertain');
  assert.equal(events(f).length, 0);
  c.changeAmount('375');
  await Promise.all([c.confirm(), c.confirm()]);
  assert.equal(c.getSnapshot().phase, 'saved');
  assert.equal(events(f).length, 1);
  assert.equal(events(f)[0].amount, 375);
  assert.equal(events(f)[0].verification.assessment, 'uncertain');
  assert.equal(f.releases, 1);
  assert.equal(waterPhotoTrigger(f.repo.getSnapshot().snapshot.state, start + DAY_MS + 1000), null);
  assert.equal(await f.storage.getItem(WATER_ATTEMPT_KEY), 'null');
  const disk = await f.storage.getItem(LOCAL_SNAPSHOT_KEY);
  assert.ok(parseSnapshot(disk));
  assert.doesNotMatch(disk, /blob:|data:image|webPath|private-test-photo/);
});
test('permiso denegado o cancelación antes de foto no habilitan confirmación', async () => {
  for (const mode of ['deny', 'cancel']) {
    const f = fixture(),
      c = f.make();
    f[mode]();
    await f.repo.initialize();
    await c.initialize();
    await c.activateCamera();
    if (mode === 'cancel') await c.capture();
    await c.confirm();
    assert.equal(c.getSnapshot().phase, 'error');
    assert.equal(events(f).length, 0);
    assert.equal(await c.discard(), true);
    assert.equal(await f.store.read(), null);
  }
});
test('un fallo de análisis conserva la foto y ofrece revisión incierta sin aprobación inventada', async () => {
  const f = fixture();
  f.analyzer(async () => {
    throw Error('modelo');
  });
  const c = f.make();
  await photo(f, c);
  assert.equal(c.getSnapshot().analysis.status, 'uncertain');
  assert.ok(c.getSnapshot().photo);
  assert.equal(events(f).length, 0);
  await c.discard();
  assert.equal(f.releases, 1);
});
test('rechazo solo admite repetir o salir, y repetir libera la fotografía anterior', async () => {
  const f = fixture();
  f.analyzer(async () => ({ status: 'rejected', message: 'No se ve el recipiente.' }));
  const c = f.make();
  await f.repo.initialize();
  await c.initialize();
  await c.activateCamera();
  await c.capture();
  assert.equal(c.getSnapshot().phase, 'rejected');
  await c.confirm();
  assert.equal(events(f).length, 0);
  await c.activateCamera();
  assert.equal(f.releases, 1);
  assert.equal(c.getSnapshot().phase, 'camera');
  await c.discard();
});
test('repetir la foto mantiene cantidad e identidad de intento y cambia la identidad de captura', async () => {
  const f = fixture(),
    c = f.make();
  await photo(f, c);
  c.changeAmount('500');
  const first = c.getSnapshot().attempt;
  await c.activateCamera();
  assert.equal(f.releases, 1);
  await c.capture();
  const next = c.getSnapshot().attempt;
  assert.equal(next.id, first.id);
  assert.equal(next.eventId, first.eventId);
  assert.equal(next.amount, '500');
  assert.notEqual(next.captureId, first.captureId);
  await c.discard();
  assert.equal(events(f).length, 0);
});
test('cantidad inválida y cierre durante revisión no crean eventos ni cambian al nuevo día', async () => {
  const f = fixture(),
    c = f.make();
  await photo(f, c);
  c.changeAmount('0');
  await c.confirm();
  assert.equal(c.getSnapshot().phase, 'review');
  c.changeAmount('300');
  f.setNow(start + 2 * DAY_MS);
  await c.confirm();
  assert.equal(c.getSnapshot().phase, 'expired');
  assert.equal(events(f).length, 0);
  assert.equal(f.releases, 1);
});
test('el borrador sobrevive una recarga sin persistir foto ni abrir cámara automáticamente', async () => {
  const f = fixture(),
    c = f.make();
  await photo(f, c);
  c.changeAmount('750');
  await new Promise((resolve) => setImmediate(resolve));
  const draft = await f.storage.getItem(WATER_ATTEMPT_KEY);
  assert.doesNotMatch(draft, /blob:|url|path|private-test-photo/);
  c.dispose();
  const recovered = f.make();
  await recovered.initialize();
  assert.equal(recovered.getSnapshot().phase, 'ready');
  assert.equal(recovered.getSnapshot().attempt.amount, '750');
  assert.equal(recovered.getSnapshot().photo, null);
  assert.equal(f.calls, 1);
  await recovered.confirm();
  assert.equal(events(f).length, 0);
});
test('el segundo plano detiene la cámara web y volver exige reactivarla', async () => {
  const f = fixture(),
    c = f.make();
  await c.initialize();
  await c.activateCamera();
  c.pause();
  assert.equal(c.getSnapshot().phase, 'ready');
  assert.ok(f.stops > 0);
  assert.equal(c.getSnapshot().session, null);
  await c.capture();
  assert.equal(f.calls, 1);
  await c.discard();
});

test('la cámara integrada Android se detiene al salir y la foto de revisión permanece hasta descartarla', async () => {
  const f = fixture({ source: 'android', inline: true }),
    c = f.make();
  await f.repo.initialize();
  await c.initialize();
  await c.activateCamera();
  c.pause();
  assert.equal(c.getSnapshot().phase, 'ready');
  assert.equal(c.getSnapshot().session, null);
  assert.ok(f.stops > 0);
  await c.activateCamera();
  await c.capture();
  const image = c.getSnapshot().photo;
  assert.equal(image.source, 'android');
  c.pause();
  assert.equal(c.getSnapshot().phase, 'review');
  assert.equal(c.getSnapshot().photo, image);
  assert.equal(f.releases, 0);
  assert.equal(events(f).length, 0);
  await c.discard();
  assert.equal(f.releases, 1);
});

test('salir mientras llega el permiso invalida la apertura y detiene el stream tardío', async () => {
  const f = fixture({ source: 'android', inline: true }),
    c = f.make();
  const open = f.camera.open;
  let allow;
  f.camera.open = () =>
    new Promise((resolve) => {
      allow = async () => resolve(await open());
    });
  await c.initialize();
  const pending = c.activateCamera();
  c.pause();
  await allow();
  await pending;
  assert.equal(c.getSnapshot().phase, 'ready');
  assert.equal(c.getSnapshot().session, null);
  assert.ok(f.stops > 0);
  await c.discard();
});

test('la respuesta de una apertura anterior no sobrescribe una nueva cámara activa', async () => {
  const f = fixture({ source: 'android', inline: true }),
    c = f.make();
  const open = f.camera.open;
  let deny;
  f.camera.open = () =>
    new Promise((_resolve, reject) => {
      deny = reject;
    });
  await c.initialize();
  const pending = c.activateCamera();
  c.pause();
  f.camera.open = open;
  await c.activateCamera();
  deny(new Error('Permiso anterior denegado'));
  await pending;
  assert.equal(c.getSnapshot().phase, 'camera');
  assert.ok(c.getSnapshot().session);
  await c.discard();
});

test('salir durante una captura integrada descarta el resultado tardío sin registrar', async () => {
  const f = fixture({ source: 'android', inline: true }),
    c = f.make();
  const open = f.camera.open;
  let finish;
  f.camera.open = async () => {
    const session = await open();
    return {
      ...session,
      capture: (id) =>
        new Promise((resolve) => {
          finish = async () => resolve(await session.capture(id));
        }),
    };
  };
  await f.repo.initialize();
  await c.initialize();
  await c.activateCamera();
  const pending = c.capture();
  await new Promise((resolve) => setImmediate(resolve));
  c.pause();
  await finish();
  await pending;
  assert.equal(c.getSnapshot().phase, 'ready');
  assert.equal(c.getSnapshot().photo, null);
  assert.equal(f.releases, 1);
  assert.equal(events(f).length, 0);
  await c.discard();
});
test('la operación queda congelada antes de guardar y sobrevive a una respuesta perdida', async () => {
  const f = fixture();
  let resolve;
  const c = f.make(
    (command) =>
      new Promise((r) => {
        resolve = () => r(f.repo.execute(command));
      }),
  );
  await photo(f, c);
  const saving = c.confirm();
  await new Promise((r) => setImmediate(r));
  const frozen = await f.store.read();
  assert.equal(c.getSnapshot().phase, 'saving');
  assert.ok(frozen.command.verification);
  c.changeAmount('999');
  assert.equal(c.getSnapshot().attempt.amount, '250');
  assert.equal(await c.discard(), false);
  // Simulate a process dying after the durable write but before it sees the acknowledgement.
  const written = await f.repo.execute(frozen.command);
  assert.equal(written.status, 'confirmed');
  c.dispose();
  f.setNow(start + 2 * DAY_MS);
  const recovered = f.make();
  await recovered.initialize();
  assert.equal(recovered.getSnapshot().phase, 'saved');
  assert.equal(events(f).length, 1);
  assert.equal(recovered.getSnapshot().result.replayed, true);
  resolve();
  await saving;
});
test('recuperar una operación no confirmada tras cerrar el día explica vencimiento sin crear evento', async () => {
  const f = fixture();
  let finish;
  const c = f.make(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await photo(f, c);
  const saving = c.confirm();
  await new Promise((resolve) => setImmediate(resolve));
  c.dispose();
  f.setNow(start + 2 * DAY_MS);
  const recovered = f.make();
  await recovered.initialize();
  assert.equal(recovered.getSnapshot().phase, 'expired');
  assert.equal(events(f).length, 0);
  finish({
    status: 'failed',
    operationId: 'test',
    reason: 'discarded',
    message: 'cerrado',
    retryable: false,
  });
  await saving;
  await recovered.discard();
});
test('recuperación de captura nativa acepta solo el captureId pendiente, nunca una foto ajena', async () => {
  const f = fixture(),
    c = f.make();
  await f.repo.initialize();
  await c.initialize();
  const draft = c.getSnapshot().attempt;
  await f.store.write({ ...draft, awaitingCapture: true, captureId: 'native-pending' });
  c.dispose();
  const recovered = f.make();
  await recovered.initialize();
  let released = 0;
  const image = (id) => ({
    id,
    url: 'blob:restored',
    source: 'android',
    capturedAt: start + DAY_MS + 1000,
    dispose: async () => {
      released++;
    },
  });
  await recovered.acceptPhoto(image('other'));
  assert.equal(recovered.getSnapshot().phase, 'ready');
  assert.equal(released, 1);
  await recovered.acceptPhoto(image('native-pending'));
  assert.equal(recovered.getSnapshot().phase, 'review');
  assert.equal(events(f).length, 0);
  await recovered.discard();
});
test('borrador corrupto y fallo de lectura no reemplazan los datos confirmados', async () => {
  const f = fixture();
  await f.storage.setItem(WATER_ATTEMPT_KEY, '{');
  const profile = await f.storage.getItem(LOCAL_SNAPSHOT_KEY);
  const c = f.make();
  await c.initialize();
  assert.equal(c.getSnapshot().phase, 'error');
  assert.equal(await f.storage.getItem(WATER_ATTEMPT_KEY), '{');
  assert.equal(await f.storage.getItem(LOCAL_SNAPSHOT_KEY), profile);
  assert.throws(() => parseWaterAttempt('{'));
  await c.discard();
  assert.equal(await f.storage.getItem(LOCAL_SNAPSHOT_KEY), profile);
});
test('solo un alta confirmada con foto resuelve el requisito; eliminar/deshacer lo restablece', async () => {
  const f = fixture();
  await f.repo.initialize();
  const request = { type: 'record', kind: 'water', amount: 250 };
  assert.equal((await f.repo.execute(f.repo.prepare(request))).reason, 'capture-required');
  assert.ok(waterPhotoTrigger(f.state, start + DAY_MS));
  const c = f.make();
  await photo(f, c);
  await c.confirm();
  const event = events(f)[0];
  const revision = () =>
    f.repo.getSnapshot().snapshot.eventVersions.find((v) => v.id === event.id).revision;
  assert.equal(
    (
      await f.repo.execute(
        f.repo.prepare({
          type: 'edit',
          eventId: event.id,
          amount: 500,
          expectedRevision: revision(),
        }),
      )
    ).status,
    'confirmed',
  );
  assert.deepEqual(events(f)[0].verification, event.verification);
  const removed = await f.repo.execute(
    f.repo.prepare({ type: 'remove', eventId: event.id, expectedRevision: revision() }),
  );
  assert.equal(removed.status, 'confirmed');
  assert.ok(waterPhotoTrigger(f.repo.getSnapshot().snapshot.state, start + DAY_MS + 1000));
  await f.repo.execute(f.repo.prepare({ type: 'undo', targetOperationId: removed.operationId }));
  assert.equal(waterPhotoTrigger(f.repo.getSnapshot().snapshot.state, start + DAY_MS + 1000), null);
  assert.equal(dayStats(f.repo.getSnapshot().snapshot.state, 1).water, 500);
  assert.ok(waterPhotoTrigger(f.repo.getSnapshot().snapshot.state, start + 2 * DAY_MS));
});
test('verificación rechaza rutas, fotos futuras, aprobación sin analizador y prueba en protector', async () => {
  const valid = {
    version: 1,
    captureId: 'id',
    capturedAt: start,
    source: 'web',
    assessment: 'uncertain',
  };
  assert.equal(validWaterVerification(valid, start), true);
  for (const extra of [
    { path: 'file:x' },
    { url: 'blob:x' },
    { capturedAt: start + 1 },
    { assessment: 'approved' },
    { source: 'gallery' },
  ])
    assert.equal(validWaterVerification({ ...valid, ...extra }, start), false);
  const f = fixture();
  await f.repo.initialize();
  const command = f.repo.prepare({ type: 'record', kind: 'sunscreen', amount: 1 });
  assert.equal((await f.repo.execute({ ...command, verification: valid })).reason, 'validation');
});
