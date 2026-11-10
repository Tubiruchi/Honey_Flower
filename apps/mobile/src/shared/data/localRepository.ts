import {
  advanceCycle,
  createLocalState,
  currentDay,
  dayStart,
  LOCAL_STORAGE_KEY,
  parseLocalState,
  WEEK_MS,
} from '../../features/local/model.ts';
import type { LocalState } from '../../features/local/model.ts';
import type { OnboardingDraft } from '../../features/onboarding/model.ts';
import type { Clock } from './clock.ts';
import { systemClock } from './clock.ts';
import { applyOperation, OperationError } from './localOperations.ts';
import {
  commandFingerprint,
  createSnapshot,
  LOCAL_SNAPSHOT_KEY,
  parseSnapshot,
} from './localSnapshot.ts';
import type { LocalCommand, LocalSnapshot, OperationResult } from './localSnapshot.ts';
import { upgradeSunscreenSchedule, sunscreenState } from '../../features/sunscreen/model.ts';
import type { SunscreenAppointment } from '../../features/sunscreen/schema.ts';
import { upgradeGardenCollection } from '../../features/analysis/collection.ts';
import { upgradeWaterSchedule } from '../../features/reminders/schema.ts';

export interface LocalStoragePort {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
}
export function memoryStorage(seed: Record<string, string> = {}): LocalStoragePort {
  const values = new Map(Object.entries(seed));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}
/** Access the browser getter inside the operation so denied storage is a recoverable read error. */
export const browserStorage: LocalStoragePort = {
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
};
export interface RepositoryView {
  status: 'loading' | 'empty' | 'ready' | 'error';
  snapshot: LocalSnapshot | null;
  now: number;
  busy: boolean;
  issue: string;
  pending: LocalCommand | null;
}
export type CommandRequest =
  | { type: 'start'; draft?: OnboardingDraft }
  | {
      type: 'record';
      kind: 'water' | 'sunscreen';
      amount: number;
      appointment?: SunscreenAppointment;
      dayStart?: number;
    }
  | { type: 'edit'; eventId: string; amount: number; expectedRevision?: number }
  | { type: 'remove'; eventId: string; expectedRevision?: number }
  | { type: 'undo'; targetOperationId: string }
  | { type: 'preferences'; draft: OnboardingDraft; expectedRevision?: number };

class StorageFailure extends Error {
  stage: 'read' | 'write';
  constructor(stage: StorageFailure['stage']) {
    super(
      stage === 'read'
        ? 'No pudimos leer tus datos. No se han reemplazado. Reintenta para recuperarlos.'
        : 'No pudimos confirmar el guardado en el dispositivo. Tus datos confirmados se conservan.',
    );
    this.stage = stage;
  }
}
export class LocalRepository {
  private storage: LocalStoragePort;
  private clock: Clock;
  private id: () => string;
  private listeners = new Set<() => void>();
  private queue: Promise<unknown> = Promise.resolve();
  private queued = 0;
  private initial: Promise<void> | null = null;
  private view: RepositoryView;

  constructor(options: {
    storage: LocalStoragePort;
    clock?: Clock;
    id?: () => string;
    initialState?: LocalState;
  }) {
    this.storage = options.storage;
    this.clock = options.clock ?? systemClock;
    this.id = options.id ?? (() => crypto.randomUUID());
    const snapshot = options.initialState ? createSnapshot(options.initialState) : null;
    this.view = {
      status: snapshot ? 'ready' : 'loading',
      snapshot,
      now: this.clock.now(),
      busy: false,
      issue: '',
      pending: null,
    };
  }
  getSnapshot = (): RepositoryView => this.view;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(patch: Partial<RepositoryView>) {
    this.view = { ...this.view, ...patch };
    this.listeners.forEach((l) => l());
  }
  private enqueue<T>(job: () => Promise<T>): Promise<T> {
    this.queued++;
    this.publish({ busy: true });
    const task = this.queue.then(job);
    this.queue = task.catch(() => undefined);
    return task.finally(() => {
      this.queued--;
      this.publish({ busy: this.queued > 0 });
    });
  }
  initialize(): Promise<void> {
    this.initial ??= this.reload();
    return this.initial;
  }

