import type { LocalStoragePort } from '../localRepository.ts';
import { LOCAL_SNAPSHOT_KEY, parseSnapshot } from '../localSnapshot.ts';
import { queueSnapshotOperations, recoverInterruptedOutbox } from '../sync/outbox.ts';
import {
  importLegacySnapshot,
  LegacyImportError,
  persistSnapshotProjection,
  readSqliteSnapshot,
} from './legacyImport.ts';
import type { LegacyImportResult } from './legacyImport.ts';
import type { SqliteConnectionPort } from './port.ts';
import { sqliteTransaction } from './port.ts';

const AUTHORITY_KEY = 'snapshot_authority';
const AUTHORITY_VALUE = 'sqlite-snapshot-v1';

async function authority(connection: SqliteConnectionPort): Promise<string | null> {
  const rows = await connection.query<{ value: string }>(
    'SELECT value FROM hf_local_meta WHERE key = ?;',
    [AUTHORITY_KEY],
  );
  return rows[0]?.value ?? null;
}

async function markAuthoritative(connection: SqliteConnectionPort, now: number) {
  await connection.run(
    `INSERT INTO hf_local_meta (key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`,
    [AUTHORITY_KEY, AUTHORITY_VALUE, now],
  );
}

/** SQLite owns the domain snapshot; the previous storage remains a best-effort rollback mirror. */
export function sqliteSnapshotStorage(
  connection: SqliteConnectionPort,
  mirror: LocalStoragePort,
  now: () => number = Date.now,
  syncEnabled = false,
): LocalStoragePort {
  let serial: Promise<void> = Promise.resolve();
  const enqueue = <T>(operation: () => Promise<T>) => {
    const task = serial.then(operation, operation);
    serial = task.then(
      () => undefined,
      () => undefined,
    );
    return task;
  };

  return {
    getItem(key) {
      if (key !== LOCAL_SNAPSHOT_KEY) return mirror.getItem(key);
      return enqueue(async () => (await readSqliteSnapshot(connection))?.snapshotJson ?? null);
    },
    setItem(key, value) {
      if (key !== LOCAL_SNAPSHOT_KEY) return mirror.setItem(key, value);
      return enqueue(async () => {
        const snapshot = parseSnapshot(value);
        if (!snapshot)
          throw new LegacyImportError('El repositorio intentó escribir datos inválidos en SQLite.');
        const normalized = JSON.stringify(snapshot);
        await persistSnapshotProjection(connection, snapshot, {
          sourceKey: LOCAL_SNAPSHOT_KEY,
          writtenAt: now(),
          queueOperations: syncEnabled,
        });
        try {
          await mirror.setItem(key, normalized);
        } catch {
          // SQLite already committed. The compatibility mirror must never revoke that write.
        }
      });
    },
  };
}

export async function prepareSqliteSnapshotStorage(
  connection: SqliteConnectionPort,
  legacy: LocalStoragePort,
  now: () => number = Date.now,
  syncEnabled = false,
): Promise<{ storage: LocalStoragePort; imported: LegacyImportResult }> {
  const marker = await authority(connection);
  if (marker !== null && marker !== AUTHORITY_VALUE)
    throw new LegacyImportError('La base SQLite usa una política de almacenamiento desconocida.');

  let imported: LegacyImportResult;
  if (marker === AUTHORITY_VALUE) {
    const current = await readSqliteSnapshot(connection);
    imported = current
      ? { status: 'current', sourceKey: LOCAL_SNAPSHOT_KEY, revision: current.revision }
      : await importLegacySnapshot(connection, legacy, now);
  } else {
    imported = await importLegacySnapshot(connection, legacy, now);
    await markAuthoritative(connection, now());
  }

  if (syncEnabled) {
    await recoverInterruptedOutbox(connection);
    const current = await readSqliteSnapshot(connection);
    if (current)
      await sqliteTransaction(connection, () =>
        queueSnapshotOperations(connection, current.snapshot),
      );
  }

  return {
    storage: sqliteSnapshotStorage(connection, legacy, now, syncEnabled),
    imported,
  };
}
