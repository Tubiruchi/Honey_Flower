import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createOnboardingDraft,
  firstInvalidStep,
  readOnboardingSnapshot,
  setReapplications,
  toOnboardingPreferences,
  validateOnboardingStep,
} from '../src/features/onboarding/model.ts';

const validDraft = () => ({ ...createOnboardingDraft('America/Cancun'), preferredName: 'María' });

test('ignora borradores corruptos o de una versión desconocida', () => {
  for (const raw of ['{', 'null', '{"version":2}', '{"version":1,"step":"resumen","draft":{}}']) {
    assert.equal(readOnboardingSnapshot({ getItem: () => raw }), null);
  }
});

test('restaura el borrador sin incorporar datos ajenos al contrato', () => {
  const raw = JSON.stringify({
    version: 1,
    step: 'agua',
    draft: { ...validDraft(), token: 'no-debe-restaurarse' },
  });
  const snapshot = readOnboardingSnapshot({ getItem: () => raw });
  assert.equal(snapshot.step, 'agua');
  assert.equal(snapshot.draft.preferredName, 'María');
  assert.equal('token' in snapshot.draft, false);
});

test('acepta cero reaplicaciones y conserva solo la aplicación inicial', () => {
  const draft = setReapplications(validDraft(), 0);
  assert.deepEqual(draft.sunscreenTimes, ['07:00']);
  assert.equal(validateOnboardingStep('protector', draft), null);
  assert.equal(validateOnboardingStep('horarios', draft), null);
  const expanded = setReapplications(draft, 4);
  assert.equal(expanded.sunscreenTimes.length, 5);
  assert.equal(new Set(expanded.sunscreenTimes).size, 5);
});

test('valida cantidades enteras sin aceptar vacío, cero, decimales o notación exponencial', () => {
  for (const value of ['', '0', '249', '250.5', '1e3', '10001', '-100']) {
    assert.ok(validateOnboardingStep('agua', { ...validDraft(), waterGoalMl: value }));
  }
  for (const value of ['250', '2000', '10000'])
    assert.equal(validateOnboardingStep('agua', { ...validDraft(), waterGoalMl: value }), null);
});

test('la calma puede cruzar medianoche, pero no superponerse ni durar cero horas', () => {
  assert.equal(validateOnboardingStep('avisos', validDraft()), null);
  assert.ok(
    validateOnboardingStep('avisos', {
      ...validDraft(),
      quietPeriods: [{ from: '22:00', to: '22:00' }],
    }),
  );
  assert.ok(
    validateOnboardingStep('avisos', {
      ...validDraft(),
      quietPeriods: [
        { from: '22:00', to: '07:00' },
        { from: '06:00', to: '08:00' },
      ],
    }),
  );
  assert.equal(
    validateOnboardingStep('avisos', {
      ...validDraft(),
      quietPeriods: [
        { from: '22:00', to: '07:00' },
        { from: '13:00', to: '14:00' },
      ],
    }),
    null,
  );
});

test('rechaza horarios repetidos dentro del mismo hábito, no entre hábitos', () => {
  assert.ok(
    validateOnboardingStep('horarios', { ...validDraft(), waterTimes: ['08:00', '08:00'] }),
  );
  assert.equal(
    validateOnboardingStep('horarios', { ...validDraft(), waterTimes: ['07:00'] }),
    null,
  );
});

test('apagar avisos anula señales adicionales sin crear campos de cuenta ni ciclo', () => {
  const draft = {
    ...validDraft(),
    notifications: false,
    reinforcedSound: true,
    foregroundFlash: true,
  };
  const preferences = toOnboardingPreferences(draft);
  assert.equal(preferences.foregroundFlash, false);
  assert.equal(preferences.reinforcedSound, false);
  assert.equal(preferences.waterGoalMl, 2000);
  assert.equal(draft.foregroundFlash, true);
  assert.equal('cycleStartedAt' in preferences, false);
  assert.equal('userId' in preferences, false);
});

test('el resumen no entrega preferencias mientras haya un paso inválido', () => {
  const draft = createOnboardingDraft('America/Cancun');
  assert.equal(firstInvalidStep(draft), 'nombre');
  assert.throws(() => toOnboardingPreferences(draft));
});
