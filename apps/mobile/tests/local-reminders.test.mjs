import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createLocalState,
  DAY_MS,
  WEEK_MS,
  parseLocalState,
  updatePreferences,
} from '../src/features/local/model.ts';
import { createOnboardingDraft } from '../src/features/onboarding/model.ts';
import { inQuietTime, validateReminderPreferences } from '../src/features/reminders/preferences.ts';
import {
  planReminders,
  parseReminderLog,
  REMINDER_LOG_KEY,
} from '../src/features/reminders/model.ts';
import { ReminderCoordinator } from '../src/features/reminders/coordinator.ts';
import { upgradeWaterSchedule } from '../src/features/reminders/schema.ts';
import { sunscreenWindows } from '../src/features/sunscreen/model.ts';
import { memoryStorage, LocalRepository } from '../src/shared/data/localRepository.ts';
import { createSnapshot, LOCAL_SNAPSHOT_KEY } from '../src/shared/data/localSnapshot.ts';

const H = 3600000,
  M = 60000,
  start = Date.UTC(2026, 10, 8),
  now = start + H;
const fresh = () =>
  createLocalState(start, {
    ...createOnboardingDraft('UTC'),
    preferredName: 'Alex',
    waterTimes: ['08:00', '11:00', '14:00', '17:00'],
    sunscreenTimes: ['08:00', '11:00', '14:00'],
  });
function fixture(seed = {}) {
  const storage = memoryStorage(seed);
  const calls = [];
  const faults = { permission: 'granted', schedule: false, request: 0, stop: 0 };
  const port = {
    supported: true,
    permission: async () => faults.permission,
    requestPermission: async () => {
      faults.request++;
      return faults.permission;
    },
    replace: async (reminders, preferences, enabled) => {
      calls.push({
        reminders: structuredClone(reminders),
        preferences: structuredClone(preferences),
        enabled,
      });
      if (enabled && faults.schedule) throw new Error('native');
      return enabled ? reminders.length : 0;
    },
    stopFlash: async () => {
      faults.stop++;
    },
    flashStatus: async () => ({ available: false, granted: false }),
    authorizeFlash: async () => ({ available: false, granted: false }),
    pulse: async () => {},
    listen: async () => () => {},
  };
  return { storage, port, calls, faults, coordinator: new ReminderCoordinator(port, storage) };
}

