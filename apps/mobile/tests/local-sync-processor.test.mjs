import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(
  new URL(
    '../../../supabase/migrations/20261121014202_process_sync_operations.sql',
    import.meta.url,
  ),
  'utf8',
);
const integrationCheck = readFileSync(
  new URL('../../../supabase/tests/process_sync_operations.sql', import.meta.url),
  'utf8',
);
const pullMigration = readFileSync(
  new URL('../../../supabase/migrations/20261121022003_pull_sync_snapshot.sql', import.meta.url),
  'utf8',
);

test('el procesador remoto es privado y se ejecuta solo después de insertar una operación', () => {
  assert.match(
    migration,
    /create or replace function app_private\.process_sync_operation\(\)[\s\S]*security definer[\s\S]*set search_path = ''/i,
  );
  assert.match(
    migration,
    /revoke all on function app_private\.process_sync_operation\(\) from public, anon, authenticated;/i,
  );
  assert.match(
    migration,
    /create trigger process_sync_operation_after_insert[\s\S]*after insert on public\.sync_operations[\s\S]*when \(new\.status = 'pending'\)/i,
  );
});

test('el servidor valida todas las operaciones y publica solo resultados seguros', () => {
  for (const operation of ['start', 'preferences', 'record', 'edit', 'remove', 'undo']) {
    assert.match(migration, new RegExp(`new\\.operation_type[\\s\\S]{0,80}'${operation}'`));
  }
  assert.match(migration, /status = 'applied'[\s\S]*applied_server_revision = applied_revision/i);
  assert.match(migration, /status = outcome[\s\S]*failure_code = failure/i);
  assert.match(migration, /failure_code', 'processor-error'/i);
  assert.doesNotMatch(migration, /photo_(?:data|bytes)|image_base64/i);
});

test('la prueba remota cubre proyecciones y siempre revierte sus fixtures', () => {
  assert.match(integrationCheck, /^begin;/m);
  assert.match(integrationCheck, /^rollback;/m);
  for (const operation of ['start', 'record', 'edit', 'remove', 'undo', 'preferences']) {
    assert.match(integrationCheck, new RegExp(`'${operation}'`));
  }
  assert.match(integrationCheck, /invalid-operation-was-not-safely-rejected/);
  assert.match(integrationCheck, /phase-5-and-6-sync-passed/);
});

test('la descarga remota usa la sesión, RLS y un cursor sin exponer archivos de cámara', () => {
  assert.match(
    pullMigration,
    /function public\.pull_sync_snapshot\(p_since_revision bigint default 0\)[\s\S]*security invoker[\s\S]*set search_path = ''/i,
  );
  assert.match(pullMigration, /owner_id uuid := auth\.uid\(\)/i);
  assert.match(
    pullMigration,
    /revoke all on function public\.pull_sync_snapshot\(bigint\) from public, anon;/i,
  );
  assert.match(
    pullMigration,
    /grant execute on function public\.pull_sync_snapshot\(bigint\) to authenticated;/i,
  );
  assert.doesNotMatch(pullMigration, /photo_(?:data|bytes)|image_base64|service_role/i);
  assert.match(integrationCheck, /pull-snapshot-contract-failed/);
});
