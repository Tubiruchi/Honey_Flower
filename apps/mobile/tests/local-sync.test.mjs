import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { createOnboardingDraft } from '../src/features/onboarding/model.ts';
import { createSupabaseServices } from '../src/features/auth/supabase.ts';
import { LocalRepository, memoryStorage } from '../src/shared/data/localRepository.ts';
import { LOCAL_SNAPSHOT_KEY, parseSnapshot } from '../src/shared/data/localSnapshot.ts';
import { prepareSqliteConnection } from '../src/shared/data/sqlite/migrations.ts';
import { readSqliteSnapshot } from '../src/shared/data/sqlite/legacyImport.ts';
import { prepareSqliteSnapshotStorage } from '../src/shared/data/sqlite/snapshotStorage.ts';
import { SyncEngine } from '../src/shared/data/sync/engine.ts';
import { RemoteSyncError } from '../src/shared/data/sync/model.ts';
import {
  acknowledgeReconciliationNotice,
  unreadReconciliationNotice,
} from '../src/shared/data/sync/outbox.ts';
import { parseRemotePull } from '../src/shared/data/sync/pull.ts';

class NodeSqliteConnection {
  constructor() {
    this.name = 'sync-test';
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
const accountId = '2586eedd-ff5e-49b6-831a-d5e36f786314';
const draft = {
  ...createOnboardingDraft('America/Cancun'),
  preferredName: 'Noemi',
  waterGoalMl: '2500',
};

async function database() {
  const connection = new NodeSqliteConnection();
  await prepareSqliteConnection(connection, () => 100);
  return connection;
}

async function repository(storage) {
  let sequence = 0;
  const result = new LocalRepository({
    storage,
    clock: { now: () => startedAt },
    id: () => `sync-${++sequence}`,
  });
  await result.initialize();
  return result;
}

async function startedAccount(connection, syncEnabled = true) {
  const prepared = await prepareSqliteSnapshotStorage(
    connection,
    memoryStorage(),
    () => 500,
    syncEnabled,
  );
  const local = await repository(prepared.storage);
  const result = await local.execute(local.prepare({ type: 'start', draft }));
  assert.equal(result.status, 'confirmed');
  return { local, prepared };
}

const pendingAck = (operationId) => ({
  operationId,
  status: 'pending',
  appliedServerRevision: null,
  processedAt: null,
  failureCode: null,
});

const appliedAck = (operationId, revision = 1) => ({
  operationId,
  status: 'applied',
  appliedServerRevision: revision,
  processedAt: startedAt - 1_000,
  failureCode: null,
});

const syncOperation = () => ({
  operationId: 'operation-1',
  operationType: 'start',
  baseRevision: 0,
  clientCreatedAt: startedAt,
  attempts: 1,
  payload: {
    version: 1,
    local_revision: 1,
    command: { id: 'operation-1', type: 'start', species: 'sprout', createdAt: startedAt },
    committed_at: startedAt,
  },
});

function remoteDocument(snapshot, serverRevision = snapshot.revision) {
  const state = snapshot.state;
  const preferences = state.preferences;
  const eventVersions = new Map(snapshot.eventVersions.map((entry) => [entry.id, entry.revision]));
  const schedules = [
    ...(state.waterSchedule?.changes ?? []).map((change, index) => ({
      habit: 'water',
      schedule_revision: index + 1,
      from_day: change.fromDay,
      ...(change.effectiveAt === undefined ? {} : { effective_at: change.effectiveAt }),
      time_zone: change.timeZone,
      times: change.times,
      revision: 1,
    })),
    ...(state.sunscreenSchedule?.changes ?? []).map((change) => ({
      habit: 'sunscreen',
      schedule_revision: change.revision,
      from_day: change.fromDay,
      ...(change.effectiveAt === undefined ? {} : { effective_at: change.effectiveAt }),
      time_zone: change.timeZone,
      times: change.times,
      policy_version: change.policy.version,
      window_minutes: change.policy.minutes,
      context_fraction: change.policy.contextFraction,
      revision: 1,
    })),
  ];
  return {
    version: 1,
    server_revision: serverRevision,
    last_operation_id: snapshot.operations.at(-1)?.command.id ?? null,
    unchanged: false,
    profile: {
      preferred_name: preferences.preferredName,
      started_at: state.startedAt,
      first_species: state.firstSpecies,
      collection_time_zone: state.garden?.timeZone ?? preferences.timeZone,
    },
    preferences: {
      water_goal_ml: Number(preferences.waterGoalMl),
      sunscreen_reapplications: preferences.sunscreenReapplications,
      water_times: preferences.waterTimes,
      sunscreen_times: preferences.sunscreenTimes,
      time_zone: preferences.timeZone,
      notifications_enabled: preferences.notifications,
      notification_cap: preferences.notificationCap,
      quiet_periods: preferences.quietPeriods,
      tone: preferences.tone,
      reinforced_sound: preferences.reinforcedSound,
      foreground_flash: preferences.foregroundFlash,
      revision: snapshot.preferencesRevision,
    },
    cycles: state.cycleStarts.map((cycleStartedAt, index) => ({
      cycle_index: index,
      species:
        index % 2 === 0
          ? state.firstSpecies
          : state.firstSpecies === 'sprout'
            ? 'cactus'
            : 'sprout',
      started_at: cycleStartedAt,
      ends_at: cycleStartedAt + 7 * 86_400_000,
      status: index === state.cycleStarts.length - 1 ? 'active' : 'closed',
      revision: 1,
    })),
    goals: state.goals.map((goal) => ({
      day_index: goal.day,
      water_goal_ml: goal.water,
      sunscreen_goal_count: goal.sunscreen,
      revision: 1,
    })),
    schedules,
    schedule_revisions: {
      water: Math.max(1, state.waterSchedule?.changes.length ?? 1),
      sunscreen: state.sunscreenSchedule?.revision ?? 1,
    },
    events: state.events.map((event) => ({
      id: event.id,
      kind: event.kind,
      amount: event.amount,
      at: event.at,
      ...(event.editedAt === undefined ? {} : { edited_at: event.editedAt }),
      ...(event.verification === undefined ? {} : { verification: event.verification }),
      ...(event.appointment === undefined ? {} : { appointment: event.appointment }),
      revision: eventVersions.get(event.id),
      deleted: false,
    })),
    operations: snapshot.operations.map((receipt, index) => ({
      payload: {
        version: 1,
        local_revision: index + 1,
        command: receipt.command,
        committed_at: receipt.committedAt,
        ...(receipt.before === undefined ? {} : { before: receipt.before }),
        ...(receipt.after === undefined ? {} : { after: receipt.after }),
        ...(receipt.eventRevision === undefined ? {} : { event_revision: receipt.eventRevision }),
      },
      applied_server_revision: index + 1,
    })),
  };
}

test('una cuenta agrega la operación a la cola en la misma escritura SQLite', async (t) => {
  const connection = await database();
  t.after(() => connection.close());
  const { prepared } = await startedAccount(connection);
  const rows = await connection.query(
    'SELECT operation_id, operation_type, base_revision, status, payload_json FROM hf_sync_outbox;',
  );
  assert.equal(rows.length, 1);
  assert.deepEqual(
    {
      id: rows[0].operation_id,
      type: rows[0].operation_type,
      revision: rows[0].base_revision,
      status: rows[0].status,
    },
    { id: 'sync-1', type: 'start', revision: 0, status: 'pending' },
  );
  const payload = JSON.parse(rows[0].payload_json);
  assert.equal(payload.command.id, 'sync-1');
  assert.equal(payload.command.draft.preferredName, 'Noemi');

  const snapshot = await prepared.storage.getItem(LOCAL_SNAPSHOT_KEY);
  await prepared.storage.setItem(LOCAL_SNAPSHOT_KEY, snapshot);
  assert.equal(
    (await connection.query('SELECT count(*) AS total FROM hf_sync_outbox;'))[0].total,
    1,
  );
});

test('el modo invitado conserva sus cambios únicamente en el dispositivo', async (t) => {
  const connection = await database();
  t.after(() => connection.close());
  await startedAccount(connection, false);
  assert.equal(
    (await connection.query('SELECT count(*) AS total FROM hf_sync_outbox;'))[0].total,
    0,
  );
});

test('el motor entrega una operación una sola vez y espera la confirmación remota', async (t) => {
  const connection = await database();
  t.after(() => connection.close());
  await startedAccount(connection);
  const pushed = [];
  const remote = {
    configured: true,
    async push(receivedAccount, operation) {
      pushed.push({ receivedAccount, operation });
      return pendingAck(operation.operationId);
    },
    async read() {
      return [];
    },
  };
  const engine = new SyncEngine({ connection, accountId, remote, now: () => startedAt });
  const first = await engine.run();
  assert.equal(first.summary.pendingCount, 1);
  assert.equal(first.networkError, false);
  assert.equal(pushed.length, 1);
  assert.equal(pushed[0].receivedAccount, accountId);
  assert.equal(pushed[0].operation.payload.command.id, 'sync-1');
  assert.equal(
    (await connection.query('SELECT count(*) AS total FROM hf_sync_outbox;'))[0].total,
    0,
  );
  assert.equal(
    (await connection.query('SELECT remote_status FROM hf_sync_deliveries;'))[0].remote_status,
    'pending',
  );

  await engine.run();
  assert.equal(pushed.length, 1);
});

test('la confirmación aplicada avanza el cursor y limpia el estado pendiente', async (t) => {
  const connection = await database();
  t.after(() => connection.close());
  await startedAccount(connection);
  let applied = false;
  const remote = {
    configured: true,
    async push(_account, operation) {
      return pendingAck(operation.operationId);
    },
    async read(_account, operationIds) {
      return applied ? operationIds.map((id) => appliedAck(id, 4)) : [];
    },
  };
  const engine = new SyncEngine({ connection, accountId, remote, now: () => startedAt });
  assert.equal((await engine.run()).summary.pendingCount, 1);
  applied = true;
  const result = await engine.run();
  assert.deepEqual(result.summary, {
    pendingCount: 0,
    failedCount: 0,
    lastPushedAt: startedAt,
  });
  assert.equal(
    (await connection.query('SELECT server_revision FROM hf_sync_state WHERE id = 1;'))[0]
      .server_revision,
    4,
  );
});

test('un error de red conserva la operación y el reintento manual la entrega', async (t) => {
  const connection = await database();
  t.after(() => connection.close());
  await startedAccount(connection);
  let attempts = 0;
  const remote = {
    configured: true,
    async push(_account, operation) {
      attempts++;
      if (attempts === 1) throw new RemoteSyncError('network', true);
      return appliedAck(operation.operationId);
    },
    async read() {
      return [];
    },
  };
  const engine = new SyncEngine({ connection, accountId, remote, now: () => startedAt });
  const failed = await engine.run();
  assert.equal(failed.networkError, true);
  assert.equal(failed.summary.failedCount, 1);
  assert.equal((await connection.query('SELECT status FROM hf_sync_outbox;'))[0].status, 'failed');

  const retried = await engine.retry();
  assert.equal(attempts, 2);
  assert.equal(retried.summary.pendingCount, 0);
  assert.equal(retried.summary.failedCount, 0);
});

test('al reabrir recupera un envío interrumpido sin duplicar la operación', async (t) => {
  const connection = await database();
  t.after(() => connection.close());
  const { prepared } = await startedAccount(connection);
  await connection.run("UPDATE hf_sync_outbox SET status = 'sending';");
  const reopened = await prepareSqliteSnapshotStorage(
    connection,
    prepared.storage,
    () => 800,
    true,
  );
  assert.equal(reopened.imported.status, 'current');
  const rows = await connection.query('SELECT status FROM hf_sync_outbox;');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, 'pending');
});

test('una operación rechazada queda visible como error y no se vuelve a enviar', async (t) => {
  const connection = await database();
  t.after(() => connection.close());
  await startedAccount(connection);
  let pushes = 0;
  const remote = {
    configured: true,
    async push(_account, operation) {
      pushes++;
      return {
        operationId: operation.operationId,
        status: 'rejected',
        appliedServerRevision: null,
        processedAt: startedAt,
        failureCode: 'invalid-operation',
      };
    },
    async read() {
      return [];
    },
  };
  const engine = new SyncEngine({ connection, accountId, remote, now: () => startedAt });
  const result = await engine.run();
  assert.equal(result.summary.pendingCount, 0);
  assert.equal(result.summary.failedCount, 1);
  await engine.run();
  assert.equal(pushes, 1);
});

test('si falla la cola, SQLite revierte también el cambio de dominio', async (t) => {
  const connection = await database();
  t.after(() => connection.close());
  const prepared = await prepareSqliteSnapshotStorage(connection, memoryStorage(), () => 500, true);
  await connection.execute(`
    CREATE TRIGGER reject_outbox BEFORE INSERT ON hf_sync_outbox
    BEGIN SELECT RAISE(ABORT, 'simulated outbox failure'); END;
  `);
  const local = await repository(prepared.storage);
  const result = await local.execute(local.prepare({ type: 'start', draft }));
  assert.equal(result.status, 'failed');
  assert.equal(result.reason, 'write');
  assert.equal(
    (await connection.query('SELECT count(*) AS total FROM hf_local_snapshot;'))[0].total,
    0,
  );
  assert.equal((await connection.query('SELECT count(*) AS total FROM hf_profile;'))[0].total, 0);
  assert.equal(
    (await connection.query('SELECT count(*) AS total FROM hf_sync_outbox;'))[0].total,
    0,
  );
});

test('el adaptador Supabase inserta solo una operación pendiente de la cuenta', async (t) => {
  const originalFetch = globalThis.fetch;
  let requestBody;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);
    assert.equal(request.method, 'POST');
    assert.match(request.url, /\/rest\/v1\/sync_operations\?select=/);
    requestBody = JSON.parse(await request.text());
    return new Response(
      JSON.stringify({
        operation_id: 'operation-1',
        operation_type: 'start',
        base_revision: 0,
        client_created_at: new Date(startedAt).toISOString(),
        payload: requestBody.payload,
        status: 'pending',
        applied_server_revision: null,
        processed_at: null,
        failure_code: null,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    );
  };
  const { sync } = createSupabaseServices({
    url: 'https://example.supabase.co',
    key: 'sb_publishable_test',
  });
  const operation = syncOperation();
  assert.deepEqual(await sync.push(accountId, operation), pendingAck('operation-1'));
  assert.equal(requestBody.user_id, accountId);
  assert.equal(requestBody.status, 'pending');
  assert.equal(requestBody.operation_id, operation.operationId);
  assert.equal(requestBody.payload.command.type, 'start');
  assert.equal('photo' in requestBody.payload, false);
});

test('un reintento acepta el duplicado remoto solo si conserva el mismo contenido', async (t) => {
  const originalFetch = globalThis.fetch;
  const operation = syncOperation();
  let calls = 0;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async (input, init) => {
    calls++;
    const request = input instanceof Request ? input : new Request(input, init);
    if (request.method === 'POST')
      return new Response(
        JSON.stringify({ code: '23505', message: 'duplicate key', details: '', hint: '' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } },
      );
    assert.equal(request.method, 'GET');
    return new Response(
      JSON.stringify({
        operation_id: operation.operationId,
        operation_type: operation.operationType,
        base_revision: operation.baseRevision,
        client_created_at: new Date(operation.clientCreatedAt).toISOString(),
        payload: operation.payload,
        status: 'pending',
        applied_server_revision: null,
        processed_at: null,
        failure_code: null,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };
  const { sync } = createSupabaseServices({
    url: 'https://example.supabase.co',
    key: 'sb_publishable_test',
  });
  assert.deepEqual(await sync.push(accountId, operation), pendingAck(operation.operationId));
  assert.equal(calls, 2);
});

test('un dispositivo nuevo descarga la proyección confirmada y la instala en SQLite', async (t) => {
  const sourceConnection = await database();
  const targetConnection = await database();
  t.after(() => sourceConnection.close());
  t.after(() => targetConnection.close());
  const { prepared } = await startedAccount(sourceConnection);
  const sourceSnapshot = parseSnapshot(await prepared.storage.getItem(LOCAL_SNAPSHOT_KEY));
  assert.ok(sourceSnapshot);
  const document = remoteDocument(sourceSnapshot, 1);
  const acknowledgements = [];
  const remote = {
    configured: true,
    async push() {
      throw new Error('A new device has nothing to upload');
    },
    async read() {
      return [];
    },
    async pull(receivedAccount, cursor) {
      assert.equal(receivedAccount, accountId);
      assert.equal(cursor, 0);
      return parseRemotePull(document);
    },
    async acknowledgePull(receivedAccount, device, revision) {
      acknowledgements.push({ receivedAccount, device, revision });
    },
  };
  const engine = new SyncEngine({
    connection: targetConnection,
    accountId,
    remote,
    now: () => startedAt + 1_000,
    platform: 'android',
    appVersion: '0.4.3',
  });
  const result = await engine.run();
  assert.equal(result.pulled, true);
  assert.equal(result.networkError, false);
  assert.equal(result.summary.failedCount, 0);
  const installed = await readSqliteSnapshot(targetConnection);
  assert.equal(installed.snapshot.state.preferences.preferredName, 'Noemi');
  assert.equal(installed.snapshot.revision, 1);
  assert.equal(acknowledgements.length, 1);
  assert.equal(acknowledgements[0].receivedAccount, accountId);
  assert.equal(acknowledgements[0].device.platform, 'android');
  assert.equal(acknowledgements[0].device.appVersion, '0.4.3');
  assert.match(acknowledgements[0].device.deviceId, /^[0-9a-f-]{36}$/i);
  assert.equal(acknowledgements[0].revision, 1);
});

test('una operación rechazada vuelve al estado confirmado sin perder el historial de auditoría', async (t) => {
  const connection = await database();
  t.after(() => connection.close());
  const { local, prepared } = await startedAccount(connection);
  const confirmedSnapshot = parseSnapshot(await prepared.storage.getItem(LOCAL_SNAPSHOT_KEY));
  assert.ok(confirmedSnapshot);
  const change = await local.execute(local.prepare({ type: 'record', kind: 'water', amount: 250 }));
  assert.equal(change.status, 'confirmed', JSON.stringify(change));
  const remote = {
    configured: true,
    async push(_receivedAccount, operation) {
      return operation.operationType === 'start'
        ? appliedAck(operation.operationId, 1)
        : {
            operationId: operation.operationId,
            status: 'conflict',
            appliedServerRevision: null,
            processedAt: startedAt + 1,
            failureCode: 'event-revision',
          };
    },
    async read() {
      return [];
    },
    async pull(_receivedAccount, cursor) {
      assert.equal(cursor, 0);
      return parseRemotePull(remoteDocument(confirmedSnapshot, 1));
    },
  };
  const engine = new SyncEngine({ connection, accountId, remote, now: () => startedAt + 2_000 });
  const result = await engine.run();
  assert.equal(result.pulled, true);
  assert.equal(result.reconciledCount, 1);
  assert.equal(result.summary.failedCount, 0);
  const installed = await readSqliteSnapshot(connection);
  assert.equal(installed.snapshot.state.events.length, 0);
  const delivery = (
    await connection.query(
      "SELECT remote_status, reconciled_at, operation_type, notice_seen_at FROM hf_sync_deliveries WHERE remote_status = 'conflict';",
    )
  )[0];
  assert.equal(delivery.remote_status, 'conflict');
  assert.equal(delivery.reconciled_at, startedAt + 2_000);
  assert.equal(delivery.operation_type, 'record');
  assert.equal(delivery.notice_seen_at, null);

  assert.deepEqual(await unreadReconciliationNotice(connection), {
    count: 1,
    operationIds: [change.operationId],
    review: 'records',
  });
  await acknowledgeReconciliationNotice(connection, [change.operationId], startedAt + 3_000);
  assert.equal(await unreadReconciliationNotice(connection), null);
  assert.equal(
    (
      await connection.query(
        "SELECT notice_seen_at FROM hf_sync_deliveries WHERE remote_status = 'conflict';",
      )
    )[0].notice_seen_at,
    startedAt + 3_000,
  );
});

test('el aviso agrupa ajustes de perfil y registros sin marcar ajustes posteriores', async (t) => {
  const connection = await database();
  t.after(() => connection.close());
  await connection.run(
    `INSERT INTO hf_sync_deliveries
      (operation_id, delivered_at, remote_status, processed_at, failure_code,
       reconciled_at, operation_type)
     VALUES (?, ?, 'conflict', ?, 'revision', ?, 'preferences');`,
    ['profile-conflict', startedAt, startedAt, startedAt],
  );
  await connection.run(
    `INSERT INTO hf_sync_deliveries
      (operation_id, delivered_at, remote_status, processed_at, failure_code,
       reconciled_at, operation_type)
     VALUES (?, ?, 'rejected', ?, 'day-closed', ?, 'edit');`,
    ['record-conflict', startedAt, startedAt, startedAt],
  );
  assert.deepEqual(await unreadReconciliationNotice(connection), {
    count: 2,
    operationIds: ['profile-conflict', 'record-conflict'],
    review: 'both',
  });
  await acknowledgeReconciliationNotice(connection, ['profile-conflict'], startedAt + 10);
  assert.deepEqual(await unreadReconciliationNotice(connection), {
    count: 1,
    operationIds: ['record-conflict'],
    review: 'records',
  });
});

test('no descarga mientras exista un cambio local todavía pendiente', async (t) => {
  const connection = await database();
  t.after(() => connection.close());
  await startedAccount(connection);
  let pulls = 0;
  const remote = {
    configured: true,
    async push() {
      throw new Error('maxUploads keeps this operation local');
    },
    async read() {
      return [];
    },
    async pull() {
      pulls++;
      throw new Error('The pull must be deferred');
    },
  };
  const engine = new SyncEngine({ connection, accountId, remote, now: () => startedAt });
  const result = await engine.run(true, 0);
  assert.equal(result.summary.pendingCount, 1);
  assert.equal(result.networkError, false);
  assert.equal(pulls, 0);
});

test('el adaptador descarga por cursor y confirma el avance del dispositivo', async (t) => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);
    requests.push({ url: request.url, method: request.method, body: await request.text() });
    if (request.url.includes('/rpc/pull_sync_snapshot'))
      return new Response(
        JSON.stringify({
          version: 1,
          server_revision: 7,
          last_operation_id: 'last-7',
          unchanged: true,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    return new Response('', { status: 201 });
  };
  const { sync } = createSupabaseServices({
    url: 'https://example.supabase.co',
    key: 'sb_publishable_test',
  });
  const pulled = await sync.pull(accountId, 7);
  assert.equal(pulled.unchanged, true);
  await sync.acknowledgePull(
    accountId,
    {
      deviceId: 'cae3eb36-b2c6-48f7-985e-75aa145e9748',
      platform: 'android',
      appVersion: '0.4.3',
    },
    7,
    startedAt,
  );
  assert.equal(requests.length, 2);
  assert.deepEqual(JSON.parse(requests[0].body), { p_since_revision: 7 });
  assert.match(requests[1].url, /sync_devices/);
  const device = JSON.parse(requests[1].body);
  assert.equal(device.user_id, accountId);
  assert.equal(device.last_pulled_revision, 7);
  assert.equal(device.app_version, '0.4.3');
});

test('rechaza una descarga que no cumple el contrato local completo', () => {
  assert.throws(
    () =>
      parseRemotePull({
        version: 1,
        server_revision: 1,
        last_operation_id: null,
        unchanged: false,
        profile: {},
      }),
    /No se pudo entregar la operación al servidor/,
  );
});
