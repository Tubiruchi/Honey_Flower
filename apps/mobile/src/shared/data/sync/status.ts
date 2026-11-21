import type { SyncState } from '@honeyflower/contracts';

export function resolveSyncState(options: {
  connected: boolean;
  failedCount: number;
  pendingCount: number;
  networkError: boolean;
}): SyncState {
  if (!options.connected) return 'offline';
  if (options.failedCount > 0 || options.networkError) return 'error';
  return options.pendingCount > 0 ? 'pending' : 'synced';
}