  private async write(snapshot: LocalSnapshot) {
    try {
      await this.storage.setItem(LOCAL_SNAPSHOT_KEY, JSON.stringify(snapshot));
    } catch {
      throw new StorageFailure('write');
    }
  }
  private async read(): Promise<LocalSnapshot | null> {
    let raw: string | null;
    try {
      raw = await this.storage.getItem(LOCAL_SNAPSHOT_KEY);
    } catch {
      throw new StorageFailure('read');
    }
    if (raw !== null) {
      const snapshot = parseSnapshot(raw);
      if (!snapshot) throw new StorageFailure('read'); // Never fall back to an older v1 over a corrupt v2.
      return snapshot;
    }
    let legacy: string | null;
    try {
      legacy = await this.storage.getItem(LOCAL_STORAGE_KEY);
    } catch {
      throw new StorageFailure('read');
    }
    if (legacy === null) return null;
    const state = parseLocalState(legacy);
    if (!state) throw new StorageFailure('read');
    const migrated = createSnapshot(state);
    await this.write(migrated); // Single new key; the exact v1 bytes are retained as the migration source.
    return migrated;
  }
  private async catchUp(snapshot: LocalSnapshot | null, now: number) {
    if (!snapshot) return snapshot;
    const scheduled = upgradeSunscreenSchedule(
      upgradeGardenCollection(advanceCycle(snapshot.state, now)),
      now,
    );
    const state = upgradeWaterSchedule(scheduled, currentDay(scheduled, now));
    if (state === snapshot.state) return snapshot;
    const next = { ...snapshot, revision: snapshot.revision + 1, state };
    await this.write(next);
    return next;
  }
  reload(): Promise<void> {
    return this.enqueue(async () => {
      try {
        const now = this.clock.now();
        const snapshot = await this.catchUp(await this.read(), now);
        this.publish({
          status: snapshot ? 'ready' : 'empty',
          snapshot,
          now,
          issue: this.view.pending ? this.view.issue : '',
        });
      } catch (error) {
        this.publish({ status: 'error', issue: (error as Error).message });
      }
    });
  }
  refresh(): Promise<void> {
    // A failed read is retried explicitly, not converted into a fresh profile by the clock timer.
    if (this.view.status === 'error' || this.view.status === 'loading') return Promise.resolve();
    return this.reload();
  }
  prepare(request: CommandRequest): LocalCommand {
    const base = { id: this.id(), createdAt: this.clock.now() };
    const snapshot = this.view.snapshot;
    const version = (id: string) => snapshot?.eventVersions.find((v) => v.id === id)?.revision ?? 0;
    const start = snapshot
      ? dayStart(snapshot.state, currentDay(snapshot.state, this.view.now))
      : 0;
    switch (request.type) {
      case 'start': {
        const species = snapshot?.state.firstSpecies ?? (Math.random() < 0.5 ? 'sprout' : 'cactus');
        const draft = request.draft
          ? createLocalState(base.createdAt, request.draft, species).preferences
          : undefined;
        return { ...base, type: 'start', species, ...(draft ? { draft } : {}) };
      }
      case 'record': {
        const appointment =
          request.appointment ??
          (request.kind === 'sunscreen' && snapshot
            ? sunscreenState(snapshot.state, this.view.now).available?.appointment
            : undefined);
        return {
          ...base,
          ...request,
          eventId: this.id(),
          dayStart: request.dayStart ?? start,
          ...(appointment ? { appointment } : {}),
        };
      }
      case 'edit':
        return {
          ...base,
          ...request,
          expectedRevision: request.expectedRevision ?? version(request.eventId),
          dayStart: start,
        };
      case 'remove':
        return {
          ...base,
          ...request,
          expectedRevision: request.expectedRevision ?? version(request.eventId),
          dayStart: start,
        };
      case 'preferences':
        return structuredClone({
          ...base,
          ...request,
          expectedRevision: request.expectedRevision ?? snapshot?.preferencesRevision ?? 0,
        });
      case 'undo':
        return {
          ...base,
          ...request,
          expectedRevision:
            snapshot?.operations.find((r) => r.command.id === request.targetOperationId)
              ?.eventRevision ?? 0,
          dayStart: start,
        };
    }
  }
  execute(input: LocalCommand): Promise<OperationResult> {
    const command = structuredClone(input);
    return this.enqueue(async () => {
      if (this.view.pending && this.view.pending.id !== command.id)
        return {
          status: 'failed',
          operationId: command.id,
          reason: 'pending',
          message: 'Reintenta o cierra el intento pendiente antes de hacer otro cambio.',
          retryable: false,
        };
      let latest: LocalSnapshot | null = this.view.snapshot;
      try {
        latest = await this.read();
        const now = this.clock.now();
        // Deduplication precedes deadline validation; a committed retry remains confirmed after closing.
        const previous = latest?.operations.find((r) => r.command.id === command.id);
        if (previous && commandFingerprint(previous.command) !== commandFingerprint(command))
          throw new OperationError('conflict', 'El identificador ya pertenece a otra operación.');
        if (previous) {
          try {
            latest = await this.catchUp(latest, now);
            this.publish({ status: 'ready', snapshot: latest, now, pending: null, issue: '' });
          } catch (error) {
            // A lifecycle write can fail, but it cannot revoke an already persisted operation.
            this.publish({ status: 'error', pending: null, issue: (error as Error).message });
          }
          return {
            status: 'confirmed',
            operationId: command.id,
            receipt: previous,
            replayed: true,
          };
        }
        latest = await this.catchUp(latest, now);
        this.publish({ status: latest ? 'ready' : 'empty', snapshot: latest, now });
        const applied = applyOperation(latest, command, now);
        await this.write(applied.snapshot);
        this.publish({
          status: 'ready',
          snapshot: applied.snapshot,
          pending: null,
          issue: '',
          now,
        });
        return {
          status: 'confirmed',
          operationId: command.id,
          receipt: applied.receipt,
          replayed: false,
        };
      } catch (error) {
        if (error instanceof StorageFailure) {
          const retryable = error.stage === 'write';
          // A retry may discover an acknowledged-on-disk operation even when the UI never saw success.
          this.publish({
            status:
              error.stage === 'read' ||
              (latest && latest.state.cycleStarts.at(-1)! + WEEK_MS <= this.clock.now())
                ? 'error'
                : this.view.status,
            pending: command,
            issue: error.message,
          });
          return {
            status: 'failed',
            operationId: command.id,
            reason: error.stage,
            message: error.message,
            retryable,
          };
        }
        const failure =
          error instanceof OperationError
            ? error
            : new OperationError(
                'validation',
                (error as Error).message || 'No pudimos completar el cambio.',
              );
        if (this.view.pending?.id === command.id) this.publish({ pending: null, issue: '' });
        return {
          status: 'failed',
          operationId: command.id,
          reason: failure.reason,
          message: failure.message,
          retryable: false,
        };
      }
    });
  }
  retry(): Promise<OperationResult | null> {
    const pending = this.view.pending;
    return pending ? this.execute(pending) : this.reload().then(() => null);
  }
  discard(): Promise<void> {
    return this.enqueue(async () => {
      try {
        const now = this.clock.now();
        const snapshot = await this.catchUp(await this.read(), now);
        this.publish({
          status: snapshot ? 'ready' : 'empty',
          snapshot,
          now,
          pending: null,
          issue: '',
        });
      } catch (error) {
        this.publish({ status: 'error', issue: (error as Error).message });
      }
    });
  }
}
