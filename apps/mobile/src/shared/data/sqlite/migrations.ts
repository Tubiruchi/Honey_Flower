import type { SqliteConnectionPort, SqliteRow } from './port.ts';
import { sqliteTransaction } from './port.ts';

export const LOCAL_DATABASE_VERSION = 5;

interface LocalMigration {
  version: number;
  name: string;
  statements: string;
}

const migrations: readonly LocalMigration[] = [
  {
    version: 1,
    name: 'sqlite_foundation',
    statements: `
      CREATE TABLE IF NOT EXISTS hf_schema_migrations (
        version INTEGER PRIMARY KEY CHECK (version > 0),
        name TEXT NOT NULL UNIQUE,
        applied_at INTEGER NOT NULL CHECK (applied_at >= 0)
      );

      CREATE TABLE IF NOT EXISTS hf_local_meta (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL CHECK (updated_at >= 0)
      );
    `,
  },
  {
    version: 2,
    name: 'local_snapshot_projection',
    statements: `
      CREATE TABLE hf_local_snapshot (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        format_version INTEGER NOT NULL CHECK (format_version = 2),
        revision INTEGER NOT NULL CHECK (revision >= 1),
        preferences_revision INTEGER NOT NULL CHECK (preferences_revision >= 1),
        source_key TEXT NOT NULL,
        snapshot_json TEXT NOT NULL CHECK (json_valid(snapshot_json)),
        imported_at INTEGER NOT NULL CHECK (imported_at >= 0)
      );

      CREATE TABLE hf_profile (
        snapshot_id INTEGER PRIMARY KEY REFERENCES hf_local_snapshot(id) ON DELETE CASCADE,
        started_at INTEGER NOT NULL CHECK (started_at >= 0),
        first_species TEXT NOT NULL CHECK (first_species IN ('sprout', 'cactus')),
        collection_time_zone TEXT NOT NULL,
        garden_json TEXT CHECK (garden_json IS NULL OR json_valid(garden_json))
      );

      CREATE TABLE hf_preferences (
        snapshot_id INTEGER PRIMARY KEY REFERENCES hf_local_snapshot(id) ON DELETE CASCADE,
        preferred_name TEXT NOT NULL,
        water_goal_ml INTEGER NOT NULL CHECK (water_goal_ml BETWEEN 250 AND 10000),
        sunscreen_reapplications INTEGER NOT NULL CHECK (sunscreen_reapplications BETWEEN 0 AND 12),
        water_times_json TEXT NOT NULL CHECK (json_valid(water_times_json)),
        sunscreen_times_json TEXT NOT NULL CHECK (json_valid(sunscreen_times_json)),
        time_zone TEXT NOT NULL,
        notifications_enabled INTEGER NOT NULL CHECK (notifications_enabled IN (0, 1)),
        notification_cap INTEGER NOT NULL CHECK (notification_cap BETWEEN 1 AND 24),
        quiet_periods_json TEXT NOT NULL CHECK (json_valid(quiet_periods_json)),
        tone TEXT NOT NULL CHECK (tone IN ('gentle', 'medium', 'intense')),
        reinforced_sound INTEGER NOT NULL CHECK (reinforced_sound IN (0, 1)),
        foreground_flash INTEGER NOT NULL CHECK (foreground_flash IN (0, 1))
      );

      CREATE TABLE hf_cycles (
        snapshot_id INTEGER NOT NULL REFERENCES hf_local_snapshot(id) ON DELETE CASCADE,
        cycle_index INTEGER NOT NULL CHECK (cycle_index >= 0),
        species TEXT NOT NULL CHECK (species IN ('sprout', 'cactus')),
        started_at INTEGER NOT NULL CHECK (started_at >= 0),
        ends_at INTEGER NOT NULL CHECK (ends_at > started_at),
        status TEXT NOT NULL CHECK (status IN ('active', 'closed')),
        PRIMARY KEY (snapshot_id, cycle_index)
      );

      CREATE TABLE hf_goal_changes (
        snapshot_id INTEGER NOT NULL REFERENCES hf_local_snapshot(id) ON DELETE CASCADE,
        day_index INTEGER NOT NULL CHECK (day_index >= 0),
        water_goal_ml INTEGER NOT NULL CHECK (water_goal_ml BETWEEN 250 AND 10000),
        sunscreen_goal_count INTEGER NOT NULL CHECK (sunscreen_goal_count BETWEEN 1 AND 13),
        PRIMARY KEY (snapshot_id, day_index)
      );

      CREATE TABLE hf_schedule_changes (
        snapshot_id INTEGER NOT NULL REFERENCES hf_local_snapshot(id) ON DELETE CASCADE,
        habit TEXT NOT NULL CHECK (habit IN ('water', 'sunscreen')),
        ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
        schedule_revision INTEGER NOT NULL CHECK (schedule_revision >= 1),
        from_day INTEGER NOT NULL CHECK (from_day >= 0),
        effective_at INTEGER CHECK (effective_at IS NULL OR effective_at >= 0),
        time_zone TEXT NOT NULL,
        times_json TEXT NOT NULL CHECK (json_valid(times_json)),
        policy_version INTEGER,
        window_minutes INTEGER,
        context_fraction REAL,
        PRIMARY KEY (snapshot_id, habit, ordinal),
        CHECK (
          (habit = 'water' AND policy_version IS NULL AND window_minutes IS NULL AND context_fraction IS NULL)
          OR
          (habit = 'sunscreen' AND policy_version >= 1 AND window_minutes BETWEEN 1 AND 1440
            AND context_fraction > 0 AND context_fraction < 1)
        )
      );

      CREATE TABLE hf_habit_events (
        snapshot_id INTEGER NOT NULL REFERENCES hf_local_snapshot(id) ON DELETE CASCADE,
        event_id TEXT NOT NULL,
        cycle_index INTEGER NOT NULL CHECK (cycle_index >= 0),
        day_index INTEGER NOT NULL CHECK (day_index BETWEEN 0 AND 6),
        habit TEXT NOT NULL CHECK (habit IN ('water', 'sunscreen')),
        amount INTEGER NOT NULL,
        occurred_at INTEGER NOT NULL CHECK (occurred_at >= 0),
        edited_at INTEGER CHECK (edited_at IS NULL OR edited_at >= occurred_at),
        verification_json TEXT CHECK (verification_json IS NULL OR json_valid(verification_json)),
        appointment_json TEXT CHECK (appointment_json IS NULL OR json_valid(appointment_json)),
        PRIMARY KEY (snapshot_id, event_id),
        FOREIGN KEY (snapshot_id, cycle_index) REFERENCES hf_cycles(snapshot_id, cycle_index) ON DELETE CASCADE,
        CHECK ((habit = 'water' AND amount BETWEEN 1 AND 10000) OR (habit = 'sunscreen' AND amount = 1))
      );

      CREATE TABLE hf_event_versions (
        snapshot_id INTEGER NOT NULL REFERENCES hf_local_snapshot(id) ON DELETE CASCADE,
        event_id TEXT NOT NULL,
        revision INTEGER NOT NULL CHECK (revision >= 1),
        legacy INTEGER NOT NULL CHECK (legacy IN (0, 1)),
        PRIMARY KEY (snapshot_id, event_id)
      );

      CREATE TABLE hf_operation_receipts (
        snapshot_id INTEGER NOT NULL REFERENCES hf_local_snapshot(id) ON DELETE CASCADE,
        operation_id TEXT NOT NULL,
        operation_type TEXT NOT NULL CHECK (operation_type IN ('start', 'record', 'edit', 'remove', 'undo', 'preferences')),
        client_created_at INTEGER NOT NULL CHECK (client_created_at >= 0),
        committed_at INTEGER NOT NULL CHECK (committed_at >= client_created_at),
        command_json TEXT NOT NULL CHECK (json_valid(command_json)),
        before_json TEXT CHECK (before_json IS NULL OR json_valid(before_json)),
        after_json TEXT CHECK (after_json IS NULL OR json_valid(after_json)),
        event_revision INTEGER CHECK (event_revision IS NULL OR event_revision >= 1),
        PRIMARY KEY (snapshot_id, operation_id)
      );

      CREATE TABLE hf_sync_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        server_revision INTEGER NOT NULL DEFAULT 0 CHECK (server_revision >= 0),
        last_operation_id TEXT,
        last_pulled_at INTEGER,
        last_pushed_at INTEGER
      );

      CREATE TABLE hf_sync_outbox (
        operation_id TEXT PRIMARY KEY,
        operation_type TEXT NOT NULL CHECK (operation_type IN ('start', 'record', 'edit', 'remove', 'undo', 'preferences')),
        base_revision INTEGER NOT NULL CHECK (base_revision >= 0),
        client_created_at INTEGER NOT NULL CHECK (client_created_at >= 0),
        payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'failed')),
        attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
        next_attempt_at INTEGER,
        last_error_code TEXT
      );

      CREATE INDEX hf_habit_events_occurred_index
        ON hf_habit_events (snapshot_id, occurred_at);
      CREATE INDEX hf_operation_receipts_committed_index
        ON hf_operation_receipts (snapshot_id, committed_at);
      CREATE INDEX hf_sync_outbox_pending_index
        ON hf_sync_outbox (status, next_attempt_at, client_created_at);

      INSERT INTO hf_sync_state (id, server_revision) VALUES (1, 0);
    `,
  },
  {
    version: 3,
    name: 'sync_delivery_receipts',
    statements: `
      CREATE TABLE hf_sync_deliveries (
        operation_id TEXT PRIMARY KEY,
        delivered_at INTEGER NOT NULL CHECK (delivered_at >= 0),
        remote_status TEXT NOT NULL
          CHECK (remote_status IN ('pending', 'applied', 'rejected', 'conflict')),
        applied_server_revision INTEGER
          CHECK (applied_server_revision IS NULL OR applied_server_revision >= 0),
        processed_at INTEGER CHECK (processed_at IS NULL OR processed_at >= 0),
        failure_code TEXT,
        CHECK (
          (remote_status = 'pending' AND applied_server_revision IS NULL
            AND processed_at IS NULL AND failure_code IS NULL)
          OR
          (remote_status = 'applied' AND applied_server_revision IS NOT NULL
            AND processed_at IS NOT NULL AND failure_code IS NULL)
          OR
          (remote_status IN ('rejected', 'conflict') AND applied_server_revision IS NULL
            AND processed_at IS NOT NULL)
        )
      );

      CREATE INDEX hf_sync_deliveries_status_index
        ON hf_sync_deliveries (remote_status, delivered_at);
    `,
  },
  {
    version: 4,
    name: 'sync_pull_reconciliation',
    statements: `
      ALTER TABLE hf_sync_deliveries
        ADD COLUMN reconciled_at INTEGER
          CHECK (reconciled_at IS NULL OR reconciled_at >= 0);

      CREATE INDEX hf_sync_deliveries_unreconciled_index
        ON hf_sync_deliveries (remote_status, reconciled_at, delivered_at);
    `,
  },
  {
    version: 5,
    name: 'sync_reconciliation_notice',
    statements: `
      ALTER TABLE hf_sync_deliveries
        ADD COLUMN operation_type TEXT
          CHECK (operation_type IS NULL OR operation_type IN
            ('start', 'record', 'edit', 'remove', 'undo', 'preferences'));

      ALTER TABLE hf_sync_deliveries
        ADD COLUMN notice_seen_at INTEGER
          CHECK (notice_seen_at IS NULL OR notice_seen_at >= 0);

      CREATE INDEX hf_sync_deliveries_notice_index
        ON hf_sync_deliveries (notice_seen_at, reconciled_at)
        WHERE reconciled_at IS NOT NULL;
    `,
  },
];

