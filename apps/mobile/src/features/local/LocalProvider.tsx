import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import type { ReactNode } from 'react';
import type { OnboardingDraft } from '../onboarding/model';
import { ONBOARDING_STORAGE_KEY, readOnboardingSnapshot } from '../onboarding/model';
import type { LocalState } from './model';
import type { Clock } from '../../shared/data/clock';
import { LocalRepository, memoryStorage } from '../../shared/data/localRepository';
import type {
  CommandRequest,
  LocalStoragePort,
  RepositoryView,
} from '../../shared/data/localRepository';
import { deviceLocalStorage } from '../../shared/native/localStorage';
import { createSnapshot, LOCAL_SNAPSHOT_KEY } from '../../shared/data/localSnapshot';
import type { LocalCommand, OperationResult } from '../../shared/data/localSnapshot';
import type { SunscreenAppointment } from '../sunscreen/schema';

interface LocalContextValue {
  storage: LocalStoragePort;
  clock: Clock;
  commit: (command: LocalCommand) => Promise<OperationResult>;
  state: LocalState | null;
  now: number;
  status: RepositoryView['status'];
  storageError: string;
  busy: boolean;
  writing: boolean;
  pending: boolean;
  preferencesRevision: number;
  eventRevision: (id: string) => number;
  start: (draft?: OnboardingDraft) => Promise<OperationResult>;
  record: (kind: 'water' | 'sunscreen', amount: number) => Promise<OperationResult>;
  recordSunscreen: (appointment: SunscreenAppointment) => Promise<OperationResult>;
  remove: (id: string, expectedRevision?: number) => Promise<OperationResult>;
  edit: (id: string, amount: number, expectedRevision?: number) => Promise<OperationResult>;
  undo: (operationId: string) => Promise<OperationResult>;
  update: (draft: OnboardingDraft, expectedRevision?: number) => Promise<OperationResult>;
  retry: () => Promise<void>;
  discard: () => Promise<void>;
}
const LocalContext = createContext<LocalContextValue | null>(null);
export function LocalProvider({
  children,
  initialState,
  persist = true,
  referenceNow,
  storage,
  clock,
}: {
  children: ReactNode;
  initialState?: LocalState;
  persist?: boolean;
  referenceNow?: number;
  storage?: LocalStoragePort;
  clock?: Clock;
}) {
  const [source] = useState(() =>
    persist
      ? (storage ?? deviceLocalStorage())
      : memoryStorage(
          initialState
            ? { [LOCAL_SNAPSHOT_KEY]: JSON.stringify(createSnapshot(initialState)) }
            : {},
        ),
  );
  const [repository] = useState(
    () =>
      new LocalRepository({
        storage: source,
        clock: clock ?? (referenceNow === undefined ? undefined : { now: () => referenceNow }),
        initialState: !persist ? initialState : undefined,
      }),
  );
  const view = useSyncExternalStore(
    repository.subscribe,
    repository.getSnapshot,
    repository.getSnapshot,
  );
  const waiters = useRef(new Map<string, (result: OperationResult) => void>());
  const flights = useRef(new Map<string, Promise<OperationResult>>());
  const recentRecord = useRef<{ key: string; result: OperationResult; until: number } | null>(null);
  useEffect(() => {
    void repository.initialize();
    if (referenceNow !== undefined) return;
    const refresh = () => {
      if (document.visibilityState !== 'hidden') void repository.refresh();
    };
    const interval = window.setInterval(refresh, 15_000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    const storageChanged = (event: StorageEvent) => {
      if (event.key === LOCAL_SNAPSHOT_KEY || event.key === null) refresh();
    };
    window.addEventListener('storage', storageChanged);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', storageChanged);
    };
  }, [repository, referenceNow]);

  function settle(result: OperationResult) {
    if (result.status === 'failed' && (result.reason === 'read' || result.reason === 'write'))
      return;
    waiters.current.get(result.operationId)?.(result);
    waiters.current.delete(result.operationId);
  }
  /** Existing forms stay locked through a recoverable write; retry settles the original action. */
  function run(request: CommandRequest): Promise<OperationResult> {
    const frozen = structuredClone(request);
    const key = JSON.stringify(frozen);
    const active = flights.current.get(key);
    if (active) return active;
    // A synchronous local write can finish between the two clicks of one double tap.
    if (
      request.type === 'record' &&
      recentRecord.current?.key === key &&
      performance.now() < recentRecord.current.until
    )
      return Promise.resolve(recentRecord.current.result);
    recentRecord.current = null;
    const command = repository.prepare(frozen);
    const task = commit(command)
      .then((result) => {
        if (request.type === 'record' && result.status === 'confirmed')
          recentRecord.current = { key, result, until: performance.now() + 500 };
        return result;
      })
      .finally(() => {
        flights.current.delete(key);
      });
    flights.current.set(key, task);
    return task;
  }
  function commit(command: LocalCommand): Promise<OperationResult> {
    const key = `command:${command.id}`;
    const active = flights.current.get(key);
    if (active) return active;
    const task = repository
      .execute(command)
      .then((result) => {
        if (result.status === 'failed' && (result.reason === 'read' || result.reason === 'write')) {
          return new Promise<OperationResult>((resolve) => {
            waiters.current.set(command.id, resolve);
          });
        }
        return result;
      })
      .finally(() => {
        flights.current.delete(key);
      });
    flights.current.set(key, task);
    return task;
  }
  async function retry() {
    const result = await repository.retry();
    if (result) settle(result);
  }
  async function discard() {
    const pending = repository.getSnapshot().pending;
    await repository.discard();
    const next = repository.getSnapshot();
    if (!pending || next.pending) return;
    const receipt = next.snapshot?.operations.find((r) => r.command.id === pending.id);
    settle(
      receipt
        ? { status: 'confirmed', operationId: pending.id, receipt, replayed: true }
        : {
            status: 'failed',
            operationId: pending.id,
            reason: 'discarded',
            message: 'Se cerró el intento sin guardar. Tus datos confirmados se conservan.',
            retryable: false,
          },
    );
  }
  return (
    <LocalContext.Provider
      value={{
        storage: source,
        clock: clock ?? { now: () => referenceNow ?? Date.now() },
        commit,
        state: view.snapshot?.state ?? null,
        now: view.now,
        status: view.status,
        storageError: view.issue,
        busy: view.busy || !!view.pending,
        writing: view.busy,
        pending: !!view.pending,
        preferencesRevision: view.snapshot?.preferencesRevision ?? 0,
        eventRevision: (id) => view.snapshot?.eventVersions.find((v) => v.id === id)?.revision ?? 0,
        start: async (draft) => {
          if (!draft && persist) {
            try {
              const raw = await source.getItem(ONBOARDING_STORAGE_KEY);
              draft = readOnboardingSnapshot({ getItem: () => raw })?.draft;
            } catch {
              /* A separate draft may be unavailable; profile reads remain guarded by the repository. */
            }
          }
          return run({ type: 'start', ...(draft ? { draft } : {}) });
        },
        record: (kind, amount) => run({ type: 'record', kind, amount }),
        recordSunscreen: (appointment) =>
          run({
            type: 'record',
            kind: 'sunscreen',
            amount: 1,
            appointment,
            dayStart: appointment.dayStart,
          }),
        remove: (eventId, expectedRevision) => run({ type: 'remove', eventId, expectedRevision }),
        edit: (eventId, amount, expectedRevision) =>
          run({ type: 'edit', eventId, amount, expectedRevision }),
        undo: (targetOperationId) => run({ type: 'undo', targetOperationId }),
        update: (draft, expectedRevision) => run({ type: 'preferences', draft, expectedRevision }),
        retry,
        discard,
      }}
    >
      {children}
    </LocalContext.Provider>
  );
}
export function useLocal() {
  const context = useContext(LocalContext);
  if (!context) throw new Error('LocalProvider is required');
  return context;
}
