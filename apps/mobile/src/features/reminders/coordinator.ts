import { parseReminderLog, planRemindersForDelivery, REMINDER_LOG_KEY } from './model.ts';
import type { LocalState } from '../local/model.ts';
import type { LocalStoragePort } from '../../shared/data/localRepository.ts';
import type { ReminderDevice, NoticePermission } from '../../shared/native/reminders.ts';
import type { OnboardingDraft } from '../onboarding/model.ts';

interface DeliveryQueue {
  serial: Promise<unknown>;
  owner: symbol | null;
}
const deviceQueues = new WeakMap<ReminderDevice, DeliveryQueue>();
function queueFor(port: ReminderDevice) {
  let queue = deviceQueues.get(port);
  if (!queue) {
    queue = { serial: Promise.resolve(), owner: null };
    deviceQueues.set(port, queue);
  }
  return queue;
}
/** A late agenda from a previous account must never replace the new account's agenda. */
export function clearAccountReminders(port: ReminderDevice, preferences: OnboardingDraft) {
  const queue = queueFor(port);
  queue.owner = null;
  const task = queue.serial.then(async () => {
    await port.replace([], preferences, false);
    await port.stopFlash();
  });
  queue.serial = task.catch(() => undefined);
  return task;
}

export interface ReminderStatus {
  permission: NoticePermission;
  pending: number;
  issue: string;
  busy: boolean;
}
/** Native scheduling and its conservative delivery budget are separate from confirmed habit data. */
export class ReminderCoordinator {
  private port: ReminderDevice;
  private storage: LocalStoragePort;
  private queue: DeliveryQueue;
  private owner = Symbol('reminder account');
  private active = false;
  private generation = 0;
  private lastSync = '';
  private lastPending = 0;
  constructor(port: ReminderDevice, storage: LocalStoragePort) {
    this.port = port;
    this.storage = storage;
    this.queue = queueFor(port);
  }
  reconcile(state: LocalState, now: number): Promise<ReminderStatus | null> {
    if (!this.active) {
      this.active = true;
      this.queue.owner = this.owner;
    }
    if (this.queue.owner !== this.owner) return Promise.resolve(null);
    const generation = ++this.generation;
    const current = () => generation === this.generation && this.queue.owner === this.owner;
    const task = this.queue.serial.then(async (): Promise<ReminderStatus | null> => {
      if (!current()) return null;
      let permission: NoticePermission = 'unknown';
      try {
        if (!this.port.supported)
          return { permission: 'unsupported', pending: 0, busy: false, issue: '' };
        permission = await this.port.permission();
        if (!current()) return null;
        if (!state.preferences.notifications || permission !== 'granted') {
          await this.port.replace([], state.preferences, false);
          await this.port.stopFlash();
          this.lastSync = '';
          const raw = await this.storage.getItem(REMINDER_LOG_KEY);
          if (raw)
            await this.storage.setItem(
              REMINDER_LOG_KEY,
              JSON.stringify({
                version: 1,
                entries: parseReminderLog(raw).filter(
                  (e) => e.at <= now && e.at > now - 32 * 86_400_000,
                ),
              }),
            );
          return { permission, pending: 0, busy: false, issue: '' };
        }
        const raw = await this.storage.getItem(REMINDER_LOG_KEY);
        const history = parseReminderLog(raw);
        const plan = planRemindersForDelivery(state, now, history);
        if (!current()) return null;
        // Reserve before scheduling: an acknowledgement loss must never increase the daily maximum.
        const nextRaw = JSON.stringify({ version: 1, entries: plan.reservations });
        if (raw !== nextRaw) await this.storage.setItem(REMINDER_LOG_KEY, nextRaw);
        if (!current()) return null;
        const sync = JSON.stringify({
          exact: (await this.port.exactStatus?.())?.granted,
          reminders: plan.reminders,
          zone: state.preferences.timeZone,
          quiet: state.preferences.quietPeriods,
          sound: state.preferences.reinforcedSound,
          cap: state.preferences.notificationCap,
        });
        if (!current()) return null;
        if (this.lastSync !== sync) {
          this.lastPending = await this.port.replace(plan.reminders, state.preferences, true);
          this.lastSync = sync;
        }
        return { permission, pending: this.lastPending, busy: false, issue: '' };
      } catch {
        if (!current()) return null;
        this.lastSync = '';
        this.lastPending = 0;
        try {
          await this.port.replace([], state.preferences, false);
          await this.port.stopFlash();
        } catch {
          /* Keep an honest error until retry. */
        }
        return {
          permission,
          pending: 0,
          busy: false,
          issue:
            'No pudimos confirmar la agenda del teléfono. Tus registros y preferencias guardados se conservan. Reintenta.',
        };
      }
    });
    this.queue.serial = task.catch(() => undefined);
    return task;
  }
}
