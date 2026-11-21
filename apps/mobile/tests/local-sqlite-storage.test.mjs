import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { createOnboardingDraft } from '../src/features/onboarding/model.ts';
import { LocalRepository, memoryStorage } from '../src/shared/data/localRepository.ts';
import { LOCAL_SNAPSHOT_KEY, parseSnapshot } from '../src/shared/data/localSnapshot.ts';
import { LegacyImportError } from '../src/shared/data/sqlite/legacyImport.ts';
import { prepareSqliteConnection } from '../src/shared/data/sqlite/migrations.ts';
import { prepareSqliteSnapshotStorage } from '../src/shared/data/sqlite/snapshotStorage.ts';

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

async function database() {
  const connection = new NodeSqliteConnection();
  await prepareSqliteConnection(connection, () => 100);
  return connection;
}

const startedAt = Date.UTC(2026, 10, 20, 12);
const draft = {
  ...createOnboardingDraft('America/Cancun'),
  preferredName: 'Noemi',
  waterGoalMl: '2500',
};

async function startRepository(storage, clock = { now: () => startedAt }) {
  let sequence = 0;
  const repository = new LocalRepository({
    storage,
    clock,
    id: () => `sqlite-${++sequence}`,
  });
  await repository.initialize();
  return repository;
}

test('el corte inicial marca SQLite como fuente principal y conserva el espejo anterior', async (t) => {
  const connection = await database();
  t.after(() => connection.close());
  const legacy = memoryStorage();
  const prepared = await prepareSqliteSnapshotStorage(connection, legacy, () => 500);
  assert.equal(prepared.imported.status, 'empty');
  const marker = await connection.query(
    "SELECT value FROM hf_local_meta WHERE key = 'snapshot_authority';",
  );
  assert.equal(marker[0].value, 'sqlite-snapshot-v1');

  const repository = await startRepository(prepared.storage);
  const result = await repository.execute(repository.prepare({ type: 'start', draft }));
  assert.equal(result.status, 'confirmed');
  const sqliteRaw = await prepared.storage.getItem(LOCAL_SNAPSHOT_KEY);
  const mirrorRaw = await legacy.getItem(LOCAL_SNAPSHOT_KEY);
  assert.ok(parseSnapshot(sqliteRaw));
  assert.equal(mirrorRaw, sqliteRaw);
});

test('el repositorio reabre y modifica directamente las tablas SQLite', async (t) => {
  const connection = await database();
  t.after(() => connection.close());
  const legacy = memoryStorage();
  const prepared = await prepareSqliteSnapshotStorage(connection, legacy);
  let now = startedAt;
  const clock = { now: () => now };
  const repository = await startRepository(prepared.storage, clock);
  assert.equal(
    (await repository.execute(repository.prepare({ type: 'start', draft }))).status,
    'confirmed',
  );
  now += 1_000;
  assert.equal(
    (await repository.execute(repository.prepare({ type: 'record', kind: 'water', amount: 500 })))
      .status,
    'confirmed',
  );
  assert.equal(
    (await connection.query('SELECT count(*) AS total FROM hf_habit_events;'))[0].total,
    1,
  );
  assert.equal(
    (await connection.query('SELECT count(*) AS total FROM hf_operation_receipts;'))[0].total,
    2,
  );

  const reopened = await startRepository(prepared.storage, clock);
  assert.equal(reopened.getSnapshot().status, 'ready');
  assert.equal(reopened.getSnapshot().snapshot.state.events[0].amount, 500);
});

test('un fallo del espejo anterior no revoca una escritura confirmada en SQLite', async (t) => {
  const connection = await database();
  t.after(() => connection.close());
  const mirror = {
    getItem: () => null,
    setItem: () => {
      throw new Error('mirror unavailable');
    },
  };
  const prepared = await prepareSqliteSnapshotStorage(connection, mirror);
  const repository = await startRepository(prepared.storage);
  const result = await repository.execute(repository.prepare({ type: 'start', draft }));
  assert.equal(result.status, 'confirmed');

  const reopened = await prepareSqliteSnapshotStorage(connection, mirror);
  assert.equal(reopened.imported.status, 'current');
  assert.ok(parseSnapshot(await reopened.storage.getItem(LOCAL_SNAPSHOT_KEY)));
});

test('un fallo SQLite conserva la revisión confirmada y no actualiza el espejo', async (t) => {
  const connection = await database();
  t.after(() => connection.close());
  const mirror = memoryStorage();
  const prepared = await prepareSqliteSnapshotStorage(connection, mirror);
  let now = startedAt;
  const repository = await startRepository(prepared.storage, { now: () => now });
  await repository.execute(repository.prepare({ type: 'start', draft }));
  const previousMirror = await mirror.getItem(LOCAL_SNAPSHOT_KEY);
  await connection.execute(`
    CREATE TRIGGER reject_snapshot BEFORE INSERT ON hf_local_snapshot
    BEGIN SELECT RAISE(ABORT, 'simulated sqlite failure'); END;
  `);
  now += 1_000;
  const failed = await repository.execute(
    repository.prepare({ type: 'record', kind: 'water', amount: 500 }),
  );
  assert.equal(failed.status, 'failed');
  assert.equal(failed.reason, 'write');
  assert.equal((await connection.query('SELECT revision FROM hf_local_snapshot;'))[0].revision, 1);
  assert.equal(await mirror.getItem(LOCAL_SNAPSHOT_KEY), previousMirror);
});

test('una copia principal dañada se bloquea y nunca cae silenciosamente al espejo', async (t) => {
  const connection = await database();
  t.after(() => connection.close());
  const mirror = memoryStorage();
  const prepared = await prepareSqliteSnapshotStorage(connection, mirror);
  const repository = await startRepository(prepared.storage);
  await repository.execute(repository.prepare({ type: 'start', draft }));
  await connection.run("UPDATE hf_local_snapshot SET snapshot_json = '{}';");

  await assert.rejects(
    () => prepareSqliteSnapshotStorage(connection, mirror),
    (error) => error instanceof LegacyImportError && /no supera la validación/.test(error.message),
  );
});

test('las claves temporales y de avisos continúan delegadas al almacenamiento anterior', async (t) => {
  const connection = await database();
  t.after(() => connection.close());
  const mirror = memoryStorage();
  const prepared = await prepareSqliteSnapshotStorage(connection, mirror);
  await prepared.storage.setItem('temporary-key', 'value');
  assert.equal(await prepared.storage.getItem('temporary-key'), 'value');
  assert.equal(await mirror.getItem('temporary-key'), 'value');
});
