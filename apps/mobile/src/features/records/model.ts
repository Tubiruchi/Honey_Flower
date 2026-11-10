import { eventsAt } from '../local/model.ts';
import type { LocalState } from '../local/model.ts';

export function recordDay(value: unknown, today: number) {
  const day =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\d+$/.test(value)
        ? Number(value)
        : NaN;
  return Number.isSafeInteger(day) && day >= 0 && day <= today ? day : today;
}
export function recordsForDay(state: LocalState, day: number) {
  const events = eventsAt(state, day);
  const initial = [...events].reverse().find((event) => event.kind === 'sunscreen')?.id;
  return events.map((event) => ({
    ...event,
    title:
      event.kind === 'water'
        ? `${new Intl.NumberFormat('es-MX').format(event.amount)} mL de agua`
        : event.id === initial
          ? 'Aplicación inicial'
          : 'Reaplicación de protector',
  }));
}