test('calma cruzando medianoche respeta inicio incluido y fin excluido', () => {
  const periods = [{ from: '22:00', to: '07:00' }];
  assert.equal(inQuietTime('21:59', periods), false);
  assert.equal(inQuietTime('22:00', periods), true);
  assert.equal(inQuietTime('00:01', periods), true);
  assert.equal(inQuietTime('06:59', periods), true);
  assert.equal(inQuietTime('07:00', periods), false);
});
test('bloquea todas las citas en calma, periodos superpuestos y máximos inválidos', () => {
  const draft = fresh().preferences;
  assert.match(
    validateReminderPreferences({ ...draft, quietPeriods: [{ from: '07:00', to: '22:00' }] }),
    /Todas tus citas/,
  );
  assert.match(
    validateReminderPreferences({
      ...draft,
      quietPeriods: [
        { from: '22:00', to: '07:00' },
        { from: '23:00', to: '01:00' },
      ],
    }),
    /superponen/,
  );
  for (const cap of [0, 25, 1.5, NaN])
    assert.match(validateReminderPreferences({ ...draft, notificationCap: cap }), /máximo/);
  assert.equal(
    validateReminderPreferences({
      ...draft,
      notifications: false,
      quietPeriods: [{ from: '07:00', to: '22:00' }],
    }),
    null,
  );
});
test('los perfiles heredados siguen legibles aunque necesiten corregir la calma antes de guardar', () => {
  const state = fresh();
  state.preferences.quietPeriods = [{ from: '07:00', to: '22:00' }];
  assert.ok(parseLocalState(JSON.stringify(state)));
  assert.throws(() => updatePreferences(state, state.preferences, now), /Todas tus citas/);
});
test('un único máximo por día de planta cubre ambos hábitos y los contextos', () => {
  const state = fresh(),
    { reminders } = planReminders(state, now);
  const counts = new Map();
  reminders.forEach((r) => counts.set(r.dayStart, (counts.get(r.dayStart) ?? 0) + 1));
  assert.equal(counts.size, 7);
  assert.ok([...counts.values()].every((count) => count <= 6));
  const today = reminders.filter((r) => r.dayStart === start);
  assert.equal(today.length, 6);
  assert.ok(today.some((r) => r.kind === 'water'));
  assert.ok(today.some((r) => r.key.endsWith(':context')));
  assert.equal(new Set(reminders.map((r) => r.id)).size, reminders.length);
  assert.ok(reminders.every((r) => r.at > now && r.at < start + WEEK_MS));
});
test('las citas de protector reciben apertura/contexto dentro de su ventana, nunca después del cierre', () => {
  const state = fresh();
  state.preferences.notificationCap = 24;
  const reminders = planReminders(state, now).reminders;
  const window = sunscreenWindows(state, 0)[0];
  const notices = reminders.filter((r) => r.key.startsWith(window.id + ':'));
  assert.deepEqual(
    notices.map((r) => r.at),
    [window.opensAt, window.contextAt],
  );
  assert.ok(notices.every((r) => r.expiresAt === window.closesAt));
  assert.ok(
    planReminders(state, start + 9 * H).reminders.every((r) => !r.key.startsWith(window.id + ':')),
  );
});
test('registrar una cita retira su contexto y completar agua retira sus avisos restantes', () => {
  const state = fresh(),
    window = sunscreenWindows(state, 0)[0];
  state.preferences.notificationCap = 24;
  state.events = [
    {
      id: 'sun',
      kind: 'sunscreen',
      amount: 1,
      at: start + 8 * H + M,
      appointment: window.appointment,
    },
    { id: 'water', kind: 'water', amount: 2000, at: start + 8 * H + M },
  ];
  const reminders = planReminders(state, start + 8 * H + 2 * M).reminders.filter(
    (r) => r.dayStart === start,
  );
  assert.ok(reminders.every((r) => r.kind !== 'water' && !r.key.startsWith(window.id + ':')));
  assert.ok(reminders.some((r) => r.kind === 'sunscreen'));
});
test('protector heredado completo no fabrica citas ni nuevos avisos', () => {
  const state = fresh();
  state.events = [0, 1, 2].map((i) => ({
    id: `legacy${i}`,
    kind: 'sunscreen',
    amount: 1,
    at: start + 8 * H + i,
  }));
  const plan = planReminders(state, start + 9 * H);
  assert.ok(plan.reminders.filter((r) => r.dayStart === start).every((r) => r.kind === 'water'));
  assert.ok(state.events.every((e) => !e.appointment));
});
test('normal/insistente/reforzado se recalcula por hábito y no se acumula al siguiente día', () => {
  const state = fresh();
  state.preferences.notificationCap = 24;
  state.preferences.reinforcedSound = true;
  const plan = planReminders(state, now).reminders;
  const water = plan.filter((r) => r.kind === 'water' && r.dayStart === start);
  assert.deepEqual(
    water.map((r) => r.level),
    ['normal', 'insistent', 'reinforced', 'reinforced'],
  );
  assert.deepEqual(
    water.map((r) => r.sound),
    [false, false, true, true],
  );
  assert.equal(
    plan.find((r) => r.kind === 'water' && r.dayStart === start + DAY_MS).level,
    'normal',
  );
  const sunContext = plan.find((r) => r.key.endsWith(':context') && r.at === start + 8.5 * H);
  assert.equal(sunContext.level, 'normal');
  assert.equal(sunContext.sound, false);
});
test('un registro en la franja anterior reduce la escalada del agua', () => {
  const state = fresh();
  state.preferences.notificationCap = 24;
  state.events.push({ id: 'partial', kind: 'water', amount: 250, at: start + 8.5 * H });
  const water = planReminders(state, start + 9 * H).reminders.filter(
    (r) => r.kind === 'water' && r.dayStart === start,
  );
  assert.equal(water[0].level, 'normal');
  assert.equal(water[1].level, 'insistent');
});
test('sonido y linterna conservan cuatro combinaciones y apagado domina sin borrar la selección', () => {
  for (const reinforcedSound of [false, true])
    for (const foregroundFlash of [false, true]) {
      const state = fresh();
      const original = structuredClone(state);
      const off = updatePreferences(
        state,
        { ...state.preferences, notifications: false, reinforcedSound, foregroundFlash },
        now,
      );
      assert.equal(off.preferences.reinforcedSound, reinforcedSound);
      assert.equal(off.preferences.foregroundFlash, foregroundFlash);
      assert.equal(planReminders(off, now).reminders.length, 0);
      assert.deepEqual(off.events, original.events);
      assert.deepEqual(off.goals, original.goals);
    }
});
test('guardar horarios conserva hoy y cambia agua/protector a partir del día siguiente', () => {
  const state = fresh();
  const original = planReminders(state, now).reminders.filter((r) => r.dayStart === start);
  const next = updatePreferences(
    state,
    { ...state.preferences, waterTimes: ['09:00'], sunscreenTimes: ['09:00', '12:00', '16:00'] },
    now,
  );
  assert.deepEqual(
    planReminders(next, now).reminders.filter((r) => r.dayStart === start),
    original,
  );
  const tomorrow = planReminders(next, start + DAY_MS + H).reminders.filter(
    (r) => r.dayStart === start + DAY_MS,
  );
  assert.equal(tomorrow.filter((r) => r.kind === 'water').length, 1);
  assert.equal(tomorrow.find((r) => r.kind === 'water').at, start + DAY_MS + 9 * H);
  assert.deepEqual(parseLocalState(JSON.stringify(next)).waterSchedule, next.waterSchedule);
});
test('la migración de agua conserva eventos, agenda de protector y recibos; es idempotente', async () => {
  const state = fresh();
  delete state.waterSchedule;
  const raw = JSON.stringify(createSnapshot(state));
  const storage = memoryStorage({ [LOCAL_SNAPSHOT_KEY]: raw });
  const repo = new LocalRepository({ storage, clock: { now: () => now } });
  await repo.initialize();
  const snapshot = repo.getSnapshot().snapshot;
  assert.ok(snapshot.state.waterSchedule);
  assert.deepEqual(snapshot.state.events, state.events);
  assert.deepEqual(snapshot.state.sunscreenSchedule, state.sunscreenSchedule);
  assert.equal(upgradeWaterSchedule(snapshot.state, 0), snapshot.state);
  await repo.refresh();
  assert.equal(repo.getSnapshot().snapshot.revision, snapshot.revision);
});
test('el máximo conserva reservas pasadas al reabrir o cambiar horarios, sin repetir IDs', () => {
  const state = fresh(),
    first = planReminders(state, now);
  const later = start + 12 * H;
  const past = first.reservations.filter((r) => r.at <= later && r.dayStart === start);
  assert.equal(past.length, 6);
  const changed = updatePreferences(state, { ...state.preferences, quietPeriods: [] }, later);
  const plan = planReminders(changed, later, first.reservations);
  assert.equal(plan.reminders.filter((r) => r.dayStart === start).length, 0);
  assert.ok(plan.reminders.every((r) => !past.some((p) => p.id === r.id)));
});
test('agenda dañada o IDs repetidos se rechazan en vez de fingir una agenda vacía', () => {
  assert.throws(() => parseReminderLog('{'));
  const entry = planReminders(fresh(), now).reservations[0];
  assert.throws(() => parseReminderLog(JSON.stringify({ version: 1, entries: [entry, entry] })));
  assert.throws(() =>
    parseReminderLog(JSON.stringify({ version: 1, entries: [{ ...entry, id: 1 }] })),
  );
});
test('sin permiso no programa ni solicita autorización automáticamente', async () => {
  const f = fixture();
  f.faults.permission = 'denied';
  const status = await f.coordinator.reconcile(fresh(), now);
  assert.equal(status.permission, 'denied');
  assert.equal(status.pending, 0);
  assert.equal(f.faults.request, 0);
  assert.ok(f.calls.every((c) => !c.enabled));
});
test('web no pide permisos del sistema ni escribe la agenda nativa', async () => {
  const f = fixture();
  f.port.supported = false;
  const status = await f.coordinator.reconcile(fresh(), now);
  assert.equal(status.permission, 'unsupported');
  assert.equal(f.calls.length, 0);
  assert.equal(await f.storage.getItem(REMINDER_LOG_KEY), null);
});
test('revisar la misma agenda no vuelve a programar todos los avisos', async () => {
  const f = fixture();
  const state = fresh();
  const first = await f.coordinator.reconcile(state, now);
  await f.coordinator.reconcile(state, now + 1000);
  assert.ok(first.pending > 0);
  assert.equal(f.calls.filter((c) => c.enabled).length, 1);
});
test('un fallo nativo cancela, muestra error y reintentar vuelve a programar', async () => {
  const f = fixture();
  const state = fresh();
  await f.coordinator.reconcile(state, now);
  const edited = { ...state, preferences: { ...state.preferences, tone: 'intense' } };
  f.faults.schedule = true;
  assert.match((await f.coordinator.reconcile(edited, now)).issue, /confirmar/);
  assert.equal(f.calls.at(-1).enabled, false);
  f.faults.schedule = false;
  const recovered = await f.coordinator.reconcile(edited, now);
  assert.equal(recovered.issue, '');
  assert.ok(recovered.pending > 0);
  assert.equal(f.calls.at(-1).enabled, true);
});

