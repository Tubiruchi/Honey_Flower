import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authError,
  emailError,
  passwordError,
  parseAuthCallback,
  unconfiguredAuth,
} from '../src/features/auth/model.ts';
import { accountStorage, accountStorageKey } from '../src/shared/data/accountStorage.ts';
import { memoryStorage, LocalRepository } from '../src/shared/data/localRepository.ts';
import { LOCAL_SNAPSHOT_KEY } from '../src/shared/data/localSnapshot.ts';
import { createOnboardingDraft, ONBOARDING_STORAGE_KEY } from '../src/features/onboarding/model.ts';
import {
  completePendingAccountSetup,
  discardPendingAccountSetup,
  PENDING_ACCOUNT_SETUP_KEY,
  readCompletedOnboardingDraft,
  readPendingAccountSetup,
  savePendingAccountSetup,
} from '../src/features/auth/pendingSetup.ts';

function removableStorage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test('correo validado, contraseñas sin recorte y límite compatible con caracteres Unicode', () => {
  assert.equal(emailError(' persona@example.com '), '');
  for (const value of ['', 'a@', 'a @b.com', 'a@b']) assert.ok(emailError(value));
  assert.ok(passwordError('short'));
  assert.equal(passwordError(' a long password '), '');
  assert.ok(passwordError('🌻'.repeat(19)));
  assert.equal(passwordError('🌻'.repeat(10)), '');
});
test('enlaces PKCE aceptan solo los destinos de la app y descartan tokens implícitos', () => {
  const origin = 'https://honeyflower.example';
  assert.deepEqual(
    parseAuthCallback(
      'honeyflower://auth/callback?code=valid&flow=recovery&sb_flow_id=flow_12345678',
      origin,
    ),
    { code: 'valid', recovery: true, flowId: 'flow_12345678' },
  );
  assert.deepEqual(parseAuthCallback(origin + '/cuenta/callback?code=valid', origin), {
    code: 'valid',
    recovery: false,
    flowId: '',
  });
  assert.equal(parseAuthCallback('https://other.example/cuenta/callback?code=valid', origin), null);
  assert.equal(parseAuthCallback('honeyflower://other/callback?code=valid', origin), null);
  assert.equal(parseAuthCallback('honeyflower://auth/other?code=valid', origin), null);
  assert.equal(parseAuthCallback('honeyflower://auth/callback#access_token=bad', origin).code, '');
  assert.equal(
    parseAuthCallback(origin + '/cuenta/callback?code=valid&error=expired', origin).code,
    '',
  );
  assert.equal(
    parseAuthCallback('honeyflower://auth/callback?code=valid&sb_flow_id=../../otro', origin)
      .flowId,
    '',
  );
});
test('sin configuración no se crea ninguna sesión ni se simula un alta', async () => {
  assert.equal(unconfiguredAuth.configured, false);
  assert.equal(await unconfiguredAuth.restore(), null);
  await assert.rejects(unconfiguredAuth.signIn('a@example.com', 'password'));
  await assert.rejects(unconfiguredAuth.signUp('a@example.com', 'password', 'A'));
});
test('errores públicos no exponen texto técnico del servidor ni claves o contraseñas', () => {
  assert.match(
    authError({ code: 'invalid_credentials', message: 'secret debug' }),
    /correo o la contraseña/,
  );
  assert.doesNotMatch(authError(new Error('secret debug')), /secret|debug/);
  assert.match(authError({ code: 'email_not_confirmed' }), /Confirma tu correo/);
  assert.match(authError({ code: 'over_email_send_rate_limit' }), /Espera/);
});
test('cada cuenta, modo invitado y claves antiguas quedan aislados al reabrir repositorios', async () => {
  const source = memoryStorage();
  const clock = { now: () => Date.UTC(2026, 10, 10) };
  const guest = new LocalRepository({ storage: source, clock });
  await guest.initialize();
  await guest.execute(guest.prepare({ type: 'start' }));
  const guestRaw = await source.getItem(LOCAL_SNAPSHOT_KEY);
  for (const id of ['account-a', 'account-b']) {
    const storage = accountStorage(source, id);
    assert.equal(await storage.getItem(LOCAL_SNAPSHOT_KEY), null);
    const repo = new LocalRepository({ storage, clock });
    await repo.initialize();
    assert.equal(repo.getSnapshot().snapshot, null);
    await repo.execute(repo.prepare({ type: 'start' }));
    if (id === 'account-a')
      await repo.execute(repo.prepare({ type: 'record', kind: 'water', amount: 250 }));
    const reopened = new LocalRepository({ storage: accountStorage(source, id), clock });
    await reopened.initialize();
    assert.equal(reopened.getSnapshot().snapshot.state.events.length, id === 'account-a' ? 1 : 0);
  }
  assert.equal(await source.getItem(LOCAL_SNAPSHOT_KEY), guestRaw);
  await source.setItem('honeyflower.local.v1', 'guest legacy');
  assert.equal(await accountStorage(source, 'account-a').getItem('honeyflower.local.v1'), null);
  assert.throws(() => accountStorageKey(LOCAL_SNAPSHOT_KEY, '../other'));
});
test('la configuración terminada se entrega solo a la cuenta que se registró', () => {
  const draft = { ...createOnboardingDraft('America/Cancun'), preferredName: 'Noemí' };
  const storage = removableStorage({
    [ONBOARDING_STORAGE_KEY]: JSON.stringify({ version: 1, step: 'resumen', draft }),
  });
  assert.deepEqual(readCompletedOnboardingDraft(storage), draft);
  savePendingAccountSetup(storage, ' Noemi@Example.COM ', draft, 1000);
  assert.equal(
    readPendingAccountSetup(storage, 'noemi@example.com', 2000).draft.preferredName,
    'Noemí',
  );
  assert.equal(readPendingAccountSetup(storage, 'otra@example.com', 2000), null);
  assert.doesNotMatch(storage.getItem(PENDING_ACCOUNT_SETUP_KEY), /password|contraseña|session/i);
});
test('un alta fallida conserva el onboarding pero descarta la entrega de cuenta', () => {
  const draft = { ...createOnboardingDraft('UTC'), preferredName: 'Alex' };
  const storage = removableStorage({
    [ONBOARDING_STORAGE_KEY]: JSON.stringify({ version: 1, step: 'resumen', draft }),
  });
  savePendingAccountSetup(storage, 'alex@example.com', draft);
  discardPendingAccountSetup(storage, 'alex@example.com');
  assert.equal(storage.getItem(PENDING_ACCOUNT_SETUP_KEY), null);
  assert.ok(storage.getItem(ONBOARDING_STORAGE_KEY));
});
test('la entrega completada se consume una sola vez y elimina el borrador global', () => {
  const draft = { ...createOnboardingDraft('UTC'), preferredName: 'Alex' };
  const storage = removableStorage({
    [ONBOARDING_STORAGE_KEY]: JSON.stringify({ version: 1, step: 'resumen', draft }),
  });
  savePendingAccountSetup(storage, 'alex@example.com', draft);
  completePendingAccountSetup(storage, 'alex@example.com');
  assert.equal(storage.getItem(PENDING_ACCOUNT_SETUP_KEY), null);
  assert.equal(storage.getItem(ONBOARDING_STORAGE_KEY), null);
});
test('borradores inválidos o entregas vencidas no pueden crear el perfil', () => {
  const invalid = { ...createOnboardingDraft('UTC'), preferredName: '' };
  const storage = removableStorage();
  assert.throws(() => savePendingAccountSetup(storage, 'alex@example.com', invalid, 1000));
  const valid = { ...invalid, preferredName: 'Alex' };
  savePendingAccountSetup(storage, 'alex@example.com', valid, 1000);
  assert.equal(
    readPendingAccountSetup(storage, 'alex@example.com', 31 * 24 * 60 * 60 * 1000),
    null,
  );
  assert.ok(storage.getItem(PENDING_ACCOUNT_SETUP_KEY));
});
