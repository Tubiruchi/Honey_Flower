import {
  firstInvalidStep,
  ONBOARDING_STORAGE_KEY,
  readOnboardingSnapshot,
} from '../onboarding/model.ts';
import type { OnboardingDraft } from '../onboarding/model.ts';
import { validateReminderPreferences } from '../reminders/preferences.ts';

export const PENDING_ACCOUNT_SETUP_KEY = 'honeyflower.auth.pending-setup.v1';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

interface SetupStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface PendingAccountSetup {
  version: 1;
  email: string;
  draft: OnboardingDraft;
  createdAt: number;
}

const normalizedEmail = (email: string) => email.trim().toLowerCase();

/** Accept only a complete, sanitized onboarding draft before it can cross into an account. */
export function completedOnboardingDraft(value: unknown): OnboardingDraft | null {
  const snapshot = readOnboardingSnapshot({
    getItem: () => JSON.stringify({ version: 1, step: 'resumen', draft: value }),
  });
  if (!snapshot || firstInvalidStep(snapshot.draft) || validateReminderPreferences(snapshot.draft))
    return null;
  return snapshot.draft;
}

export function readCompletedOnboardingDraft(storage: Pick<SetupStorage, 'getItem'>) {
  const snapshot = readOnboardingSnapshot(storage);
  return snapshot?.step === 'resumen' ? completedOnboardingDraft(snapshot.draft) : null;
}

export function savePendingAccountSetup(
  storage: SetupStorage,
  email: string,
  value: unknown,
  createdAt = Date.now(),
) {
  const draft = completedOnboardingDraft(value);
  if (!draft) throw new Error('La configuración del onboarding no está completa.');
  const pending: PendingAccountSetup = {
    version: 1,
    email: normalizedEmail(email),
    draft,
    createdAt,
  };
  storage.setItem(PENDING_ACCOUNT_SETUP_KEY, JSON.stringify(pending));
  return pending;
}

export function readPendingAccountSetup(
  storage: Pick<SetupStorage, 'getItem' | 'removeItem'>,
  email?: string,
  now = Date.now(),
): PendingAccountSetup | null {
  const raw = storage.getItem(PENDING_ACCOUNT_SETUP_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const pending = parsed as Partial<PendingAccountSetup>;
    const draft = completedOnboardingDraft(pending.draft);
    if (
      pending.version !== 1 ||
      typeof pending.email !== 'string' ||
      pending.email !== normalizedEmail(pending.email) ||
      typeof pending.createdAt !== 'number' ||
      !Number.isFinite(pending.createdAt) ||
      !draft
    )
      return null;
    if (now - pending.createdAt > MAX_AGE_MS || pending.createdAt > now + 60_000) return null;
    if (email && pending.email !== normalizedEmail(email)) return null;
    return { version: 1, email: pending.email, draft, createdAt: pending.createdAt };
  } catch {
    return null;
  }
}

/** Use after a failed signup; the completed onboarding remains available for retrying. */
export function discardPendingAccountSetup(storage: SetupStorage, email: string) {
  if (readPendingAccountSetup(storage, email)) storage.removeItem(PENDING_ACCOUNT_SETUP_KEY);
}

/** Use only after the account-scoped profile has been durably created. */
export function completePendingAccountSetup(storage: SetupStorage, email: string) {
  if (!readPendingAccountSetup(storage, email)) return;
  storage.removeItem(PENDING_ACCOUNT_SETUP_KEY);
  storage.removeItem(ONBOARDING_STORAGE_KEY);
}
