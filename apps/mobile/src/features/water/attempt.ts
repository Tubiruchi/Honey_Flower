import type { LocalStoragePort } from '../../shared/data/localRepository.ts';
import { validCommand } from '../../shared/data/localSnapshot.ts';
import type { LocalCommand } from '../../shared/data/localSnapshot.ts';
export const WATER_ATTEMPT_KEY = 'honeyflower.water-attempt.v1';
export type WaterRecordCommand = Extract<LocalCommand, { type: 'record' }> & { kind: 'water' };
export interface WaterAttempt {
  version: 1;
  id: string;
  eventId: string;
  startedAt: number;
  dayStart: number;
  amount: string;
  from: '/inicio';
  captureId: string | null;
  awaitingCapture: boolean;
  command?: WaterRecordCommand;
}
export function parseWaterAttempt(raw: string | null): WaterAttempt | null {
  if (raw === null || raw === 'null') return null;
  const value = JSON.parse(raw) as WaterAttempt;
  if (
    !value ||
    value.version !== 1 ||
    typeof value.id !== 'string' ||
    !value.id ||
    typeof value.eventId !== 'string' ||
    !value.eventId ||
    !Number.isFinite(value.startedAt) ||
    !Number.isFinite(value.dayStart) ||
    value.dayStart < 0 ||
    value.startedAt < value.dayStart ||
    typeof value.amount !== 'string' ||
    value.amount.length > 12 ||
    value.from !== '/inicio' ||
    typeof value.awaitingCapture !== 'boolean' ||
    (value.captureId !== null && (typeof value.captureId !== 'string' || !value.captureId)) ||
    (value.awaitingCapture && !value.captureId) ||
    (value.command &&
      (!validCommand(value.command) ||
        value.command.type !== 'record' ||
        value.command.kind !== 'water' ||
        value.command.id !== value.id ||
        value.command.eventId !== value.eventId ||
        value.command.dayStart !== value.dayStart ||
        String(value.command.amount) !== value.amount ||
        !value.command.verification ||
        value.awaitingCapture ||
        value.command.createdAt < value.startedAt ||
        value.command.verification.capturedAt < value.startedAt ||
        value.command.verification.captureId !== value.captureId))
  )
    throw new Error(
      'No pudimos recuperar el intento de agua. Tus registros guardados se conservan.',
    );
  // Whitelist the draft. Never persist image data, paths or preview URLs.
  return {
    version: 1,
    id: value.id,
    eventId: value.eventId,
    startedAt: value.startedAt,
    dayStart: value.dayStart,
    amount: value.amount,
    from: '/inicio',
    captureId: value.captureId,
    awaitingCapture: value.awaitingCapture,
    ...(value.command ? { command: structuredClone(value.command) } : {}),
  };
}
export class WaterAttemptStore {
  private storage: LocalStoragePort;
  constructor(storage: LocalStoragePort) {
    this.storage = storage;
  }
  async read() {
    return parseWaterAttempt(await this.storage.getItem(WATER_ATTEMPT_KEY));
  }
  async write(attempt: WaterAttempt) {
    const valid = parseWaterAttempt(JSON.stringify(attempt));
    if (!valid) throw Error('Intento inválido.');
    await this.storage.setItem(WATER_ATTEMPT_KEY, JSON.stringify(valid));
  }
  async clear(id: string) {
    const current = await this.read();
    if (current?.id === id) await this.storage.setItem(WATER_ATTEMPT_KEY, 'null');
  }
  async reset() {
    await this.storage.setItem(WATER_ATTEMPT_KEY, 'null');
  }
}
