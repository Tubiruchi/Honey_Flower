import type { LocalState } from '../local/model.ts';
import { planReminders } from './model.ts';
import type { Reminder, Reservation } from './model.ts';
import { inQuietTime } from './preferences.ts';

/** Local foreground simulation; no habit writes, permission prompt or overdue replay. */
export class ForegroundReminders {
  private previous: number | null = null;
  private active = false;
  private history: Reservation[] = [];
  private delivered = new Set<string>();

  tick(state: LocalState, now: number, visible: boolean): Reminder[] {
    const previous = this.previous;
    const wasActive = this.active;
    this.previous = now;
    this.active = visible && state.preferences.notifications;
    if (!this.active || !wasActive || previous === null || now <= previous) return [];
    const plan = planReminders(state, previous, this.history);
    this.history = plan.reservations;
    // A suspended WebView must not dump old messages on returning to the app.
    if (now - previous > 60_000) return [];
    const time = new Intl.DateTimeFormat('en-GB', {
      timeZone: state.preferences.timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(now);
    if (inQuietTime(time, state.preferences.quietPeriods)) return [];
    return plan.reminders.filter((r) => {
      if (r.at > now || r.expiresAt <= now || this.delivered.has(r.key)) return false;
      this.delivered.add(r.key);
      return true;
    });
  }
}
