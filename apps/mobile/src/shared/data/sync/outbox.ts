import { commandFingerprint } from '../localSnapshot.ts';
import type { LocalSnapshot, OperationReceipt } from '../localSnapshot.ts';
import type { SqliteConnectionPort } from '../sqlite/port.ts';
import { sqliteTransaction } from '../sqlite/port.ts';
import type { PendingSyncOperation, RemoteOperationAck, SyncOperationPayload } from './model.ts';

interface OutboxRow {
  [key: string]: string | number | null;
  operation_id: string;
  operation_type: PendingSyncOperation['operationType'];
  base_revision: number;
  client_created_at: number;
  payload_json: string;
  attempts: number;
}

function payload(receipt: OperationReceipt, localRevision: number): SyncOperationPayload {
  return {
    version: 1,
    local_revision: localRevision,
    command: structuredClone(receipt.command),
    committed_at: receipt.committedAt,
    ...(receipt.before === undefined ? {} : { before: structuredClone(receipt.before) }),
    ...(receipt.after === undefined ? {} : { after: structuredClone(receipt.after) }),
    ...(receipt.eventRevision === undefined ? {} : { event_revision: receipt.eventRevision }),
  };
}

function parseOutbox(row: OutboxRow): PendingSyncOperation {
  const parsed = JSON.parse(row.payload_json) as SyncOperationPayload;
  if (
    !parsed ||
    parsed.version !== 1 ||
    !parsed.command ||
    parsed.command.id !== row.operation_id ||
    parsed.command.type !== row.operation_type ||
    parsed.command.createdAt !== row.client_created_at
  )
    throw new Error('La cola local contiene una operación inválida.');
  return {
    operationId: row.operation_id,
    operationType: row.operation_type,
    baseRevision: row.base_revision,
    clientCreatedAt: row.client_created_at,
    payload: parsed,
    attempts: row.attempts,
  };
}

export async function queueSnapshotOperations(
  connection: SqliteConnectionPort,
  snapshot: LocalSnapshot,
): Promise<void> {
  const state = await connection.query<{ server_revision: number }>(
    'SELECT server_revision FROM hf_sync_state WHERE id = 1;',
  );
  const rawBaseRevision = state[0]?.server_revision;
  if (!Number.isSafeInteger(rawBaseRevision) || Number(rawBaseRevision) < 0)
    throw new Error('El cursor local de sincronización no es válido.');
  const baseRevision = Number(rawBaseRevision);

  const delivered = new Set(
    (
      await connection.query<{ operation_id: string }>(
        'SELECT operation_id FROM hf_sync_deliveries;',
      )
    ).map(({ operation_id }) => operation_id),
  );
  const queued = new Map(
    (
      await connection.query<OutboxRow>(
        `SELECT operation_id, operation_type, base_revision, client_created_at,
                payload_json, attempts
         FROM hf_sync_outbox;`,
      )
    ).map((row) => [row.operation_id, row]),
  );

  for (const receipt of snapshot.operations) {
    if (delivered.has(receipt.command.id)) continue;
    const operationPayload = payload(receipt, snapshot.revision);
    const payloadJson = JSON.stringify(operationPayload);
    const existing = queued.get(receipt.command.id);
    if (existing) {
      const existingPayload = JSON.parse(existing.payload_json) as SyncOperationPayload;
      if (
        existing.operation_type !== receipt.command.type ||
        existing.client_created_at !== receipt.command.createdAt ||
        commandFingerprint({ ...existingPayload, local_revision: 0 }) !==
          commandFingerprint({ ...operationPayload, local_revision: 0 })
      )
        throw new Error('Un identificador de operación ya pertenece a otro cambio local.');
      continue;
    }
    await connection.run(
      `INSERT INTO hf_sync_outbox
        (operation_id, operation_type, base_revision, client_created_at, payload_json,
         status, attempts, next_attempt_at, last_error_code)
       VALUES (?, ?, ?, ?, ?, 'pending', 0, NULL, NULL);`,
      [
        receipt.command.id,
        receipt.command.type,
        baseRevision,
        receipt.command.createdAt,
        payloadJson,
      ],
    );
  }
}

