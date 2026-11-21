import { commandFingerprint } from '../localSnapshot.ts';
import { RemoteSyncError } from './model.ts';
import type { PendingSyncOperation, RemoteOperationAck, SyncRemotePort } from './model.ts';
import { parseRemotePull } from './pull.ts';

interface DataApiErrorBody {
  code?: string;
}

class DataApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(status: number, code = '') {
    super('Supabase Data API request failed.');
    this.status = status;
    this.code = code;
  }
}

export interface SupabaseSyncRestOptions {
  url: string;
  publishableKey: string;
  accessToken: () => Promise<string | null>;
  fetcher?: typeof fetch;
}

interface RequestOptions {
  body?: unknown;
  prefer?: string;
  query?: Record<string, string>;
  response?: 'json' | 'none';
}

const remoteFields =
  'operation_id,operation_type,base_revision,client_created_at,payload,status,applied_server_revision,processed_at,failure_code';

function dataApiError(error: DataApiError): RemoteSyncError {
  const source = error.code;
  if (error.status === 401 || source.startsWith('PGRST3'))
    return new RemoteSyncError('session', true);
  if (error.status === 403 || source === '42501') return new RemoteSyncError('permission', false);
  if (source === '23503' || source === '23514' || source === 'P0001' || source.startsWith('22'))
    return new RemoteSyncError('contract', false);
  if (error.status === 0 || error.status === 408 || error.status === 429 || error.status >= 500)
    return new RemoteSyncError('network', true);
  return new RemoteSyncError('network', true);
}

function acknowledgement(row: Record<string, unknown>): RemoteOperationAck {
  const status = row.status;
  const processedAt = typeof row.processed_at === 'string' ? Date.parse(row.processed_at) : null;
  const revision = row.applied_server_revision;
  if (
    typeof row.operation_id !== 'string' ||
    !['pending', 'applied', 'rejected', 'conflict'].includes(String(status)) ||
    (processedAt !== null && !Number.isFinite(processedAt)) ||
    (revision !== null && revision !== undefined && !Number.isSafeInteger(Number(revision)))
  )
    throw new RemoteSyncError('invalid-response', false);
  return {
    operationId: row.operation_id,
    status: status as RemoteOperationAck['status'],
    appliedServerRevision: revision === null || revision === undefined ? null : Number(revision),
    processedAt,
    failureCode: typeof row.failure_code === 'string' ? row.failure_code : null,
  };
}

function rows(value: unknown): Record<string, unknown>[] {
  const listed = Array.isArray(value) ? value : [value];
  if (listed.some((row) => row === null || typeof row !== 'object' || Array.isArray(row)))
    throw new RemoteSyncError('invalid-response', false);
  return listed as Record<string, unknown>[];
}

function oneRow(value: unknown): Record<string, unknown> {
  const listed = rows(value);
  if (listed.length !== 1) throw new RemoteSyncError('invalid-response', false);
  return listed[0]!;
}

function operationFilter(operationIds: string[]): string {
  return `in.(${operationIds.map((id) => `"${id.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`).join(',')})`;
}

