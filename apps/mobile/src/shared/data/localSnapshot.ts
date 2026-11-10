import { parseLocalState } from '../../features/local/model.ts';
import type { HabitEvent, LocalState } from '../../features/local/model.ts';
import type { OnboardingDraft } from '../../features/onboarding/model.ts';
import { validWaterVerification } from '../../features/water/verification.ts';
import type { WaterVerification } from '../../features/water/verification.ts';
import { validAppointment } from '../../features/sunscreen/schema.ts';
import type { SunscreenAppointment } from '../../features/sunscreen/schema.ts';
import { validSunscreenAssignments } from '../../features/sunscreen/model.ts';
export const LOCAL_SNAPSHOT_KEY = 'honeyflower.local.v2';
export interface EventVersion {
  id: string;
  revision: number;
  legacy: boolean;
}
interface CommandBase {
  id: string;
  createdAt: number;
}
export type LocalCommand = CommandBase &
  (
    | { type: 'start'; species: 'sprout' | 'cactus'; draft?: OnboardingDraft }
    | {
        type: 'record';
        eventId: string;
        kind: 'water' | 'sunscreen';
        amount: number;
        dayStart: number;
        verification?: WaterVerification;
        appointment?: SunscreenAppointment;
      }
    | { type: 'edit'; eventId: string; amount: number; expectedRevision: number; dayStart: number }
    | { type: 'remove'; eventId: string; expectedRevision: number; dayStart: number }
    | { type: 'undo'; targetOperationId: string; expectedRevision: number; dayStart: number }
    | { type: 'preferences'; draft: OnboardingDraft; expectedRevision: number }
  );
export interface OperationReceipt {
  command: LocalCommand;
  committedAt: number;
  before?: HabitEvent | null;
  after?: HabitEvent | null;
  eventRevision?: number;
}
export interface LocalSnapshot {
  version: 2;
  revision: number;
  preferencesRevision: number;
  state: LocalState;
  eventVersions: EventVersion[];
  operations: OperationReceipt[];
}
export type OperationResult =
  | { status: 'confirmed'; operationId: string; receipt: OperationReceipt; replayed: boolean }
  | {
      status: 'failed';
      operationId: string;
      reason:
        | 'write'
        | 'read'
        | 'validation'
        | 'conflict'
        | 'expired'
        | 'pending'
        | 'discarded'
        | 'capture-required';
      message: string;
      retryable: boolean;
    };

