import assert from 'node:assert/strict';
import test from 'node:test';
import { createSupabaseSyncRest } from '../src/shared/data/sync/supabaseRest.ts';
import { RemoteSyncError } from '../src/shared/data/sync/model.ts';

const accountId = '2586eedd-ff5e-49b6-831a-d5e36f786314';
const createdAt = Date.UTC(2026, 10, 20, 12);
const operation = {
  operationId: 'operation-rest-1',
  operationType: 'start',
  baseRevision: 0,
  clientCreatedAt: createdAt,
  attempts: 0,
  payload: {
    version: 1,
    local_revision: 1,
    command: { id: 'operation-rest-1', type: 'start', createdAt },
    committed_at: createdAt,
  },
};

function errorIs(code, retryable) {
  return (error) =>
    error instanceof RemoteSyncError && error.code === code && error.retryable === retryable;
}

test('el servicio REST usa la clave pública y el token renovable de la sesión', async () => {
  let tokenReads = 0;
  const service = createSupabaseSyncRest({
    url: 'https://example.supabase.co',
    publishableKey: 'sb_publishable_test',
    async accessToken() {
      tokenReads += 1;
      return 'user-session-jwt';
    },
    async fetcher(input, init) {
      const request = input instanceof Request ? input : new Request(input, init);
      assert.equal(request.method, 'POST');
      assert.equal(request.headers.get('apikey'), 'sb_publishable_test');
      assert.equal(request.headers.get('authorization'), 'Bearer user-session-jwt');
      assert.equal(request.headers.get('prefer'), 'return=representation');
      assert.match(request.url, /^https:\/\/example\.supabase\.co\/rest\/v1\/sync_operations\?/);
      const body = JSON.parse(await request.text());
      assert.equal(body.user_id, accountId);
      assert.equal(body.operation_id, operation.operationId);
      return new Response(
        JSON.stringify([
          {
            operation_id: operation.operationId,
            operation_type: operation.operationType,
            base_revision: operation.baseRevision,
            client_created_at: new Date(operation.clientCreatedAt).toISOString(),
            payload: operation.payload,
            status: 'pending',
            applied_server_revision: null,
            processed_at: null,
            failure_code: null,
          },
        ]),
        { status: 201 },
      );
    },
  });

  const result = await service.push(accountId, operation);
  assert.equal(tokenReads, 1);
  assert.equal(result.operationId, operation.operationId);
  assert.equal(result.status, 'pending');
});

test('sin sesión utiliza solo la clave pública y deja que RLS rechace accesos indebidos', async () => {
  const service = createSupabaseSyncRest({
    url: 'https://example.supabase.co',
    publishableKey: 'sb_publishable_test',
    accessToken: async () => null,
    async fetcher(input, init) {
      const request = input instanceof Request ? input : new Request(input, init);
      assert.equal(request.headers.get('authorization'), 'Bearer sb_publishable_test');
      return new Response(JSON.stringify({ code: '42501' }), { status: 403 });
    },
  });

  await assert.rejects(service.push(accountId, operation), errorIs('permission', false));
});

test('distingue sesión vencida y red temporal para permitir reintentos seguros', async (t) => {
  await t.test('sesión', async () => {
    const service = createSupabaseSyncRest({
      url: 'https://example.supabase.co',
      publishableKey: 'sb_publishable_test',
      accessToken: async () => 'expired',
      fetcher: async () => new Response(JSON.stringify({ code: 'PGRST301' }), { status: 401 }),
    });
    await assert.rejects(service.read(accountId, ['one']), errorIs('session', true));
  });

  await t.test('red', async () => {
    const service = createSupabaseSyncRest({
      url: 'https://example.supabase.co',
      publishableKey: 'sb_publishable_test',
      accessToken: async () => 'valid',
      fetcher: async () => {
        throw new TypeError('network unavailable');
      },
    });
    await assert.rejects(service.pull(accountId, 0), errorIs('network', true));
  });
});