test('cambiar solo el máximo actualiza también el límite del receptor Android', async () => {
  const f = fixture();
  const state = fresh();
  state.preferences.notificationCap = 23;
  await f.coordinator.reconcile(state, now);
  const next = structuredClone(state);
  next.preferences.notificationCap = 24;
  await f.coordinator.reconcile(next, now);
  assert.deepEqual(f.calls[0].reminders, f.calls[1].reminders);
  assert.equal(f.calls.at(-1).preferences.notificationCap, 24);
});
test('un fallo del registro de reservas cancela sin pisar sus bytes ni el perfil confirmado', async () => {
  const f = fixture({ [REMINDER_LOG_KEY]: '{broken' });
  const state = fresh(),
    original = structuredClone(state);
  assert.match((await f.coordinator.reconcile(state, now)).issue, /confirmar/);
  assert.equal(await f.storage.getItem(REMINDER_LOG_KEY), '{broken');
  assert.deepEqual(state, original);
  assert.equal(f.calls.at(-1).enabled, false);
});
test('apagar cancela inmediatamente la agenda y elimina reservas futuras, sin reiniciar el consumo pasado', async () => {
  const f = fixture(),
    state = fresh();
  await f.coordinator.reconcile(state, now);
  const later = start + 9 * H;
  const off = { ...state, preferences: { ...state.preferences, notifications: false } };
  const status = await f.coordinator.reconcile(off, later);
  assert.equal(status.pending, 0);
  assert.equal(f.calls.at(-1).enabled, false);
  assert.ok(f.faults.stop);
  const history = parseReminderLog(await f.storage.getItem(REMINDER_LOG_KEY));
  assert.ok(history.length > 0);
  assert.ok(history.every((e) => e.at <= later));
});
test('la última preferencia domina operaciones de agenda encoladas', async () => {
  const f = fixture(),
    state = fresh();
  const on = f.coordinator.reconcile(state, now);
  const off = f.coordinator.reconcile(
    { ...state, preferences: { ...state.preferences, notifications: false } },
    now,
  );
  assert.equal(await on, null);
  assert.equal((await off).pending, 0);
  assert.ok(f.calls.every((c) => !c.enabled));
});

test('la señal de linterna requiere opt-in, nivel reforzado, primer plano y movimiento no reducido', async () => {
  const { foregroundFlashAllowed } = await import('../src/features/reminders/preferences.ts');
  const draft = { ...fresh().preferences, foregroundFlash: true };
  assert.equal(foregroundFlashAllowed(draft, 'reinforced', true, false), true);
  assert.equal(foregroundFlashAllowed(draft, 'normal', true, false), false);
  assert.equal(foregroundFlashAllowed(draft, 'insistent', true, false), false);
  assert.equal(foregroundFlashAllowed(draft, 'reinforced', false, false), false);
  assert.equal(foregroundFlashAllowed(draft, 'reinforced', true, true), false);
  assert.equal(
    foregroundFlashAllowed({ ...draft, notifications: false }, 'reinforced', true, false),
    false,
  );
});
