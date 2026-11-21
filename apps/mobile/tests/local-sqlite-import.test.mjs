import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { createLocalState } from '../src/features/local/model.ts';
import { createOnboardingDraft } from '../src/features/onboarding/model.ts';
import { memoryStorage } from '../src/shared/data/localRepository.ts';
import { createSnapshot, LOCAL_SNAPSHOT_KEY } from '../src/shared/data/localSnapshot.ts';
import { importLegacySnapshot, LegacyImportError } from '../src/shared/data/sqlite/legacyImport.ts';
import {
  LOCAL_DATABASE_VERSION,
  prepareSqliteConnection,
} from '../src/shared/data/sqlite/migrations.ts';

class NodeSqliteConnection {
  constructor(name = 'test') {
    this.name = name;
    this.database = new DatabaseSync(':memory:');
  }
  async execute(statements) {
    this.database.exec(statements);
  }
  async run(statement, values = []) {
    const result = this.database.prepare(statement).run(...values);
    return { changes: Number(result.changes), lastId: Number(result.lastInsertRowid) };
  }
  async query(statement, values = []) {
    return this.database.prepare(statement).all(...values);
  }
  async begin() {
    this.database.exec('BEGIN IMMEDIATE;');
  }
  async commit() {
    this.database.exec('COMMIT;');
  }
  async rollback() {
    this.database.exec('ROLLBACK;');
  }
  async close() {
    this.database.close();
  }
}

const startedAt = Date.UTC(2026, 10, 20, 12);

function sourceSnapshot({ revision = 3, preferredName = 'Noemi', withEvent = true } = {}) {
  const draft = {
    ...createOnboardingDraft('America/Cancun'),
    preferredName,
    waterGoalMl: '2500',
  };
  const state = createLocalState(startedAt, draft, 'cactus');
  if (withEvent) {
    state.events.push({
      id: 'water-1',
      kind: 'water',
      amount: 500,
      at: startedAt + 1_000,
      verification: {
        version: 1,
        captureId: 'capture-1',
        capturedAt: startedAt + 500,
        source: 'android',
        assessment: 'approved',
        analyzer: 'temporary-review-v1',
      },
    });
  }
  const snapshot = createSnapshot(state, false);
  snapshot.revision = revision;
  snapshot.preferencesRevision = 2;
  if (withEvent) {
    const event = structuredClone(state.events[0]);
    snapshot.operations.push({
      command: {
        id: 'operation-1',
        type: 'record',
        createdAt: event.at,
        eventId: event.id,
        kind: event.kind,
        amount: event.amount,
        dayStart: startedAt,
        verification: structuredClone(event.verification),
      },
      committedAt: event.at,
      before: null,
      after: event,
      eventRevision: 1,
    });
  }
  return snapshot;
}

async function database() {
  const connection = new NodeSqliteConnection();
  await prepareSqliteConnection(connection, () => 100);
  return connection;
}

test('la migración real crea el esquema local versionado con integridad activa', async (t) => {
  const connection = await database();
  t.after(() => connection.close());
  const version = await connection.query('PRAGMA user_version;');
  assert.equal(version[0].user_version, LOCAL_DATABASE_VERSION);
  const tables = await connection.query(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'hf_%' ORDER BY name;",
  );
  assert.deepEqual(
    tables.map(({ name }) => name),
    [
      'hf_cycles',
      'hf_event_versions',
      'hf_goal_changes',
      'hf_habit_events',
      'hf_local_meta',
      'hf_local_snapshot',
      'hf_operation_receipts',
      'hf_preferences',
      'hf_profile',
      'hf_schedule_changes',
      'hf_schema_migrations',
      'hf_sync_deliveries',
      'hf_sync_outbox',
      'hf_sync_state',
    ],
  );
});

test('importa el documento validado completo sin borrar su copia anterior', async (t) => {
  const connection = await database();
  t.after(() => connection.close());
  const snapshot = sourceSnapshot();
  const original = JSON.stringify(snapshot);
  const storage = memoryStorage({ [LOCAL_SNAPSHOT_KEY]: original });

  assert.deepEqual(await importLegacySnapshot(connection, storage, () => 500), {
    status: 'imported',
    sourceKey: LOCAL_SNAPSHOT_KEY,
    revision: 3,
  });
  assert.equal(await storage.getItem(LOCAL_SNAPSHOT_KEY), original);
  assert.equal((await connection.query('SELECT count(*) AS total FROM hf_profile;'))[0].total, 1);
  assert.equal(
    (await connection.query('SELECT count(*) AS total FROM hf_habit_events;'))[0].total,
    1,
  );
  assert.equal(
    (await connection.query('SELECT count(*) AS total FROM hf_operation_receipts;'))[0].total,
    1,
  );
  assert.equal(
    (await connection.query('SELECT preferred_name FROM hf_preferences;'))[0].preferred_name,
    'Noemi',
  );
  assert.equal(
    (await connection.query('SELECT source_key FROM hf_local_snapshot;'))[0].source_key,
    LOCAL_SNAPSHOT_KEY,
  );
});

