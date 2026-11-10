import {
  createLocalState,
  currentDay,
  dayStart,
  editWaterEvent,
  recordEvent,
  removeEvent,
  updatePreferences,
} from '../../features/local/model.ts';
import type { HabitEvent } from '../../features/local/model.ts';
import { createSnapshot, validCommand } from './localSnapshot.ts';
import type { LocalCommand, LocalSnapshot, OperationReceipt } from './localSnapshot.ts';
import { waterPhotoTrigger } from '../../features/water/policy.ts';
import { eligibleAppointment } from '../../features/sunscreen/model.ts';
import { sameAppointment } from '../../features/sunscreen/schema.ts';

export class OperationError extends Error {
  reason: 'validation' | 'conflict' | 'expired' | 'capture-required';
  constructor(reason: OperationError['reason'], message: string) {
    super(message);
    this.reason = reason;
  }
}
export function applyOperation(
  snapshot: LocalSnapshot | null,
  command: LocalCommand,
  now: number,
): { snapshot: LocalSnapshot; receipt: OperationReceipt } {
  if (!validCommand(command) || command.createdAt > now)
    throw new OperationError('validation', 'Revisa los datos de la operación.');
  if (command.type === 'start') {
    const next = snapshot
      ? structuredClone(snapshot)
      : createSnapshot(createLocalState(now, command.draft, command.species), false);
    const receipt: OperationReceipt = { command: structuredClone(command), committedAt: now };
    next.operations.push(receipt);
    if (snapshot) next.revision++;
    return { snapshot: next, receipt };
  }
  if (!snapshot) throw new OperationError('validation', 'Entra al modo de prueba para comenzar.');
  const next = structuredClone(snapshot);
  const receipt: OperationReceipt = { command: structuredClone(command), committedAt: now };
  if (command.type === 'preferences') {
    if (command.expectedRevision !== next.preferencesRevision)
      throw new OperationError(
        'conflict',
        'Las preferencias cambiaron. Vuelve a abrir el formulario antes de guardar.',
      );
    next.state = updatePreferences(next.state, command.draft, now);
    next.preferencesRevision++;
  } else {
    if (command.dayStart !== dayStart(next.state, currentDay(next.state, now)))
      throw new OperationError(
        'expired',
        'El día de planta cambió. Los registros cerrados son de solo lectura.',
      );
    let eventId: string;
    let before: HabitEvent | null;
    let after: HabitEvent | null;
    if (command.type === 'record') {
      if (command.kind === 'sunscreen') {
        if (!command.appointment)
          throw new OperationError(
            'expired',
            'No hay una ventana de protector disponible. Revisa tu horario.',
          );
        const eligibility = eligibleAppointment(
          next.state,
          command.appointment,
          command.createdAt,
          now,
        );
        if (eligibility === 'expired')
          throw new OperationError(
            'expired',
            'Este horario de protector terminó o cambió. Revisa la agenda antes de registrar.',
          );
        if (eligibility === 'duplicate')
          throw new OperationError(
            'conflict',
            'Esta cita ya tiene una aplicación registrada. No se creó otra.',
          );
        if (eligibility === 'complete')
          throw new OperationError('conflict', 'Ya completaste la meta de protector de este día.');
      }
      if (command.kind === 'water' && waterPhotoTrigger(next.state, now) && !command.verification)
        throw new OperationError(
          'capture-required',
          'Necesitas completar una fotografía antes de confirmar este registro de agua.',
        );
      eventId = command.eventId;
      if (next.eventVersions.some((v) => v.id === eventId))
        throw new OperationError('conflict', 'Este registro ya existe. No se creó otro.');
      before = null;
      after = {
        id: eventId,
        kind: command.kind,
        amount: command.amount,
        at: command.createdAt,
        ...(command.verification ? { verification: structuredClone(command.verification) } : {}),
        ...(command.appointment ? { appointment: structuredClone(command.appointment) } : {}),
      };
      next.state = recordEvent(next.state, after, now);
      next.eventVersions.push({ id: eventId, revision: 0, legacy: false });
    } else if (command.type === 'undo') {
      const target = next.operations.find((r) => r.command.id === command.targetOperationId);
      if (
        !target ||
        target.command.type === 'undo' ||
        target.command.type === 'preferences' ||
        target.command.type === 'start' ||
        target.eventRevision !== command.expectedRevision
      )
        throw new OperationError('conflict', 'No se puede deshacer esa operación.');
      if (
        next.operations.some(
          (r) =>
            r.command.type === 'undo' && r.command.targetOperationId === command.targetOperationId,
        )
      )
        throw new OperationError('conflict', 'Ese cambio ya fue deshecho.');
      const original = target.after ?? target.before;
      if (!original) throw new OperationError('conflict', 'No encontramos el registro original.');
      eventId = original.id;
      if (original.at < command.dayStart)
        throw new OperationError('expired', 'Los días cerrados conservan sus registros.');
      before = next.state.events.find((e) => e.id === eventId) ?? null;
      after = target.before
        ? { ...target.before, ...(target.command.type === 'edit' ? { editedAt: now } : {}) }
        : null;
      if (
        after?.appointment &&
        next.state.events.some(
          (event) =>
            event.id !== after!.id && sameAppointment(event.appointment, after!.appointment),
        )
      )
        throw new OperationError(
          'conflict',
          'Esa cita ya tiene otra aplicación. No se puede restaurar un duplicado.',
        );
      if (after)
        next.state = {
          ...next.state,
          events: [...next.state.events.filter((e) => e.id !== eventId), after],
        };
      else next.state = removeEvent(next.state, eventId, now);
    } else {
      eventId = command.eventId;
      before = next.state.events.find((e) => e.id === eventId) ?? null;
      if (!before)
        throw new OperationError('conflict', 'No encontramos ese registro. Actualiza la vista.');
      if (before.at < command.dayStart)
        throw new OperationError('expired', 'Los días cerrados conservan sus registros.');
      next.state =
        command.type === 'edit'
          ? editWaterEvent(next.state, eventId, command.amount, now)
          : removeEvent(next.state, eventId, now);
      after = next.state.events.find((e) => e.id === eventId) ?? null;
    }
    const version = next.eventVersions.find((v) => v.id === eventId)!;
    if (command.type !== 'record' && version.revision !== command.expectedRevision)
      throw new OperationError(
        'conflict',
        'El registro cambió después. Actualiza la vista antes de corregirlo o deshacerlo.',
      );
    version.revision++;
    receipt.before = before;
    receipt.after = after;
    receipt.eventRevision = version.revision;
  }
  next.revision++;
  next.operations.push(receipt);
  return { snapshot: next, receipt };
}