export function createSupabaseSyncRest(options: SupabaseSyncRestOptions): SyncRemotePort {
  const fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);
  const baseUrl = options.url.endsWith('/') ? options.url : `${options.url}/`;

  const request = async <T>(
    method: 'GET' | 'POST',
    resource: string,
    requestOptions: RequestOptions = {},
  ): Promise<T> => {
    let token: string | null;
    try {
      token = await options.accessToken();
    } catch {
      throw new RemoteSyncError('session', true);
    }
    const url = new URL(`rest/v1/${resource}`, baseUrl);
    for (const [key, value] of Object.entries(requestOptions.query ?? {}))
      url.searchParams.set(key, value);
    const headers = new Headers({
      apikey: options.publishableKey,
      Authorization: `Bearer ${token ?? options.publishableKey}`,
    });
    if (requestOptions.body !== undefined) headers.set('Content-Type', 'application/json');
    if (requestOptions.prefer) headers.set('Prefer', requestOptions.prefer);
    let response: Response;
    try {
      response = await fetcher(url, {
        method,
        headers,
        body: requestOptions.body === undefined ? undefined : JSON.stringify(requestOptions.body),
      });
    } catch {
      throw new RemoteSyncError('network', true);
    }
    if (!response.ok) {
      let error: DataApiErrorBody = {};
      try {
        error = (await response.json()) as DataApiErrorBody;
      } catch {
        error = {};
      }
      throw new DataApiError(response.status, typeof error.code === 'string' ? error.code : '');
    }
    if (requestOptions.response === 'none' || response.status === 204) return undefined as T;
    try {
      return (await response.json()) as T;
    } catch {
      throw new RemoteSyncError('invalid-response', false);
    }
  };

  const readOne = async (accountId: string, operationId: string) => {
    try {
      const result = await request<unknown>('GET', 'sync_operations', {
        query: {
          select: remoteFields,
          user_id: `eq.${accountId}`,
          operation_id: `eq.${operationId}`,
          limit: '1',
        },
      });
      const listed = rows(result);
      if (!listed.length) throw new RemoteSyncError('missing-duplicate', true);
      if (listed.length !== 1) throw new RemoteSyncError('invalid-response', false);
      return listed[0]!;
    } catch (error) {
      if (error instanceof DataApiError) throw dataApiError(error);
      throw error;
    }
  };

  return {
    configured: true,
    async push(accountId, operation: PendingSyncOperation) {
      const record = {
        user_id: accountId,
        operation_id: operation.operationId,
        operation_type: operation.operationType,
        base_revision: operation.baseRevision,
        client_created_at: new Date(operation.clientCreatedAt).toISOString(),
        payload: operation.payload,
        status: 'pending',
      };
      let row: Record<string, unknown>;
      try {
        row = oneRow(
          await request<unknown>('POST', 'sync_operations', {
            query: { select: remoteFields },
            body: record,
            prefer: 'return=representation',
          }),
        );
      } catch (error) {
        if (error instanceof DataApiError && error.code === '23505') {
          row = await readOne(accountId, operation.operationId);
          if (
            row.operation_type !== operation.operationType ||
            Number(row.base_revision) !== operation.baseRevision ||
            Date.parse(String(row.client_created_at)) !== operation.clientCreatedAt ||
            commandFingerprint(row.payload) !== commandFingerprint(operation.payload)
          )
            throw new RemoteSyncError('duplicate-mismatch', false);
        } else if (error instanceof DataApiError) throw dataApiError(error);
        else throw error;
      }
      return acknowledgement(row);
    },
    async read(accountId, operationIds) {
      if (!operationIds.length) return [];
      try {
        const result = await request<unknown>('GET', 'sync_operations', {
          query: {
            select: remoteFields,
            user_id: `eq.${accountId}`,
            operation_id: operationFilter(operationIds),
          },
        });
        return rows(result).map(acknowledgement);
      } catch (error) {
        if (error instanceof DataApiError) throw dataApiError(error);
        throw error;
      }
    },
    async pull(_accountId, sinceRevision) {
      try {
        const result = await request<unknown>('POST', 'rpc/pull_sync_snapshot', {
          body: { p_since_revision: sinceRevision },
        });
        return parseRemotePull(result);
      } catch (error) {
        if (error instanceof DataApiError) throw dataApiError(error);
        throw error;
      }
    },
    async acknowledgePull(accountId, device, serverRevision, pulledAt) {
      try {
        await request<void>('POST', 'sync_devices', {
          query: { on_conflict: 'user_id,device_id' },
          body: {
            user_id: accountId,
            device_id: device.deviceId,
            platform: device.platform,
            app_version: device.appVersion,
            last_pulled_revision: serverRevision,
            last_seen_at: new Date(pulledAt).toISOString(),
            updated_at: new Date(pulledAt).toISOString(),
          },
          prefer: 'resolution=merge-duplicates,return=minimal',
          response: 'none',
        });
      } catch (error) {
        if (error instanceof DataApiError) throw dataApiError(error);
        throw error;
      }
    },
  };
}