export async function recoverInterruptedOutbox(connection: SqliteConnectionPort): Promise<void> {
  await connection.run(
    `UPDATE hf_sync_outbox
     SET status = 'pending', next_attempt_at = NULL, last_error_code = NULL
     WHERE status = 'sending';`,
  );
}

export async function claimNextOperation(
  connection: SqliteConnectionPort,
  now: number,
): Promise<PendingSyncOperation | null> {
  return sqliteTransaction(connection, async () => {
    const rows = await connection.query<OutboxRow>(
      `SELECT operation_id, operation_type, base_revision, client_created_at,
              payload_json, attempts
       FROM hf_sync_outbox
       WHERE status = 'pending'
          OR (status = 'failed' AND COALESCE(next_attempt_at, 0) <= ?)
       ORDER BY client_created_at, operation_id
       LIMIT 1;`,
      [now],
    );
    const row = rows[0];
    if (!row) return null;
    const result = await connection.run(
      `UPDATE hf_sync_outbox
       SET status = 'sending', attempts = attempts + 1,
           next_attempt_at = NULL, last_error_code = NULL
       WHERE operation_id = ? AND status IN ('pending', 'failed');`,
      [row.operation_id],
    );
    if (result.changes !== 1) throw new Error('Otra tarea reclamó la operación local.');
    return parseOutbox({ ...row, attempts: row.attempts + 1 });
  });
}

export function retryDelay(attempts: number): number {
  return Math.min(5 * 60_000, 5_000 * 2 ** Math.min(6, Math.max(0, attempts - 1)));
}

export async function markOperationFailed(
  connection: SqliteConnectionPort,
  operation: PendingSyncOperation,
  code: string,
  now: number,
): Promise<void> {
  const result = await connection.run(
    `UPDATE hf_sync_outbox
     SET status = 'failed', next_attempt_at = ?, last_error_code = ?
     WHERE operation_id = ? AND status = 'sending';`,
    [now + retryDelay(operation.attempts), code.slice(0, 64), operation.operationId],
  );
  if (result.changes !== 1) throw new Error('La operación ya no estaba en envío.');
}

export async function retryFailedOperations(connection: SqliteConnectionPort): Promise<void> {
  await connection.run(
    `UPDATE hf_sync_outbox
     SET next_attempt_at = 0
     WHERE status = 'failed';`,
  );
}

function validateAck(ack: RemoteOperationAck) {
  const final = ack.status !== 'pending';
  if (
    !ack.operationId ||
    (ack.status === 'pending' &&
      (ack.appliedServerRevision !== null ||
        ack.processedAt !== null ||
        ack.failureCode !== null)) ||
    (ack.status === 'applied' &&
      (!Number.isSafeInteger(ack.appliedServerRevision) ||
        Number(ack.appliedServerRevision) < 0 ||
        ack.processedAt === null ||
        ack.failureCode !== null)) ||
    ((ack.status === 'rejected' || ack.status === 'conflict') &&
      (ack.appliedServerRevision !== null || ack.processedAt === null)) ||
    (!final && ack.failureCode !== null)
  )
    throw new Error('El servidor devolvió un estado de sincronización inválido.');
}

export async function recordRemoteAck(
  connection: SqliteConnectionPort,
  ack: RemoteOperationAck,
  now: number,
): Promise<void> {
  validateAck(ack);
  await sqliteTransaction(connection, async () => {
    const [queued] = await connection.query<{
      operation_type: PendingSyncOperation['operationType'];
    }>('SELECT operation_type FROM hf_sync_outbox WHERE operation_id = ?;', [ack.operationId]);
    await connection.run(
      `INSERT INTO hf_sync_deliveries
        (operation_id, delivered_at, remote_status, applied_server_revision,
         processed_at, failure_code, operation_type)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(operation_id) DO UPDATE SET
         remote_status = excluded.remote_status,
         applied_server_revision = excluded.applied_server_revision,
         processed_at = excluded.processed_at,
         failure_code = excluded.failure_code,
         operation_type = COALESCE(hf_sync_deliveries.operation_type, excluded.operation_type);`,
      [
        ack.operationId,
        now,
        ack.status,
        ack.appliedServerRevision,
        ack.processedAt,
        ack.failureCode?.slice(0, 64) ?? null,
        queued?.operation_type ?? null,
      ],
    );
    await connection.run('DELETE FROM hf_sync_outbox WHERE operation_id = ?;', [ack.operationId]);
    await connection.run(
      `UPDATE hf_sync_state
       SET server_revision = MAX(server_revision, COALESCE(?, server_revision)),
           last_operation_id = ?, last_pushed_at = ?
       WHERE id = 1;`,
      [ack.appliedServerRevision, ack.operationId, now],
    );
  });
}

