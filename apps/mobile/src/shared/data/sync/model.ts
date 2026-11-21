import type { LocalCommand } from '../localSnapshot.ts';
import type { LocalSnapshot } from '../localSnapshot.ts';

export type RemoteSyncStatus = 'pending' | 'applied' | 'rejected' | 'conflict';

export interface SyncOperationPayload {
  version: 1;
  local_revision: number;
  command: LocalCommand;
  committed_at: number;
  before?: unknown;
  after?: unknown;
  event_revision?: number;
}

export interface PendingSyncOperation {
  operationId: string;
  operationType: LocalCommand['type'];
  baseRevision: number;
  clientCreatedAt: number;
  payload: SyncOperationPayload;
  attempts: number;
}

export interface RemoteOperationAck {
  operationId: string;
  status: RemoteSyncStatus;
  appliedServerRevision: number | null;
  processedAt: number | null;
  failureCode: string | null;
}

export interface RemotePullResult {
  serverRevision: number;
  lastOperationId: string | null;
  unchanged: boolean;
  snapshot: LocalSnapshot | null;
}

export interface SyncDeviceMetadata {
  deviceId: string;
  platform: 'android' | 'web';
  appVersion: string;
}

export interface SyncRemotePort {
  configured: boolean;
  push: (accountId: string, operation: PendingSyncOperation) => Promise<RemoteOperationAck>;
  read: (accountId: string, operationIds: string[]) => Promise<RemoteOperationAck[]>;
  pull?: (accountId: string, sinceRevision: number) => Promise<RemotePullResult>;
  acknowledgePull?: (
    accountId: string,
    device: SyncDeviceMetadata,
    serverRevision: number,
    pulledAt: number,
  ) => Promise<void>;
}

export class RemoteSyncError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  constructor(code: string, retryable: boolean) {
    super('No se pudo entregar la operación al servidor.');
    this.code = code;
    this.retryable = retryable;
  }
}

const unavailable = async (): Promise<never> => {
  throw new RemoteSyncError('unconfigured', false);
};

export const unconfiguredSync: SyncRemotePort = {
  configured: false,
  push: unavailable,
  read: unavailable,
};
