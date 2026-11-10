import { Capacitor, registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { PluginListenerHandle } from '@capacitor/core';
import type { OnboardingDraft } from '../../features/onboarding/model';
import type { Reminder } from '../../features/reminders/model';

export type NoticePermission = 'granted' | 'denied' | 'prompt' | 'unsupported' | 'unknown';
export interface ReminderDevice {
  supported: boolean;
  exactStatus?: () => Promise<{ granted: boolean }>;
  requestExactDelivery?: () => Promise<void>;
  permission: () => Promise<NoticePermission>;
  requestPermission: () => Promise<NoticePermission>;
  replace: (
    reminders: Reminder[],
    preferences: OnboardingDraft,
    enabled: boolean,
  ) => Promise<number>;
  flashStatus: () => Promise<{ available: boolean; granted: boolean }>;
  authorizeFlash: () => Promise<{ available: boolean; granted: boolean }>;
  pulse: () => Promise<void>;
  stopFlash: () => Promise<void>;
  listen: (
    received: (reminder: Reminder) => void,
    opened: (route: string) => void,
  ) => Promise<() => void>;
}
interface GuardedPlugin {
  exactStatus: () => Promise<{ granted: boolean }>;
  requestExactDelivery: () => Promise<void>;
  readLocal: (options: { key: string }) => Promise<{ found: boolean; value: string | null }>;
  writeLocal: (options: { key: string; value: string | null }) => Promise<void>;
  replace: (options: {
    reminders: Reminder[];
    enabled: boolean;
    timeZone: string;
    quiet: OnboardingDraft['quietPeriods'];
    sound: boolean;
    cap: number;
  }) => Promise<{ pending: number }>;
  flashStatus: ReminderDevice['flashStatus'];
  authorizeFlash: ReminderDevice['authorizeFlash'];
  pulse: ReminderDevice['pulse'];
  stopFlash: ReminderDevice['stopFlash'];
  launchRoute: () => Promise<{ route: string }>;
  addListener: {
    (event: 'received', callback: (notice: Reminder) => void): Promise<PluginListenerHandle>;
    (event: 'opened', callback: (event: { route: string }) => void): Promise<PluginListenerHandle>;
  };
}
const guarded = registerPlugin<GuardedPlugin>('GuardedReminders');
export const guardedNativeReminders = guarded;
const permission = (value: string): NoticePermission =>
  value === 'granted'
    ? 'granted'
    : value === 'denied' || value === 'prompt-with-rationale'
      ? 'denied'
      : 'prompt';
const unavailable = async () => ({ available: false, granted: false });
export const browserReminders: ReminderDevice = {
  supported: false,
  permission: async () => 'unsupported',
  requestPermission: async () => 'unsupported',
  replace: async () => 0,
  flashStatus: unavailable,
  authorizeFlash: unavailable,
  pulse: async () => {},
  stopFlash: async () => {},
  listen: async () => () => {},
};
const androidReminders: ReminderDevice = {
  supported: true,
  exactStatus: () => guarded.exactStatus(),
  requestExactDelivery: () => guarded.requestExactDelivery(),
  permission: async () => permission((await LocalNotifications.checkPermissions()).display),
  requestPermission: async () =>
    permission((await LocalNotifications.requestPermissions()).display),
  replace: async (reminders, preferences, enabled) =>
    (
      await guarded.replace({
        reminders,
        enabled,
        timeZone: preferences.timeZone,
        quiet: preferences.quietPeriods,
        sound: preferences.reinforcedSound,
        cap: preferences.notificationCap,
      })
    ).pending,
  flashStatus: () => guarded.flashStatus(),
  authorizeFlash: () => guarded.authorizeFlash(),
  pulse: () => guarded.pulse(),
  stopFlash: () => guarded.stopFlash(),
  listen: async (received, opened) => {
    const first = await guarded.addListener('received', received);
    let second: PluginListenerHandle;
    try {
      second = await guarded.addListener('opened', ({ route }) => opened(route));
    } catch (error) {
      await first.remove();
      throw error;
    }
    try {
      const launch = await guarded.launchRoute();
      if (launch.route) opened(launch.route);
    } catch (error) {
      await Promise.allSettled([first.remove(), second.remove()]);
      throw error;
    }
    return () => {
      void first.remove().catch(() => {});
      void second.remove().catch(() => {});
    };
  },
};
export function deviceReminders(): ReminderDevice {
  return Capacitor.getPlatform() === 'android' ? androidReminders : browserReminders;
}
