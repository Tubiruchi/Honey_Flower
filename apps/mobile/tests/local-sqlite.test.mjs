import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LOCAL_DATABASE_VERSION,
  prepareSqliteConnection,
} from '../src/shared/data/sqlite/migrations.ts';
import { SqliteDatabaseManager, sqliteDatabaseName } from '../src/shared/data/sqlite/manager.ts';
import { sqliteTransaction } from '../src/shared/data/sqlite/port.ts';

const account = '2586eedd-ff5e-49b6-831a-d5e36f786314';

class FakeConnection {
  constructor(name, { version = 0, meta = {} } = {}) {
    this.name = name;
    this.userVersion = version;
    this.foreignKeys = 0;
    this.journalMode = 'delete';
    this.migrations = [];
    this.meta = new Map(Object.entries(meta));
    this.closed = false;
    this.begins = 0;
    this.commits = 0;
    this.rollbacks = 0;
    this.failMigration = false;
    this.transactionSnapshot = null;
  }
  async execute(statements) {
    if (statements.includes('PRAGMA foreign_keys = ON')) this.foreignKeys = 1;
    if (this.failMigration && statements.includes('CREATE TABLE')) throw new Error('disk full');
    const version = statements.match(/PRAGMA user_version = (\d+)/)?.[1];
    if (version) this.userVersion = Number(version);
  }
  async run(statement, values = []) {
    if (statement.includes('INSERT INTO hf_schema_migrations'))
      this.migrations.push({ version: values[0], name: values[1], appliedAt: values[2] });
    if (statement.includes('INSERT INTO hf_local_meta')) this.meta.set('database_scope', values[0]);
    return { changes: 1 };
  }
  async query(statement) {
    if (statement === 'PRAGMA journal_mode = WAL;') {
      this.journalMode = 'wal';
      return [{ journal_mode: 'wal' }];
    }
    if (statement === 'PRAGMA foreign_keys;') return [{ foreign_keys: this.foreignKeys }];
    if (statement === 'PRAGMA user_version;') return [{ user_version: this.userVersion }];
    if (statement.startsWith('SELECT version FROM hf_schema_migrations'))
      return this.migrations.map(({ version }) => ({ version }));
    if (statement.includes('SELECT value FROM hf_local_meta')) {
      const value = this.meta.get('database_scope');
      return value === undefined ? [] : [{ value }];
    }
    throw new Error(`Unexpected query: ${statement}`);
  }
  async begin() {
    this.begins++;
    this.transactionSnapshot = {
      userVersion: this.userVersion,
      migrations: structuredClone(this.migrations),
      meta: new Map(this.meta),
    };
  }
  async commit() {
    this.commits++;
    this.transactionSnapshot = null;
  }
  async rollback() {
    this.rollbacks++;
    if (this.transactionSnapshot) {
      this.userVersion = this.transactionSnapshot.userVersion;
      this.migrations = this.transactionSnapshot.migrations;
      this.meta = this.transactionSnapshot.meta;
      this.transactionSnapshot = null;
    }
  }
  async close() {
    this.closed = true;
  }
}

test('genera una base diferente para invitado y para cada UUID de Supabase', () => {
  assert.equal(sqliteDatabaseName('guest'), 'honeyflower_guest');
  assert.equal(sqliteDatabaseName(account), 'honeyflower_2586eeddff5e49b6831ad5e36f786314');
  assert.throws(() => sqliteDatabaseName('signed-out'), /identificador SQLite válido/);
});

test('activa integridad y WAL antes de aplicar la migración técnica en una transacción', async () => {
  const connection = new FakeConnection('honeyflower_guest');
  const version = await prepareSqliteConnection(connection, () => 1234);
  assert.equal(version, LOCAL_DATABASE_VERSION);
  assert.equal(connection.foreignKeys, 1);
  assert.equal(connection.journalMode, 'wal');
  assert.deepEqual(connection.migrations, [
    { version: 1, name: 'sqlite_foundation', appliedAt: 1234 },
    { version: 2, name: 'local_snapshot_projection', appliedAt: 1234 },
    { version: 3, name: 'sync_delivery_receipts', appliedAt: 1234 },
    { version: 4, name: 'sync_pull_reconciliation', appliedAt: 1234 },
    { version: 5, name: 'sync_reconciliation_notice', appliedAt: 1234 },
  ]);
  assert.equal(connection.begins, 5);
  assert.equal(connection.commits, 5);
  assert.equal(connection.rollbacks, 0);

  await prepareSqliteConnection(connection, () => 9999);
  assert.equal(connection.migrations.length, 5);
});

test('revierte una migración SQLite incompleta y conserva la versión anterior', async () => {
  const connection = new FakeConnection('honeyflower_guest');
  connection.failMigration = true;
  await assert.rejects(() => prepareSqliteConnection(connection), /disk full/);
  assert.equal(connection.userVersion, 0);
  assert.equal(connection.migrations.length, 0);
  assert.equal(connection.commits, 0);
  assert.equal(connection.rollbacks, 1);
});

test('rechaza una base creada por una versión futura de la app', async () => {
  const connection = new FakeConnection('future', { version: LOCAL_DATABASE_VERSION + 1 });
  await assert.rejects(() => prepareSqliteConnection(connection), /versión más reciente/);
});

test('abre una sola conexión por alcance y cierra la anterior al cambiar de cuenta', async () => {
  const opened = [];
  const factory = {
    async open(name) {
      const connection = new FakeConnection(name);
      opened.push(connection);
      return connection;
    },
  };
  const manager = new SqliteDatabaseManager(factory, { now: () => 2000 });
  const guest = await manager.open('guest');
  assert.equal(guest.connection.meta.get('database_scope'), 'guest');
  assert.equal((await manager.open('guest')).connection, guest.connection);
  assert.equal(opened.length, 1);

  const signedIn = await manager.open(account);
  assert.equal(guest.connection.closed, true);
  assert.equal(signedIn.connection.meta.get('database_scope'), account);
  assert.notEqual(signedIn.name, guest.name);
  await manager.close();
  assert.equal(signedIn.connection.closed, true);
});

test('no abre una base cuya marca interna pertenece a otra cuenta', async () => {
  const connection = new FakeConnection(sqliteDatabaseName(account), {
    version: 1,
    meta: { database_scope: '4016ea49-2598-441e-8e5e-f1b63ff4a32f' },
  });
  connection.migrations.push({ version: 1, name: 'sqlite_foundation', appliedAt: 1 });
  const manager = new SqliteDatabaseManager({ open: async () => connection });
  await assert.rejects(() => manager.open(account), /pertenece a otra cuenta/);
  assert.equal(connection.closed, true);
});

test('serializa dos transacciones de la misma conexión antes de abrir la segunda', async () => {
  const connection = new FakeConnection('serial');
  const order = [];
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const first = sqliteTransaction(connection, async () => {
    order.push('first-start');
    await gate;
    order.push('first-end');
  });
  await Promise.resolve();
  const second = sqliteTransaction(connection, async () => {
    order.push('second-start');
  });
  await Promise.resolve();
  assert.equal(connection.begins, 1);
  release();
  await Promise.all([first, second]);
  assert.deepEqual(order, ['first-start', 'first-end', 'second-start']);
  assert.equal(connection.begins, 2);
  assert.equal(connection.commits, 2);
});
