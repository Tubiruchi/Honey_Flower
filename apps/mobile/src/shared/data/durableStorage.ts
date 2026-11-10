import type { LocalStoragePort } from './localRepository.ts';
import { LOCAL_SNAPSHOT_KEY, parseSnapshot } from './localSnapshot.ts';
import { parseReminderLog, REMINDER_LOG_KEY } from '../../features/reminders/model.ts';

export interface DurableKeyValue {
  read: (key: string) => Promise<{ found: boolean; value: string | null }>;
  write: (key: string, value: string | null) => Promise<void>;
}
const keys = [LOCAL_SNAPSHOT_KEY, REMINDER_LOG_KEY, 'honeyflower.water-attempt.v1'];
/** Native commit is authoritative; a WebView cache acknowledgement alone is not durable. */
export function durableStorage(
  native: DurableKeyValue,
  legacy: LocalStoragePort,
): LocalStoragePort {
  return {
    async getItem(key) {
      if (!keys.includes(key)) return legacy.getItem(key);
      const stored = await native.read(key);
      if (stored.found) {
        try {
          await legacy.setItem(key, stored.value ?? '');
        } catch {
          /* This is only a compatibility mirror. */
        }
        return stored.value;
      }
      const raw = await legacy.getItem(key);
      if (raw === null) return null;
      if (key === LOCAL_SNAPSHOT_KEY) {
        const snapshot = parseSnapshot(raw);
        if (!snapshot) return raw; // The repository reports corruption; never replace it with an empty profile.
        const normalized = JSON.stringify(snapshot);
        await native.write(key, normalized);
        return normalized;
      }
      if (key === REMINDER_LOG_KEY) {
        let entries;
        try {
          entries = parseReminderLog(raw);
        } catch {
          return raw;
        }
        const normalized = JSON.stringify({ version: 1, entries });
        await native.write(key, normalized);
        return normalized;
      }
      return raw; // The capture controller validates/updates an existing temporary attempt itself.
    },
    async setItem(key, value) {
      if (!keys.includes(key)) return legacy.setItem(key, value);
      await native.write(key, value);
      try {
        await legacy.setItem(key, value);
      } catch {
        /* Confirmed native writes remain confirmed. */
      }
    },
  };
}
