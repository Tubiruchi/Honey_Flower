import type { SqliteConnectionPort } from '../sqlite/port.ts';
import {
  claimNextOperation,
  localSyncSummary,
  markOperationFailed,
  recordRemoteAck,
  remotePendingIds,
  retryFailedOperations,
} from './outbox.ts';
import type { LocalSyncSummary } from './outbox.ts';
import { RemoteSyncError } from './model.ts';
import type { SyncRemotePort } from './model.ts';
import { applyRemotePull, pullReadiness, syncDeviceId } from './pull.ts';

export interface SyncRunResult {
  summary: LocalSyncSummary;
  networkError: boolean;
  pulled: boolean;
  reconciledCount: number;
}

export class SyncEngine {
  private connection: SqliteConnectionPort;
  private accountId: string;
  private remote: SyncRemotePort;
  private now: () => number;
  private platform: 'android' | 'web';
  private appVersion: string;
  private running: Promise<SyncRunResult> | null = null;

  constructor(options: {
    connection: SqliteConnectionPort;
    accountId: string;
    remote: SyncRemotePort;
    now?: () => number;
    platform?: 'android' | 'web';
    appVersion?: string;
  }) {
    this.connection = options.connection;
    this.accountId = options.accountId;
    this.remote = options.remote;
    this.now = options.now ?? Date.now;
    this.platform = options.platform ?? 'web';
    this.appVersion = options.appVersion ?? 'development';
  }

  run(online = true, maxUploads = 25): Promise<SyncRunResult> {
    if (this.running) return this.running;
    this.running = this.flush(online, maxUploads).finally(() => {
      this.running = null;
    });
    return this.running;
  }

  retry(online = true): Promise<SyncRunResult> {
    return retryFailedOperations(this.connection).then(() => this.run(online));
  }

  private async flush(online: boolean, maxUploads: number): Promise<SyncRunResult> {
    if (!online || !this.remote.configured)
      return {
        summary: await localSyncSummary(this.connection),
        networkError: false,
        pulled: false,
        reconciledCount: 0,
      };

    let networkError = false;
    for (let sent = 0; sent < maxUploads; sent++) {
      const operation = await claimNextOperation(this.connection, this.now());
      if (!operation) break;
      try {
        const ack = await this.remote.push(this.accountId, operation);
        if (ack.operationId !== operation.operationId)
          throw new RemoteSyncError('invalid-response', false);
        await recordRemoteAck(this.connection, ack, this.now());
      } catch (error) {
        const failure =
          error instanceof RemoteSyncError ? error : new RemoteSyncError('network', true);
        await markOperationFailed(this.connection, operation, failure.code, this.now());
        networkError = failure.retryable;
        break;
      }
    }

    const pendingIds = await remotePendingIds(this.connection);
    if (pendingIds.length) {
      try {
        const acknowledgements = await this.remote.read(this.accountId, pendingIds);
        const expected = new Set(pendingIds);
        for (const ack of acknowledgements) {
          if (!expected.has(ack.operationId)) throw new RemoteSyncError('invalid-response', false);
          await recordRemoteAck(this.connection, ack, this.now());
        }
      } catch (error) {
        networkError ||= !(error instanceof RemoteSyncError) || error.retryable;
      }
    }

    let pulled = false;
    let reconciledCount = 0;
    if (!networkError && this.remote.pull) {
      try {
        const readiness = await pullReadiness(this.connection);
        if (readiness.blockingCount === 0) {
          const requestedCursor = readiness.needsReconciliation ? 0 : readiness.cursor;
          const result = await this.remote.pull(this.accountId, requestedCursor);
          const applied = await applyRemotePull(
            this.connection,
            result,
            readiness.cursor,
            this.now(),
          );
          pulled = applied.applied;
          reconciledCount = applied.reconciledCount;
          if (!applied.deferred && this.remote.acknowledgePull) {
            const deviceId = await syncDeviceId(this.connection, this.now());
            await this.remote.acknowledgePull(
              this.accountId,
              { deviceId, platform: this.platform, appVersion: this.appVersion },
              result.serverRevision,
              this.now(),
            );
          }
        }
      } catch {
        networkError = true;
      }
    }

    return {
      summary: await localSyncSummary(this.connection),
      networkError,
      pulled,
      reconciledCount,
    };
  }
}