test('repetir la importación es idempotente y una revisión ambigua se rechaza', async (t) => {
  const connection = await database();
  t.after(() => connection.close());
  const storage = memoryStorage({ [LOCAL_SNAPSHOT_KEY]: JSON.stringify(sourceSnapshot()) });
  await importLegacySnapshot(connection, storage, () => 500);
  assert.equal((await importLegacySnapshot(connection, storage, () => 900)).status, 'current');
  await storage.setItem(
    LOCAL_SNAPSHOT_KEY,
    JSON.stringify(sourceSnapshot({ preferredName: 'Contenido diferente' })),
  );
  await assert.rejects(
    () => importLegacySnapshot(connection, storage),
    /misma revisión pero contenido diferente/,
  );
  assert.equal(
    (await connection.query('SELECT preferred_name FROM hf_preferences;'))[0].preferred_name,
    'Noemi',
  );
});

test('una revisión posterior reemplaza la proyección completa sin mezclar filas', async (t) => {
  const connection = await database();
  t.after(() => connection.close());
  const storage = memoryStorage({
    [LOCAL_SNAPSHOT_KEY]: JSON.stringify(
      sourceSnapshot({ revision: 1, preferredName: 'Anterior' }),
    ),
  });
  await importLegacySnapshot(connection, storage);
  await storage.setItem(
    LOCAL_SNAPSHOT_KEY,
    JSON.stringify(sourceSnapshot({ revision: 2, preferredName: 'Actual', withEvent: false })),
  );
  assert.equal((await importLegacySnapshot(connection, storage)).status, 'imported');
  assert.equal((await connection.query('SELECT revision FROM hf_local_snapshot;'))[0].revision, 2);
  assert.equal(
    (await connection.query('SELECT preferred_name FROM hf_preferences;'))[0].preferred_name,
    'Actual',
  );
  assert.equal(
    (await connection.query('SELECT count(*) AS total FROM hf_habit_events;'))[0].total,
    0,
  );
  assert.equal(
    (await connection.query('SELECT count(*) AS total FROM hf_operation_receipts;'))[0].total,
    0,
  );
});

test('una actualización incompleta revierte toda la proyección anterior', async (t) => {
  const connection = await database();
  t.after(() => connection.close());
  const storage = memoryStorage({
    [LOCAL_SNAPSHOT_KEY]: JSON.stringify(
      sourceSnapshot({ revision: 1, preferredName: 'Original', withEvent: false }),
    ),
  });
  await importLegacySnapshot(connection, storage);
  await connection.execute(`
    CREATE TRIGGER reject_event BEFORE INSERT ON hf_habit_events
    BEGIN SELECT RAISE(ABORT, 'simulated write failure'); END;
  `);
  await storage.setItem(
    LOCAL_SNAPSHOT_KEY,
    JSON.stringify(sourceSnapshot({ revision: 2, preferredName: 'Nueva' })),
  );
  await assert.rejects(() => importLegacySnapshot(connection, storage), /simulated write failure/);
  assert.equal((await connection.query('SELECT revision FROM hf_local_snapshot;'))[0].revision, 1);
  assert.equal(
    (await connection.query('SELECT preferred_name FROM hf_preferences;'))[0].preferred_name,
    'Original',
  );
});

test('una copia v2 dañada nunca cae silenciosamente a información v1', async (t) => {
  const connection = await database();
  t.after(() => connection.close());
  const validV1 = sourceSnapshot().state;
  const storage = memoryStorage({
    [LOCAL_SNAPSHOT_KEY]: '{contenido dañado',
    'honeyflower.local.v1': JSON.stringify(validV1),
  });
  await assert.rejects(
    () => importLegacySnapshot(connection, storage),
    (error) => error instanceof LegacyImportError && /copia más vieja/.test(error.message),
  );
  assert.equal(
    (await connection.query('SELECT count(*) AS total FROM hf_local_snapshot;'))[0].total,
    0,
  );
});

test('una instalación heredada v1 se importa como snapshot v2 sin modificar el origen', async (t) => {
  const connection = await database();
  t.after(() => connection.close());
  const state = sourceSnapshot({ revision: 1, withEvent: false }).state;
  const raw = JSON.stringify(state);
  const storage = memoryStorage({ 'honeyflower.local.v1': raw });
  const result = await importLegacySnapshot(connection, storage);
  assert.deepEqual(result, {
    status: 'imported',
    sourceKey: 'honeyflower.local.v1',
    revision: 1,
  });
  assert.equal(await storage.getItem('honeyflower.local.v1'), raw);
  assert.equal(
    (await connection.query('SELECT source_key FROM hf_local_snapshot;'))[0].source_key,
    'honeyflower.local.v1',
  );
});
