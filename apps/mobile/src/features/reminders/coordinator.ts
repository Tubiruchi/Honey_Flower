import { parseReminderLog, planReminders, REMINDER_LOG_KEY } from './model.ts';
import type { LocalState } from '../local/model.ts';
import type { LocalStoragePort } from '../../shared/data/localRepository.ts';
import type { ReminderDevice, NoticePermission } from '../../shared/native/reminders.ts';

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
  private serial: Promise<unknown> = Promise.resolve();
  private generation = 0;
  private lastSync = '';
  private lastPending = 0;
  constructor(port: ReminderDevice, storage: LocalStoragePort) {
    this.port = port;
    this.storage = storage;
  }
  reconcile(state: LocalState, now: number): Promise<ReminderStatus | null> {
    const generation = ++this.generation;
    const task = this.serial.then(async (): Promise<ReminderStatus | null> => {
      if (generation !== this.generation) return null;
      let permission: NoticePermission = 'unknown';
      try {
        if (!this.port.supported)
          return { permission: 'unsupported', pending: 0, busy: false, issue: '' };
        permission = await this.port.permission();
        if (generation !== this.generation) return null;
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
        const plan = planReminders(state, now, history);
        if (generation !== this.generation) return null;
        // Reserve before scheduling: an acknowledgement loss must never increase the daily maximum.
        const nextRaw = JSON.stringify({ version: 1, entries: plan.reservations });
        if (raw !== nextRaw) await this.storage.setItem(REMINDER_LOG_KEY, nextRaw);
        if (generation !== this.generation) return null;
        const sync = JSON.stringify({
          reminders: plan.reminders,
          zone: state.preferences.timeZone,
          quiet: state.preferences.quietPeriods,
          sound: state.preferences.reinforcedSound,
          cap: state.preferences.notificationCap,
        });
        if (this.lastSync !== sync) {
          this.lastPending = await this.port.replace(plan.reminders, state.preferences, true);
          this.lastSync = sync;
        }
        return { permission, pending: this.lastPending, busy: false, issue: '' };
      } catch {
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
    this.serial = task.catch(() => undefined);
    return task;
  }
}
