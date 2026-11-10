import assert from 'node:assert/strict';
import test from 'node:test';
import { durableStorage } from '../src/shared/data/durableStorage.ts';
import { LocalRepository, memoryStorage } from '../src/shared/data/localRepository.ts';
import { createSnapshot, LOCAL_SNAPSHOT_KEY } from '../src/shared/data/localSnapshot.ts';
import { createLocalState, LOCAL_STORAGE_KEY } from '../src/features/local/model.ts';
import { createOnboardingDraft } from '../src/features/onboarding/model.ts';
import { REMINDER_LOG_KEY } from '../src/features/reminders/model.ts';

const start = Date.UTC(2026, 10, 8, 12);
const fresh = () => createLocalState(start, createOnboardingDraft('UTC'));
function fixture(seed = {}) {
  const values = new Map(Object.entries(seed));
  const faults = { write: false };
  const native = {
    read: async (key) => ({ found: values.has(key), value: values.get(key) ?? null }),
    write: async (key, value) => {
      if (faults.write) throw new Error('commit failed');
      values.set(key, value);
    },
  };
  return { native, values, faults };
}

test('el guardado nativo prevalece tras cerrar el proceso con una copia WebView anterior', async () => {
  const old = JSON.stringify(createSnapshot(fresh()));
  const f = fixture();
  const legacy = memoryStorage({ [LOCAL_SNAPSHOT_KEY]: old });
  const storage = durableStorage(f.native, legacy);
  const next = createSnapshot(fresh());
  next.state.preferences.notifications = false;
  await storage.setItem(LOCAL_SNAPSHOT_KEY, JSON.stringify(next));
  await legacy.setItem(LOCAL_SNAPSHOT_KEY, old); // Simulate WebView restoring its last disk flush.
  const restarted = durableStorage(f.native, legacy);
  assert.equal(
    JSON.parse(await restarted.getItem(LOCAL_SNAPSHOT_KEY)).state.preferences.notifications,
    false,
  );
});

test('una copia WebView denegada no invalida un guardado nativo confirmado', async () => {
  const f = fixture();
  const storage = durableStorage(f.native, {
    getItem: () => null,
    setItem: () => {
      throw new Error('WebView denied');
    },
  });
  const raw = JSON.stringify(createSnapshot(fresh()));
  await storage.setItem(LOCAL_SNAPSHOT_KEY, raw);
  assert.equal(await storage.getItem(LOCAL_SNAPSHOT_KEY), raw);
});

test('la migración de v2 conserva registros, metas y recibos confirmados', async () => {
  const f = fixture();
  const original = new LocalRepository({
    storage: memoryStorage(),
    clock: { now: () => start + 1000 },
    id: () => 'start',
  });
  await original.initialize();
  assert.equal((await original.execute(original.prepare({ type: 'start' }))).status, 'confirmed');
  const snapshot = original.getSnapshot().snapshot;
  const raw = JSON.stringify(snapshot);
  const storage = durableStorage(f.native, memoryStorage({ [LOCAL_SNAPSHOT_KEY]: raw }));
  assert.deepEqual(JSON.parse(await storage.getItem(LOCAL_SNAPSHOT_KEY)), snapshot);
  assert.deepEqual(JSON.parse(f.values.get(LOCAL_SNAPSHOT_KEY)), snapshot);
});

test('los datos antiguos dañados se muestran como error sin migrarlos ni reemplazarlos', async () => {
  const f = fixture();
  const storage = durableStorage(f.native, memoryStorage({ [LOCAL_SNAPSHOT_KEY]: '{' }));
  const repo = new LocalRepository({ storage });
  await repo.initialize();
  assert.equal(repo.getSnapshot().status, 'error');
  assert.equal(f.values.size, 0);
});

test('un v2 nativo dañado nunca recupera un perfil viejo del navegador', async () => {
  const f = fixture({ [LOCAL_SNAPSHOT_KEY]: '{' });
  const storage = durableStorage(
    f.native,
    memoryStorage({
      [LOCAL_SNAPSHOT_KEY]: JSON.stringify(createSnapshot(fresh())),
      [LOCAL_STORAGE_KEY]: JSON.stringify(fresh()),
    }),
  );
  const repo = new LocalRepository({ storage });
  await repo.initialize();
  assert.equal(repo.getSnapshot().status, 'error');
  assert.equal(f.values.get(LOCAL_SNAPSHOT_KEY), '{');
});

test('la ausencia nativa explícita evita resucitar una copia WebView descartada', async () => {
  const f = fixture({ [LOCAL_SNAPSHOT_KEY]: null });
  const storage = durableStorage(
    f.native,
    memoryStorage({ [LOCAL_SNAPSHOT_KEY]: JSON.stringify(createSnapshot(fresh())) }),
  );
  assert.equal(await storage.getItem(LOCAL_SNAPSHOT_KEY), null);
});

test('un commit nativo fallido no confirma la operación y su reintento no duplica', async () => {
  const f = fixture({ [LOCAL_SNAPSHOT_KEY]: JSON.stringify(createSnapshot(fresh())) });
  const repo = new LocalRepository({
    storage: durableStorage(f.native, memoryStorage()),
    clock: { now: () => start + 1000 },
    id: () => 'water',
  });
  await repo.initialize();
  const command = repo.prepare({ type: 'record', kind: 'water', amount: 250 });
  f.faults.write = true;
  assert.equal((await repo.execute(command)).reason, 'write');
  assert.equal(repo.getSnapshot().snapshot.state.events.length, 0);
  f.faults.write = false;
  assert.equal((await repo.retry()).status, 'confirmed');
  assert.equal((await repo.execute(command)).replayed, true);
  assert.equal(repo.getSnapshot().snapshot.state.events.length, 1);
});

test('la agenda válida migra; una agenda dañada no se convierte en una agenda vacía', async () => {
  for (const raw of ['{"version":1,"entries":[]}', '{']) {
    const f = fixture();
    const storage = durableStorage(f.native, memoryStorage({ [REMINDER_LOG_KEY]: raw }));
    assert.equal(await storage.getItem(REMINDER_LOG_KEY), raw);
    assert.equal(f.values.has(REMINDER_LOG_KEY), raw !== '{');
  }
});
