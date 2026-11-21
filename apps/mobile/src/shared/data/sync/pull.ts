import { collectionTimeZone } from '../../../features/analysis/collection.ts';
import { WEEK_MS, speciesAt } from '../../../features/local/model.ts';
import type { HabitEvent, LocalState } from '../../../features/local/model.ts';
import type { OnboardingDraft } from '../../../features/onboarding/model.ts';
import type { SunscreenSchedule } from '../../../features/sunscreen/schema.ts';
import type { WaterSchedule } from '../../../features/reminders/schema.ts';
import { parseSnapshot } from '../localSnapshot.ts';
import type { LocalCommand, LocalSnapshot, OperationReceipt } from '../localSnapshot.ts';
import { writeSnapshotProjectionInTransaction } from '../sqlite/legacyImport.ts';
import type { SqliteConnectionPort } from '../sqlite/port.ts';
import { sqliteTransaction } from '../sqlite/port.ts';
import { RemoteSyncError } from './model.ts';
import type { RemotePullResult } from './model.ts';

type JsonRecord = Record<string, unknown>;

const object = (value: unknown): JsonRecord | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : null;
const integer = (value: unknown, minimum = 0) =>
  Number.isSafeInteger(value) && Number(value) >= minimum ? Number(value) : null;
const text = (value: unknown) => (typeof value === 'string' && value ? value : null);
const boolean = (value: unknown) => (typeof value === 'boolean' ? value : null);
const list = (value: unknown): unknown[] | null => (Array.isArray(value) ? value : null);

function required<T>(value: T | null, reason = 'invalid-response'): T {
  if (value === null) throw new RemoteSyncError(reason, false);
  return value;
}

function timeList(value: unknown): string[] {
  const values = required(list(value));
  if (!values.every((entry) => typeof entry === 'string'))
    throw new RemoteSyncError('invalid-response', false);
  return values as string[];
}

function optionalMillis(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  return required(integer(value));
}

function remoteReceipt(value: unknown, serverRevision: number): OperationReceipt {
  const entry = required(object(value));
  const appliedRevision = required(integer(entry.applied_server_revision, 1));
  if (appliedRevision > serverRevision) throw new RemoteSyncError('invalid-response', false);
  const payload = required(object(entry.payload));
  const command = required(object(payload.command)) as unknown as LocalCommand;
  const committedAt = required(integer(payload.committed_at));
  return {
    command: structuredClone(command),
    committedAt,
    ...(Object.hasOwn(payload, 'before')
      ? { before: structuredClone(payload.before) as never }
      : {}),
    ...(Object.hasOwn(payload, 'after') ? { after: structuredClone(payload.after) as never } : {}),
    ...(Object.hasOwn(payload, 'event_revision')
      ? { eventRevision: required(integer(payload.event_revision, 1)) }
      : {}),
  };
}