function numberField(row: SqliteRow | undefined, field: string): number {
  const value = row?.[field];
  if (typeof value !== 'number' || !Number.isSafeInteger(value))
    throw new Error(`SQLite devolvió un valor inválido para ${field}.`);
  return value;
}

export async function prepareSqliteConnection(
  connection: SqliteConnectionPort,
  now: () => number = Date.now,
): Promise<number> {
  await connection.execute('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  await connection.query('PRAGMA journal_mode = WAL;');

  const foreignKeys = await connection.query('PRAGMA foreign_keys;');
  if (numberField(foreignKeys[0], 'foreign_keys') !== 1)
    throw new Error('SQLite no pudo activar la integridad entre tablas.');

  const versionRows = await connection.query('PRAGMA user_version;');
  let current = numberField(versionRows[0], 'user_version');
  if (current > LOCAL_DATABASE_VERSION)
    throw new Error('La base local pertenece a una versión más reciente de HoneyFlower.');

  for (const migration of migrations) {
    if (migration.version <= current) continue;
    if (migration.version !== current + 1)
      throw new Error('La secuencia de migraciones SQLite está incompleta.');
    await sqliteTransaction(connection, async () => {
      await connection.execute(migration.statements);
      await connection.run(
        `INSERT INTO hf_schema_migrations (version, name, applied_at)
         VALUES (?, ?, ?);`,
        [migration.version, migration.name, now()],
      );
      await connection.execute(`PRAGMA user_version = ${migration.version};`);
    });
    current = migration.version;
  }

  const recorded = await connection.query<{ version: number }>(
    'SELECT version FROM hf_schema_migrations ORDER BY version;',
  );
  if (recorded.length !== current || recorded.at(-1)?.version !== current)
    throw new Error('El historial local de migraciones no coincide con la base SQLite.');
  return current;
}
