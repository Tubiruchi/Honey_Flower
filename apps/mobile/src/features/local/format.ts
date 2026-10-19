import type { LocalState } from './model';
export const number = (value: number) => new Intl.NumberFormat('es-MX').format(value);
export const percent = (value: number) =>
  new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 }).format(
    Math.floor(value * 1000 + Number.EPSILON) / 10,
  ) + '%';
export const date = (
  at: number,
  state: LocalState,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' },
) =>
  new Intl.DateTimeFormat('es-MX', { ...options, timeZone: state.preferences.timeZone }).format(at);
export const time = (at: number, state: LocalState) =>
  date(at, state, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