/** Convert the RLS-scoped RPC document into the existing, fully validated local domain snapshot. */
export function parseRemotePull(value: unknown): RemotePullResult {
  const root = required(object(value));
  if (root.version !== 1) throw new RemoteSyncError('invalid-response', false);
  const serverRevision = required(integer(root.server_revision));
  const lastOperationId =
    root.last_operation_id === null ? null : required(text(root.last_operation_id));
  if (root.unchanged === true)
    return { serverRevision, lastOperationId, unchanged: true, snapshot: null };
  if (root.unchanged !== false || serverRevision < 1)
    throw new RemoteSyncError('invalid-response', false);

  const profile = required(object(root.profile));
  const preferences = required(object(root.preferences));
  const startedAt = required(integer(profile.started_at));
  const firstSpecies = required(text(profile.first_species));
  if (firstSpecies !== 'sprout' && firstSpecies !== 'cactus')
    throw new RemoteSyncError('invalid-response', false);

  const draft: OnboardingDraft = {
    preferredName: required(text(profile.preferred_name)),
    waterGoalMl: String(required(integer(preferences.water_goal_ml, 250))),
    sunscreenReapplications: required(integer(preferences.sunscreen_reapplications)),
    waterTimes: timeList(preferences.water_times),
    sunscreenTimes: timeList(preferences.sunscreen_times),
    timeZone: required(text(preferences.time_zone)),
    notifications: required(boolean(preferences.notifications_enabled)),
    notificationCap: required(integer(preferences.notification_cap, 1)),
    quietPeriods: structuredClone(
      required(list(preferences.quiet_periods)),
    ) as OnboardingDraft['quietPeriods'],
    tone: required(text(preferences.tone)) as OnboardingDraft['tone'],
    reinforcedSound: required(boolean(preferences.reinforced_sound)),
    foregroundFlash: required(boolean(preferences.foreground_flash)),
  };

  const cycleRows = required(list(root.cycles)).map((value) => required(object(value)));
  if (!cycleRows.length) throw new RemoteSyncError('invalid-response', false);
  const cycleStarts = cycleRows.map((cycle, index) => {
    if (required(integer(cycle.cycle_index)) !== index)
      throw new RemoteSyncError('invalid-response', false);
    const cycleStartedAt = required(integer(cycle.started_at));
    if (
      required(integer(cycle.ends_at)) !== cycleStartedAt + WEEK_MS ||
      (index === 0 && cycleStartedAt !== startedAt) ||
      (index > 0 && cycleStartedAt < Number(cycleRows[index - 1]!.started_at) + WEEK_MS) ||
      cycle.species !== speciesAt({ firstSpecies } as LocalState, index) ||
      cycle.status !== (index === cycleRows.length - 1 ? 'active' : 'closed')
    )
      throw new RemoteSyncError('invalid-response', false);
    return cycleStartedAt;
  });

  const goals = required(list(root.goals)).map((value) => {
    const goal = required(object(value));
    return {
      day: required(integer(goal.day_index)),
      water: required(integer(goal.water_goal_ml, 250)),
      sunscreen: required(integer(goal.sunscreen_goal_count, 1)),
    };
  });
  const schedules = required(list(root.schedules)).map((value) => required(object(value)));
  const waterChanges: WaterSchedule['changes'] = schedules
    .filter((schedule) => schedule.habit === 'water')
    .map((schedule) => ({
      fromDay: required(integer(schedule.from_day)),
      ...(optionalMillis(schedule.effective_at) === undefined
        ? {}
        : { effectiveAt: optionalMillis(schedule.effective_at) }),
      timeZone: required(text(schedule.time_zone)),
      times: timeList(schedule.times),
    }));
  const sunscreenChanges: SunscreenSchedule['changes'] = schedules
    .filter((schedule) => schedule.habit === 'sunscreen')
    .map((schedule) => ({
      revision: required(integer(schedule.schedule_revision, 1)),
      fromDay: required(integer(schedule.from_day)),
      ...(optionalMillis(schedule.effective_at) === undefined
        ? {}
        : { effectiveAt: optionalMillis(schedule.effective_at) }),
      timeZone: required(text(schedule.time_zone)),
      times: timeList(schedule.times),
      policy: {
        version: required(integer(schedule.policy_version, 1)) as 1,
        minutes: required(integer(schedule.window_minutes, 1)) as 60,
        contextFraction: Number(schedule.context_fraction) as 0.5,
      },
    }));
  const scheduleRevisions = required(object(root.schedule_revisions));

  const eventRows = required(list(root.events)).map((value) => required(object(value)));
  const events: HabitEvent[] = eventRows
    .filter((event) => event.deleted === false)
    .map((event) => ({
      id: required(text(event.id)),
      kind: required(text(event.kind)) as HabitEvent['kind'],
      amount: required(integer(event.amount, 1)),
      at: required(integer(event.at)),
      ...(optionalMillis(event.edited_at) === undefined
        ? {}
        : { editedAt: optionalMillis(event.edited_at) }),
      ...(event.verification === undefined
        ? {}
        : { verification: structuredClone(event.verification) as never }),
      ...(event.appointment === undefined
        ? {}
        : { appointment: structuredClone(event.appointment) as never }),
    }));

  const state: LocalState = {
    version: 1,
    startedAt,
    cycleStarts,
    firstSpecies,
    preferences: draft,
    goals,
    events,
    waterSchedule: { version: 1, changes: waterChanges },
    sunscreenSchedule: {
      version: 1,
      activatedAt: startedAt,
      revision: required(integer(scheduleRevisions.sunscreen, 1)),
      changes: sunscreenChanges,
    },
    garden: {
      version: 1,
      groupBy: 'cycle-end',
      timeZone: required(text(profile.collection_time_zone)),
    },
  };
  if (collectionTimeZone(state) !== profile.collection_time_zone)
    throw new RemoteSyncError('invalid-response', false);

  const candidate: LocalSnapshot = {
    version: 2,
    revision: serverRevision,
    preferencesRevision: required(integer(preferences.revision, 1)),
    state,
    eventVersions: eventRows.map((event) => ({
      id: required(text(event.id)),
      revision: required(integer(event.revision, 1)),
      legacy: false,
    })),
    operations: required(list(root.operations)).map((operation) =>
      remoteReceipt(operation, serverRevision),
    ),
  };
  const snapshot = parseSnapshot(JSON.stringify(candidate));
  if (!snapshot) throw new RemoteSyncError('invalid-response', false);
  return { serverRevision, lastOperationId, unchanged: false, snapshot };
}

