import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { unconfiguredAuth } from './model.ts';
import type { AccountUser, AuthPort } from './model.ts';
import { commandFingerprint } from '../../shared/data/localSnapshot.ts';
import { RemoteSyncError, unconfiguredSync } from '../../shared/data/sync/model.ts';
import type { RemoteOperationAck, SyncRemotePort } from '../../shared/data/sync/model.ts';
import { parseRemotePull } from '../../shared/data/sync/pull.ts';

const userView = (user: User): AccountUser => ({
  id: user.id,
  email: user.email ?? '',
  name:
    typeof user.user_metadata?.preferred_name === 'string' ? user.user_metadata.preferred_name : '',
});
function remoteError(error: { code?: string } | null): RemoteSyncError {
  const source = error?.code ?? '';
  if (source === '42501') return new RemoteSyncError('permission', false);
  if (source === '23503' || source === '23514' || source === 'P0001' || source.startsWith('22'))
    return new RemoteSyncError('contract', false);
  if (source.startsWith('PGRST3')) return new RemoteSyncError('session', true);
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

const remoteFields =
  'operation_id,operation_type,base_revision,client_created_at,payload,status,applied_server_revision,processed_at,failure_code';

function createSyncPort(client: SupabaseClient): SyncRemotePort {
  const readOne = async (accountId: string, operationId: string) => {
    const { data, error } = await client
      .from('sync_operations')
      .select(remoteFields)
      .eq('user_id', accountId)
      .eq('operation_id', operationId)
      .maybeSingle();
    if (error) throw remoteError(error);
    if (!data) throw new RemoteSyncError('missing-duplicate', true);
    return data as Record<string, unknown>;
  };
  return {
    configured: true,
    async push(accountId, operation) {
      const record = {
        user_id: accountId,
        operation_id: operation.operationId,
        operation_type: operation.operationType,
        base_revision: operation.baseRevision,
        client_created_at: new Date(operation.clientCreatedAt).toISOString(),
        payload: operation.payload,
        status: 'pending',
      };
      const { data, error } = await client
        .from('sync_operations')
        .insert(record)
        .select(remoteFields)
        .single();
      let row: Record<string, unknown>;
      if (!error) row = data as Record<string, unknown>;
      else if (error.code === '23505') {
        row = await readOne(accountId, operation.operationId);
        if (
          row.operation_type !== operation.operationType ||
          Number(row.base_revision) !== operation.baseRevision ||
          Date.parse(String(row.client_created_at)) !== operation.clientCreatedAt ||
          commandFingerprint(row.payload) !== commandFingerprint(operation.payload)
        )
          throw new RemoteSyncError('duplicate-mismatch', false);
      } else throw remoteError(error);
      return acknowledgement(row);
    },
    async read(accountId, operationIds) {
      if (!operationIds.length) return [];
      const { data, error } = await client
        .from('sync_operations')
        .select(remoteFields)
        .eq('user_id', accountId)
        .in('operation_id', operationIds);
      if (error) throw remoteError(error);
      return (data ?? []).map((row) => acknowledgement(row as Record<string, unknown>));
    },
    async pull(_accountId, sinceRevision) {
      const { data, error } = await client.rpc('pull_sync_snapshot', {
        p_since_revision: sinceRevision,
      });
      if (error) throw remoteError(error);
      return parseRemotePull(data);
    },
    async acknowledgePull(accountId, device, serverRevision, pulledAt) {
      const { error } = await client.from('sync_devices').upsert(
        {
          user_id: accountId,
          device_id: device.deviceId,
          platform: device.platform,
          app_version: device.appVersion,
          last_pulled_revision: serverRevision,
          last_seen_at: new Date(pulledAt).toISOString(),
          updated_at: new Date(pulledAt).toISOString(),
        },
        { onConflict: 'user_id,device_id' },
      );
      if (error) throw remoteError(error);
    },
  };
}

export interface SupabaseServices {
  auth: AuthPort;
  sync: SyncRemotePort;
}

/** Public client key only. No service-role key, passwords or photo bytes in this module. */
export function createSupabaseServices(config?: { url?: string; key?: string }): SupabaseServices {
  const url = (config?.url ?? import.meta.env.VITE_SUPABASE_URL)?.trim();
  const key = (config?.key ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)?.trim();
  if (!url || !key) return { auth: unconfiguredAuth, sync: unconfiguredSync };
  // Reject private/server keys and malformed configuration rather than creating a broken client.
  if (!/^https:\/\/[^/]+(?:\/)?$/.test(url) || !key.startsWith('sb_publishable_'))
    return { auth: unconfiguredAuth, sync: unconfiguredSync };
  const client = createClient(url, key, {
    auth: {
      storageKey: 'honeyflower.auth.v1',
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  const redirect = (recovery = false) =>
    `${
      Capacitor.isNativePlatform()
        ? 'honeyflower://auth/callback'
        : `${window.location.origin}/cuenta/callback`
    }${recovery ? '?flow=recovery' : ''}`;
  let exchange: { code: string; task: Promise<AccountUser> } | null = null;
  const auth: AuthPort = {
    configured: true,
    async restore() {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      return data.session ? userView(data.session.user) : null;
    },
    subscribe(listener) {
      const { data } = client.auth.onAuthStateChange((event, session) => {
        // Keep synchronous: awaiting another auth call here can deadlock the SDK's session lock.
        listener(session ? userView(session.user) : null, event === 'PASSWORD_RECOVERY');
      });
      return () => data.subscription.unsubscribe();
    },
    async signIn(email, password) {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return userView(data.user);
    },
    async signUp(email, password, name) {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirect(),
          data: { preferred_name: name },
        },
      });
      if (error) throw error;
      // A user object alone is not an authenticated session when confirmation is enabled.
      return data.session ? userView(data.session.user) : null;
    },
    async resetPassword(email) {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: redirect(true),
      });
      if (error) throw error;
    },
    async resendConfirmation(email) {
      const { error } = await client.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: redirect() },
      });
      if (error) throw error;
    },
    async updatePassword(password) {
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
    },
    exchangeCode(code, flowId) {
      const exchangeKey = `${code}:${flowId ?? ''}`;
      if (exchange?.code === exchangeKey) return exchange.task;
      const task = (async () => {
        const { data, error } = await client.auth.exchangeCodeForSession(
          code,
          flowId ? { flowId } : undefined,
        );
        if (error) throw error;
        if (!data.session) throw new Error('No session');
        return userView(data.session.user);
      })();
      exchange = { code: exchangeKey, task };
      return task;
    },
    async signOut() {
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) throw error;
    },
  };
  return { auth, sync: createSyncPort(client) };
}

export function createSupabaseAuth(config?: { url?: string; key?: string }): AuthPort {
  return createSupabaseServices(config).auth;
}
