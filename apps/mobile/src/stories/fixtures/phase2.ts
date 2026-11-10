import type { CycleProgressPanelProps } from '../../shared/components/CycleProgressPanel';
import type { CycleChartDay } from '../../shared/components/CycleHabitChart';
import type { SunscreenScheduleAgendaProps } from '../../shared/components/SunscreenScheduleAgenda';

const labels = ['Vie', 'Sáb', 'Dom', 'Lun', 'Mar', 'Mié', 'Jue'];
function days(values: readonly number[], start: number, current = -1): CycleChartDay[] {
  return labels.map((day, index) => ({
    id: `day-${index}`,
    day,
    date: String(start + index),
    value: values[index] ?? null,
    state: index >= values.length ? 'future' : index === current ? 'current' : 'closed',
  }));
}
export type CycleFixture = Omit<CycleProgressPanelProps, 'onChangeCycle'>;
export const closedCycle: CycleFixture = {
  state: 'closed',
  range: '18 sep, 12:00 → 25 sep, 12:00',
  summary: {
    percentage: 88.1,
    description:
      'Agua y protector cuentan por igual. Se alcanzó el 80 % necesario para sumar la planta al jardín.',
  },
  water: {
    days: days([2000, 1500, 2000, 1000, 2000, 2000, 1500], 18),
    totalLabel: '12,000 de 14,000 mL · 85.7 %',
    goal: 2000,
    note: 'Cada columna representa un día de planta.',
    detail: 'Meta diaria: 2,000 mL elegidos por ti.',
  },
  sunscreen: {
    days: days([3, 3, 2, 3, 3, 3, 2], 18),
    totalLabel: '19 de 21 aplicaciones · 90.5 %',
    goal: 3,
    note: 'Cada columna representa un día de planta.',
    detail: 'Meta diaria: 3 aplicaciones configuradas.',
  },
};
export const currentCycle: CycleFixture = {
  state: 'in-progress',
  range: '16 oct, 12:00 → 23 oct, 12:00',
  summary: {
    percentage: 34.5,
    description:
      '2 de 7 días cerrados. El día actual suma avance parcial; los días futuros siguen pendientes.',
  },
  water: {
    days: days([2000, 2000, 1000], 16, 2),
    totalLabel: '5,000 de 14,000 mL · 35.7 %',
    goal: 2000,
    note: 'Vie y Sáb cerrados · Dom en curso.',
    detail: '— Día futuro, todavía sin evaluar.',
  },
  sunscreen: {
    days: days([3, 3, 1], 16, 2),
    totalLabel: '7 de 21 aplicaciones · 33.3 %',
    goal: 3,
    note: 'Vie y Sáb cerrados · Dom en curso.',
    detail: '— Día futuro, todavía sin evaluar.',
  },
};
/** Illustrative hours only. No production window duration or grace period is inferred. */
export function sunscreenAgenda(
  state: SunscreenScheduleAgendaProps['state'],
): SunscreenScheduleAgendaProps {
  return {
    state,
    rows: [
      { id: 'morning', time: '08:00', state: 'registered', detail: 'Registrada · 08:07' },
      {
        id: 'midday',
        time: '11:00',
        state: state === 'active' ? 'available' : 'registered',
        detail: state === 'active' ? 'Ventana abierta' : 'Registrada · 11:11',
      },
      {
        id: 'afternoon',
        time: '14:00',
        state: state === 'closed' ? 'closed' : 'upcoming',
        detail: state === 'closed' ? 'Cerrada · Sin registro' : 'Próximo horario',
      },
    ],
  };
}
export const recordFixture = [
  { id: 'water-1', kind: 'water' as const, amount: 500, time: '13:00' },
  { id: 'water-2', kind: 'water' as const, amount: 500, time: '15:00' },
  { id: 'water-3', kind: 'water' as const, amount: 250, time: '17:30' },
  { id: 'sun-1', kind: 'sunscreen' as const, amount: 1, time: '11:11' },
];