export interface PullReadiness {
  cursor: number;
  blockingCount: number;
  needsReconciliation: boolean;
}

export async function pullReadiness(connection: SqliteConnectionPort): Promise<PullReadiness> {
  const [state] = await connection.query<{ server_revision: number }>(
    'SELECT server_revision FROM hf_sync_state WHERE id = 1;',
  );
  const [outbox] = await connection.query<{ total: number }>(
    'SELECT COUNT(*) AS total FROM hf_sync_outbox;',
  );
  const [deliveries] = await connection.query<{ pending: number; failed: number }>(
    `SELECT
       COALESCE(SUM(CASE WHEN remote_status = 'pending' THEN 1 ELSE 0 END), 0) AS pending,
       COALESCE(SUM(CASE WHEN remote_status IN ('rejected', 'conflict')
         AND reconciled_at IS NULL THEN 1 ELSE 0 END), 0) AS failed
     FROM hf_sync_deliveries;`,
  );
  const cursor = required(integer(state?.server_revision));
  return {
    cursor,
    blockingCount: Number(outbox?.total ?? 0) + Number(deliveries?.pending ?? 0),
    needsReconciliation: Number(deliveries?.failed ?? 0) > 0,
  };
}

function newDeviceId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const value = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

export async function syncDeviceId(connection: SqliteConnectionPort, now: number): Promise<string> {
  const rows = await connection.query<{ value: string }>(
    "SELECT value FROM hf_local_meta WHERE key = 'sync_device_id';",
  );
  if (rows[0]?.value) return rows[0].value;
  const deviceId = newDeviceId();
  await connection.run(
    `INSERT OR IGNORE INTO hf_local_meta (key, value, updated_at)
     VALUES ('sync_device_id', ?, ?);`,
    [deviceId, now],
  );
  const stored = await connection.query<{ value: string }>(
    "SELECT value FROM hf_local_meta WHERE key = 'sync_device_id';",
  );
  return stored[0]?.value ?? deviceId;
}

export interface AppliedPull {
  applied: boolean;
  deferred: boolean;
  reconciledCount: number;
}

/** Install a server snapshot only if no local write appeared while the network request was open. */
export async function applyRemotePull(
  connection: SqliteConnectionPort,
  result: RemotePullResult,
  expectedCursor: number,
  pulledAt: number,
): Promise<AppliedPull> {
  return sqliteTransaction(connection, async () => {
    const readiness = await pullReadiness(connection);
    if (readiness.cursor !== expectedCursor || readiness.blockingCount > 0)
      return { applied: false, deferred: true, reconciledCount: 0 };
    if (result.serverRevision < readiness.cursor)
      throw new RemoteSyncError('invalid-response', false);

    if (result.unchanged) {
      await connection.run(
        `UPDATE hf_sync_state
         SET last_pulled_at = ?, last_operation_id = COALESCE(?, last_operation_id)
         WHERE id = 1;`,
        [pulledAt, result.lastOperationId],
      );
      return { applied: false, deferred: false, reconciledCount: 0 };
    }
    if (!result.snapshot || result.snapshot.revision !== result.serverRevision)
      throw new RemoteSyncError('invalid-response', false);

    const [failed] = await connection.query<{ total: number }>(
      `SELECT COUNT(*) AS total FROM hf_sync_deliveries
       WHERE remote_status IN ('rejected', 'conflict') AND reconciled_at IS NULL;`,
    );
    await writeSnapshotProjectionInTransaction(connection, result.snapshot, {
      sourceKey: 'supabase-canonical-v1',
      writtenAt: pulledAt,
    });
    await connection.run(
      `UPDATE hf_sync_deliveries
       SET reconciled_at = ?
       WHERE remote_status IN ('rejected', 'conflict') AND reconciled_at IS NULL;`,
      [pulledAt],
    );
    await connection.run(
      `UPDATE hf_sync_state
       SET server_revision = ?, last_operation_id = ?, last_pulled_at = ?
       WHERE id = 1;`,
      [result.serverRevision, result.lastOperationId, pulledAt],
    );
    return {
      applied: true,
      deferred: false,
      reconciledCount: Number(failed?.total ?? 0),
    };
  });
}
