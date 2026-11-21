import { collectionTimeZone } from '../../../features/analysis/collection.ts';
import {
  DAY_MS,
  LOCAL_STORAGE_KEY,
  parseLocalState,
  speciesAt,
  WEEK_MS,
} from '../../../features/local/model.ts';
import type { LocalState } from '../../../features/local/model.ts';
import type { LocalStoragePort } from '../localRepository.ts';
import { createSnapshot, LOCAL_SNAPSHOT_KEY, parseSnapshot } from '../localSnapshot.ts';
import type { LocalSnapshot } from '../localSnapshot.ts';
import { queueSnapshotOperations } from '../sync/outbox.ts';
import type { SqliteConnectionPort, SqliteValue } from './port.ts';
import { sqliteTransaction } from './port.ts';

export type LegacyImportStatus = 'empty' | 'current' | 'imported';
export interface LegacyImportResult {
  status: LegacyImportStatus;
  sourceKey: string;
  revision: number;
}

interface LegacySource {
  sourceKey: string;
  snapshot: LocalSnapshot;
  snapshotJson: string;
}

interface ProjectionRow {
  statement: string;
  values: SqliteValue[];
}

export interface StoredSqliteSnapshot {
  revision: number;
  snapshot: LocalSnapshot;
  snapshotJson: string;
}

export class LegacyImportError extends Error {}

async function readStorage(storage: LocalStoragePort, key: string): Promise<string | null> {
  try {
    return await storage.getItem(key);
  } catch {
    throw new LegacyImportError('No pudimos leer los datos anteriores para migrarlos a SQLite.');
  }
}

async function legacySource(storage: LocalStoragePort): Promise<LegacySource | null> {
  const current = await readStorage(storage, LOCAL_SNAPSHOT_KEY);
  if (current !== null) {
    const snapshot = parseSnapshot(current);
    if (!snapshot)
      throw new LegacyImportError(
        'Los datos anteriores no son válidos. SQLite no los reemplazó ni intentó usar una copia más vieja.',
      );
    return {
      sourceKey: LOCAL_SNAPSHOT_KEY,
      snapshot,
      snapshotJson: JSON.stringify(snapshot),
    };
  }

  const legacy = await readStorage(storage, LOCAL_STORAGE_KEY);
  if (legacy === null) return null;
  const state = parseLocalState(legacy);
  if (!state)
    throw new LegacyImportError('Los datos anteriores no son válidos. SQLite no los modificó.');
  const snapshot = createSnapshot(state);
  return {
    sourceKey: LOCAL_STORAGE_KEY,
    snapshot,
    snapshotJson: JSON.stringify(snapshot),
  };
}

function json(value: unknown): string {
  return JSON.stringify(value);
}

function optionalJson(value: unknown): string | null {
  return value === undefined ? null : json(value);
}

function cycleForEvent(state: LocalState, occurredAt: number): { cycle: number; day: number } {
  const cycle = state.cycleStarts.findIndex(
    (startedAt) => occurredAt >= startedAt && occurredAt < startedAt + WEEK_MS,
  );
  if (cycle < 0) throw new LegacyImportError('Un registro no pertenece a ningún ciclo local.');
  return { cycle, day: Math.floor((occurredAt - state.cycleStarts[cycle]!) / DAY_MS) };
}

