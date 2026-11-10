import type { LocalStoragePort } from './localRepository.ts';

export function accountStorageKey(key: string, accountId?: string) {
  if (!accountId) return key;
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(accountId))
    throw new Error('Identificador de cuenta inválido.');
  return `honeyflower.account.${accountId}.${key}`;
}
/** Namespace all local keys, including legacy snapshots and onboarding drafts. No guest import. */
export function accountStorage(source: LocalStoragePort, accountId?: string): LocalStoragePort {
  return {
    getItem: (key) => source.getItem(accountStorageKey(key, accountId)),
    setItem: (key, value) => source.setItem(accountStorageKey(key, accountId), value),
  };
}
