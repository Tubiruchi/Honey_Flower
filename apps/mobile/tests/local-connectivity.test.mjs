import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createBrowserConnectivity,
  createCapacitorConnectivity,
  watchConnectivity,
} from '../src/shared/native/connectivity.ts';
import { resolveSyncState } from '../src/shared/data/sync/status.ts';

function fakeConnectivity(initial) {
  const listeners = new Set();
  let connected = initial;
  let removals = 0;
  return {
    port: {
      async getStatus() {
        return connected;
      },
      async addListener(listener) {
        listeners.add(listener);
        return {
          async remove() {
            removals += 1;
            listeners.delete(listener);
          },
        };
      },
    },
    emit(next) {
      connected = next;
      for (const listener of listeners) listener(next);
    },
    listenerCount() {
      return listeners.size;
    },
    removalCount() {
      return removals;
    },
  };
}

test('observa el estado inicial y una sola recuperación aunque el dispositivo repita eventos', async () => {
  const fake = fakeConnectivity(false);
  const snapshots = [];
  const stop = watchConnectivity(fake.port, (snapshot) => snapshots.push(snapshot));
  await Promise.resolve();

  fake.emit(false);
  fake.emit(true);
  fake.emit(true);

  assert.deepEqual(snapshots, [
    { connected: false, initial: true, recovered: false },
    { connected: true, initial: false, recovered: true },
  ]);
  await stop();
  assert.equal(fake.listenerCount(), 0);
  assert.equal(fake.removalCount(), 1);
});

test('deja de publicar cambios después de desmontarse', async () => {
  const fake = fakeConnectivity(true);
  const snapshots = [];
  const stop = watchConnectivity(fake.port, (snapshot) => snapshots.push(snapshot));
  await Promise.resolve();
  await stop();
  fake.emit(false);

  assert.equal(snapshots.length, 1);
});

test('el adaptador web usa navigator y los eventos online y offline', async () => {
  const listeners = new Map();
  const target = {
    addEventListener(name, listener) {
      listeners.set(name, listener);
    },
    removeEventListener(name) {
      listeners.delete(name);
    },
  };
  const status = { onLine: false };
  const port = createBrowserConnectivity(target, status);
  const changes = [];

  assert.equal(await port.getStatus(), false);
  const handle = await port.addListener((connected) => changes.push(connected));
  listeners.get('online')();
  listeners.get('offline')();
  assert.deepEqual(changes, [true, false]);
  await handle.remove();
  assert.equal(listeners.size, 0);
});

test('el adaptador nativo traduce el estado del plugin de Capacitor', async () => {
  let nativeListener;
  const network = {
    async getStatus() {
      return { connected: true, connectionType: 'wifi' };
    },
    async addListener(_event, listener) {
      nativeListener = listener;
      return { async remove() {} };
    },
  };
  const port = createCapacitorConnectivity(network);
  const changes = [];

  assert.equal(await port.getStatus(), true);
  await port.addListener((connected) => changes.push(connected));
  nativeListener({ connected: false, connectionType: 'none' });
  assert.deepEqual(changes, [false]);
});

test('el estado visual distingue desconexión, error, pendiente y sincronizado', () => {
  assert.equal(
    resolveSyncState({ connected: false, failedCount: 0, pendingCount: 0, networkError: false }),
    'offline',
  );
  assert.equal(
    resolveSyncState({ connected: true, failedCount: 1, pendingCount: 1, networkError: false }),
    'error',
  );
  assert.equal(
    resolveSyncState({ connected: true, failedCount: 0, pendingCount: 1, networkError: false }),
    'pending',
  );
  assert.equal(
    resolveSyncState({ connected: true, failedCount: 0, pendingCount: 0, networkError: false }),
    'synced',
  );
});