export function confirmed(result: OperationResult) {
  if (result.status !== 'confirmed') throw new Error(result.message);
  return result;
}
export function createSnapshot(state: LocalState, legacy = true): LocalSnapshot {
  return {
    version: 2,
    revision: 1,
    preferencesRevision: 1,
    state: structuredClone(state),
    eventVersions: state.events.map((e) => ({ id: e.id, revision: 1, legacy })),
    operations: [],
  };
}
const integer = (n: unknown) => Number.isSafeInteger(n) && Number(n) >= 1;
const time = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0;
const id = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
export function commandFingerprint(command: unknown): string {
  const canonical = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(canonical);
    if (v && typeof v === 'object')
      return Object.fromEntries(
        Object.entries(v)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, value]) => [k, canonical(value)]),
      );
    return v;
  };
  return JSON.stringify(canonical(command));
}
export function validCommand(c: LocalCommand): boolean {
  if (!c || !id(c.id) || !time(c.createdAt)) return false;
  switch (c.type) {
    case 'start':
      return ['sprout', 'cactus'].includes(c.species) && (!c.draft || validPreferences(c.draft));
    case 'record':
      return (
        Object.keys(c).every((key) =>
          [
            'id',
            'createdAt',
            'type',
            'eventId',
            'kind',
            'amount',
            'dayStart',
            'verification',
            'appointment',
          ].includes(key),
        ) &&
        id(c.eventId) &&
        time(c.dayStart) &&
        (c.appointment === undefined ||
          (c.kind === 'sunscreen' &&
            validAppointment(c.appointment) &&
            c.appointment.dayStart === c.dayStart)) &&
        (c.verification === undefined ||
          (c.kind === 'water' &&
            validWaterVerification(c.verification, c.createdAt) &&
            c.verification.capturedAt >= c.dayStart)) &&
        (c.kind === 'water'
          ? integer(c.amount) && c.amount <= 10000
          : c.kind === 'sunscreen' && c.amount === 1)
      );
    case 'edit':
      return (
        id(c.eventId) &&
        integer(c.expectedRevision) &&
        time(c.dayStart) &&
        integer(c.amount) &&
        c.amount <= 10000
      );
    case 'remove':
      return id(c.eventId) && integer(c.expectedRevision) && time(c.dayStart);
    case 'undo':
      return id(c.targetOperationId) && integer(c.expectedRevision) && time(c.dayStart);
    case 'preferences':
      return integer(c.expectedRevision) && validPreferences(c.draft);
    default:
      return false;
  }
}
function validPreferences(draft: OnboardingDraft) {
  // The domain parser validates the full preference snapshot, including its IANA time zone.
  return !!parseLocalState(
    JSON.stringify({
      version: 1,
      startedAt: 0,
      cycleStarts: [0],
      firstSpecies: 'sprout',
      preferences: draft,
      goals: [{ day: 0, water: 2000, sunscreen: 3 }],
      events: [],
    }),
  );
}
function validEvent(e: HabitEvent | null | undefined): boolean {
  return (
    e === undefined ||
    e === null ||
    (id(e.id) &&
      (e.appointment === undefined ||
        (e.kind === 'sunscreen' && validAppointment(e.appointment))) &&
      time(e.at) &&
      (e.verification === undefined ||
        (e.kind === 'water' && validWaterVerification(e.verification, e.at))) &&
      (e.editedAt === undefined || (time(e.editedAt) && e.editedAt >= e.at)) &&
      (e.kind === 'water'
        ? integer(e.amount) && e.amount <= 10000
        : e.kind === 'sunscreen' && e.amount === 1))
  );
}
export function parseSnapshot(raw: string): LocalSnapshot | null {
  try {
    const s = JSON.parse(raw) as LocalSnapshot;
    if (!s || s.version !== 2 || !integer(s.revision) || !integer(s.preferencesRevision))
      return null;
    const state = parseLocalState(JSON.stringify(s.state));
    if (
      !state ||
      !Array.isArray(s.eventVersions) ||
      !Array.isArray(s.operations) ||
      !validSunscreenAssignments(state)
    )
      return null;
    const versions = new Map<string, number>();
    for (const v of s.eventVersions) {
      if (
        !v ||
        !id(v.id) ||
        versions.has(v.id) ||
        !integer(v.revision) ||
        typeof v.legacy !== 'boolean'
      )
        return null;
      versions.set(v.id, v.revision);
    }
    if (state.events.some((e) => !versions.has(e.id))) return null;
    const operations = new Set<string>();
    for (const r of s.operations) {
      if (
        !r ||
        !validCommand(r.command) ||
        operations.has(r.command.id) ||
        !time(r.committedAt) ||
        r.committedAt < r.command.createdAt ||
        !validEvent(r.before) ||
        !validEvent(r.after)
      )
        return null;
      const event = r.after ?? r.before;
      if (
        [r.before, r.after].some(
          (candidate) =>
            candidate?.appointment && !validSunscreenAssignments({ ...state, events: [candidate] }),
        )
      )
        return null;
      const command = r.command;
      if (command.type === 'start' || command.type === 'preferences') {
        if (r.before !== undefined || r.after !== undefined || r.eventRevision !== undefined)
          return null;
      } else {
        if (!event || !integer(r.eventRevision) || (versions.get(event.id) ?? 0) < r.eventRevision!)
          return null;
        if (
          r.before &&
          r.after &&
          (r.before.id !== r.after.id ||
            r.before.kind !== r.after.kind ||
            r.before.at !== r.after.at)
        )
          return null;
        if (command.type === 'record') {
          if (
            r.before !== null ||
            !r.after ||
            event.id !== command.eventId ||
            event.kind !== command.kind ||
            event.amount !== command.amount ||
            event.at !== command.createdAt ||
            commandFingerprint(event.verification) !== commandFingerprint(command.verification) ||
            commandFingerprint(event.appointment) !== commandFingerprint(command.appointment) ||
            r.eventRevision !== 1
          )
            return null;
        } else {
          if (r.eventRevision !== command.expectedRevision + 1) return null;
          if (command.type === 'undo') {
            const target = s.operations.find(
              (t) => operations.has(t.command.id) && t.command.id === command.targetOperationId,
            );
            if (
              !target ||
              target.command.type === 'start' ||
              target.command.type === 'preferences' ||
              target.command.type === 'undo' ||
              (target.after ?? target.before)?.id !== event.id
            )
              return null;
          } else if (
            event.id !== command.eventId ||
            !r.before ||
            (command.type === 'remove'
              ? r.after !== null
              : !r.after ||
                r.after.kind !== 'water' ||
                r.after.amount !== command.amount ||
                r.after.editedAt !== r.committedAt)
          )
            return null;
        }
      }
      operations.add(r.command.id);
    }
    return {
      version: 2,
      revision: s.revision,
      preferencesRevision: s.preferencesRevision,
      state,
      eventVersions: s.eventVersions.map((v) => ({
        id: v.id,
        revision: v.revision,
        legacy: v.legacy,
      })),
      operations: structuredClone(s.operations),
    };
  } catch {
    return null;
  }
}
