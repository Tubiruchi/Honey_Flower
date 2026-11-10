import { Capacitor } from '@capacitor/core';
import { guardedNativeReminders } from './reminders';
import { browserStorage } from '../data/localRepository';
import { durableStorage } from '../data/durableStorage';
import { accountStorage, accountStorageKey } from '../data/accountStorage';

export function deviceLocalStorage(accountId?: string) {
  const scoped = (key: string) => accountStorageKey(key, accountId);
  const cache = accountStorage(browserStorage, accountId);
  return Capacitor.getPlatform() === 'android'
    ? durableStorage(
        {
          read: (key) => guardedNativeReminders.readLocal({ key: scoped(key) }),
          write: (key, value) => guardedNativeReminders.writeLocal({ key: scoped(key), value }),
        },
        cache,
      )
    : cache;
}
