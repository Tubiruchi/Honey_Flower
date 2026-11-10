import { Capacitor } from '@capacitor/core';
import { guardedNativeReminders } from './reminders';
import { browserStorage } from '../data/localRepository';
import { durableStorage } from '../data/durableStorage';

export function deviceLocalStorage() {
  return Capacitor.getPlatform() === 'android'
    ? durableStorage(
        {
          read: (key) => guardedNativeReminders.readLocal({ key }),
          write: (key, value) => guardedNativeReminders.writeLocal({ key, value }),
        },
        browserStorage,
      )
    : browserStorage;
}