export async function remotePendingIds(
  connection: SqliteConnectionPort,
  limit = 25,
): Promise<string[]> {
  const rows = await connection.query<{ operation_id: string }>(
    `SELECT operation_id FROM hf_sync_deliveries
     WHERE remote_status = 'pending'
     ORDER BY delivered_at, operation_id
     LIMIT ?;`,
    [limit],
  );
  return rows.map(({ operation_id }) => operation_id);
}

export interface LocalSyncSummary {
  pendingCount: number;
  failedCount: number;
  lastPushedAt: number | null;
}

export interface ReconciliationNotice {
  count: number;
  operationIds: string[];
  review: 'profile' | 'records' | 'both';
}

/** A conflict is never silently discarded: it remains auditable and visible until acknowledged. */
export async function unreadReconciliationNotice(
  connection: SqliteConnectionPort,
): Promise<ReconciliationNotice | null> {
  const rows = await connection.query<{
    operation_id: string;
    operation_type: PendingSyncOperation['operationType'] | null;
    reconciled_at: number;
  }>(
    `SELECT operation_id, operation_type, reconciled_at
     FROM hf_sync_deliveries
     WHERE reconciled_at IS NOT NULL AND notice_seen_at IS NULL
     ORDER BY reconciled_at, operation_id;`,
  );
  if (!rows.length) return null;
  const recordTypes = new Set<PendingSyncOperation['operationType']>([
    'record',
    'edit',
    'remove',
    'undo',
  ]);
  const hasRecords = rows.some(({ operation_type }) =>
    operation_type ? recordTypes.has(operation_type) : true,
  );
  const hasProfile = rows.some(
    ({ operation_type }) =>
      operation_type === null || operation_type === 'preferences' || operation_type === 'start',
  );
  return {
    count: rows.length,
    operationIds: rows.map(({ operation_id }) => operation_id),
    review: hasRecords && hasProfile ? 'both' : hasRecords ? 'records' : 'profile',
  };
}

export async function acknowledgeReconciliationNotice(
  connection: SqliteConnectionPort,
  operationIds: readonly string[],
  now: number = Date.now(),
): Promise<void> {
  if (!operationIds.length || operationIds.some((id) => !id || id.length > 128))
    throw new Error('El aviso de sincronización no es válido.');
  await sqliteTransaction(connection, async () => {
    for (const operationId of operationIds)
      await connection.run(
        `UPDATE hf_sync_deliveries
         SET notice_seen_at = ?
         WHERE operation_id = ? AND reconciled_at IS NOT NULL AND notice_seen_at IS NULL;`,
        [now, operationId],
      );
  });
}

export async function localSyncSummary(
  connection: SqliteConnectionPort,
): Promise<LocalSyncSummary> {
  const [outbox] = await connection.query<{ pending: number; failed: number }>(
    `SELECT COUNT(*) AS pending,
            COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) AS failed
     FROM hf_sync_outbox;`,
  );
  const [deliveries] = await connection.query<{ pending: number; failed: number }>(
    `SELECT COALESCE(SUM(CASE WHEN remote_status = 'pending' THEN 1 ELSE 0 END), 0) AS pending,
            COALESCE(SUM(CASE WHEN remote_status IN ('rejected', 'conflict')
              AND reconciled_at IS NULL THEN 1 ELSE 0 END), 0) AS failed
     FROM hf_sync_deliveries;`,
  );
  const [state] = await connection.query<{ last_pushed_at: number | null }>(
    'SELECT last_pushed_at FROM hf_sync_state WHERE id = 1;',
  );
  return {
    pendingCount: Number(outbox?.pending ?? 0) + Number(deliveries?.pending ?? 0),
    failedCount: Number(outbox?.failed ?? 0) + Number(deliveries?.failed ?? 0),
    lastPushedAt: state?.last_pushed_at ?? null,
  };
}