/** Produce a complete relational projection without mutating the validated snapshot. */
export function snapshotProjection(snapshot: LocalSnapshot): ProjectionRow[] {
  const state = snapshot.state;
  const preferences = state.preferences;
  const rows: ProjectionRow[] = [
    {
      statement: `INSERT INTO hf_profile
        (snapshot_id, started_at, first_species, collection_time_zone, garden_json)
        VALUES (1, ?, ?, ?, ?);`,
      values: [
        state.startedAt,
        state.firstSpecies,
        collectionTimeZone(state),
        optionalJson(state.garden),
      ],
    },
    {
      statement: `INSERT INTO hf_preferences
        (snapshot_id, preferred_name, water_goal_ml, sunscreen_reapplications,
         water_times_json, sunscreen_times_json, time_zone, notifications_enabled,
         notification_cap, quiet_periods_json, tone, reinforced_sound, foreground_flash)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      values: [
        preferences.preferredName,
        Number(preferences.waterGoalMl),
        preferences.sunscreenReapplications,
        json(preferences.waterTimes),
        json(preferences.sunscreenTimes),
        preferences.timeZone,
        preferences.notifications ? 1 : 0,
        preferences.notificationCap,
        json(preferences.quietPeriods),
        preferences.tone,
        preferences.reinforcedSound ? 1 : 0,
        preferences.foregroundFlash ? 1 : 0,
      ],
    },
  ];

  state.cycleStarts.forEach((startedAt, cycle) =>
    rows.push({
      statement: `INSERT INTO hf_cycles
        (snapshot_id, cycle_index, species, started_at, ends_at, status)
        VALUES (1, ?, ?, ?, ?, ?);`,
      values: [
        cycle,
        speciesAt(state, cycle),
        startedAt,
        startedAt + WEEK_MS,
        cycle === state.cycleStarts.length - 1 ? 'active' : 'closed',
      ],
    }),
  );

  state.goals.forEach((goal) =>
    rows.push({
      statement: `INSERT INTO hf_goal_changes
        (snapshot_id, day_index, water_goal_ml, sunscreen_goal_count)
        VALUES (1, ?, ?, ?);`,
      values: [goal.day, goal.water, goal.sunscreen],
    }),
  );

  state.waterSchedule?.changes.forEach((change, ordinal) =>
    rows.push({
      statement: `INSERT INTO hf_schedule_changes
        (snapshot_id, habit, ordinal, schedule_revision, from_day, effective_at,
         time_zone, times_json, policy_version, window_minutes, context_fraction)
        VALUES (1, 'water', ?, ?, ?, ?, ?, ?, NULL, NULL, NULL);`,
      values: [
        ordinal,
        ordinal + 1,
        change.fromDay,
        change.effectiveAt ?? null,
        change.timeZone,
        json(change.times),
      ],
    }),
  );

  state.sunscreenSchedule?.changes.forEach((change, ordinal) =>
    rows.push({
      statement: `INSERT INTO hf_schedule_changes
        (snapshot_id, habit, ordinal, schedule_revision, from_day, effective_at,
         time_zone, times_json, policy_version, window_minutes, context_fraction)
        VALUES (1, 'sunscreen', ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      values: [
        ordinal,
        change.revision,
        change.fromDay,
        change.effectiveAt ?? null,
        change.timeZone,
        json(change.times),
        change.policy.version,
        change.policy.minutes,
        change.policy.contextFraction,
      ],
    }),
  );

  state.events.forEach((event) => {
    const position = cycleForEvent(state, event.at);
    rows.push({
      statement: `INSERT INTO hf_habit_events
        (snapshot_id, event_id, cycle_index, day_index, habit, amount, occurred_at,
         edited_at, verification_json, appointment_json)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      values: [
        event.id,
        position.cycle,
        position.day,
        event.kind,
        event.amount,
        event.at,
        event.editedAt ?? null,
        optionalJson(event.verification),
        optionalJson(event.appointment),
      ],
    });
  });

  snapshot.eventVersions.forEach((version) =>
    rows.push({
      statement: `INSERT INTO hf_event_versions
        (snapshot_id, event_id, revision, legacy) VALUES (1, ?, ?, ?);`,
      values: [version.id, version.revision, version.legacy ? 1 : 0],
    }),
  );

  snapshot.operations.forEach((receipt) =>
    rows.push({
      statement: `INSERT INTO hf_operation_receipts
        (snapshot_id, operation_id, operation_type, client_created_at, committed_at,
         command_json, before_json, after_json, event_revision)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?);`,
      values: [
        receipt.command.id,
        receipt.command.type,
        receipt.command.createdAt,
        receipt.committedAt,
        json(receipt.command),
        optionalJson(receipt.before),
        optionalJson(receipt.after),
        receipt.eventRevision ?? null,
      ],
    }),
  );

  return rows;
}

export async function readSqliteSnapshot(
  connection: SqliteConnectionPort,
): Promise<StoredSqliteSnapshot | null> {
  const rows = await connection.query<{ revision: number; snapshot_json: string }>(
    'SELECT revision, snapshot_json FROM hf_local_snapshot WHERE id = 1;',
  );
  const stored = rows[0];
  if (!stored) return null;
  const snapshot = parseSnapshot(stored.snapshot_json);
  if (!snapshot || snapshot.revision !== stored.revision)
    throw new LegacyImportError('La copia principal de SQLite no supera la validación local.');
  const snapshotJson = JSON.stringify(snapshot);
  if (snapshotJson !== stored.snapshot_json)
    throw new LegacyImportError('La copia principal de SQLite no está normalizada.');
  return { revision: stored.revision, snapshot, snapshotJson };
}

/** Caller must already hold the SQLite transaction used for the surrounding atomic change. */
export async function writeSnapshotProjectionInTransaction(
  connection: SqliteConnectionPort,
  snapshot: LocalSnapshot,
  options: { sourceKey: string; writtenAt: number; queueOperations?: boolean },
): Promise<LocalSnapshot> {
  const validated = parseSnapshot(JSON.stringify(snapshot));
  if (!validated)
    throw new LegacyImportError('El repositorio intentó guardar un snapshot local inválido.');
  const snapshotJson = JSON.stringify(validated);
  await connection.run('DELETE FROM hf_local_snapshot WHERE id = 1;');
  await connection.run(
    `INSERT INTO hf_local_snapshot
      (id, format_version, revision, preferences_revision, source_key, snapshot_json, imported_at)
      VALUES (1, 2, ?, ?, ?, ?, ?);`,
    [
      validated.revision,
      validated.preferencesRevision,
      options.sourceKey,
      snapshotJson,
      options.writtenAt,
    ],
  );
  for (const row of snapshotProjection(validated)) await connection.run(row.statement, row.values);
  if (options.queueOperations) await queueSnapshotOperations(connection, validated);
  return validated;
}

export async function persistSnapshotProjection(
  connection: SqliteConnectionPort,
  snapshot: LocalSnapshot,
  options: { sourceKey: string; writtenAt?: number; queueOperations?: boolean },
): Promise<'current' | 'written'> {
  const validated = parseSnapshot(JSON.stringify(snapshot));
  if (!validated)
    throw new LegacyImportError('El repositorio intentó guardar un snapshot local inválido.');
  const snapshotJson = JSON.stringify(validated);
  const existing = await readSqliteSnapshot(connection);
  if (existing) {
    if (existing.revision > validated.revision)
      throw new LegacyImportError(
        'SQLite contiene una revisión posterior a la escritura solicitada.',
      );
    if (existing.revision === validated.revision) {
      if (existing.snapshotJson !== snapshotJson)
        throw new LegacyImportError(
          'La escritura intenta reutilizar una revisión con contenido diferente.',
        );
      return 'current';
    }
  }

  await sqliteTransaction(connection, () =>
    writeSnapshotProjectionInTransaction(connection, validated, {
      sourceKey: options.sourceKey,
      writtenAt: options.writtenAt ?? Date.now(),
      queueOperations: options.queueOperations,
    }).then(() => undefined),
  );
  return 'written';
}

/**
 * Import the validated SharedPreferences/localStorage document into SQLite atomically.
 * The source bytes are deliberately retained as a rollback mirror after SQLite becomes authoritative.
 */
export async function importLegacySnapshot(
  connection: SqliteConnectionPort,
  storage: LocalStoragePort,
  now: () => number = Date.now,
): Promise<LegacyImportResult> {
  const source = await legacySource(storage);
  if (!source) return { status: 'empty', sourceKey: '', revision: 0 };

  const stored = await readSqliteSnapshot(connection);
  if (stored) {
    if (stored.revision > source.snapshot.revision)
      throw new LegacyImportError(
        'SQLite contiene una revisión más reciente y no se reemplazó con datos anteriores.',
      );
    if (stored.revision === source.snapshot.revision) {
      if (stored.snapshotJson !== source.snapshotJson)
        throw new LegacyImportError(
          'Las dos copias locales tienen la misma revisión pero contenido diferente.',
        );
      return {
        status: 'current',
        sourceKey: source.sourceKey,
        revision: source.snapshot.revision,
      };
    }
  }

  await persistSnapshotProjection(connection, source.snapshot, {
    sourceKey: source.sourceKey,
    writtenAt: now(),
  });

  return {
    status: 'imported',
    sourceKey: source.sourceKey,
    revision: source.snapshot.revision,
  };
}
