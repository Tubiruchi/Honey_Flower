import type { PlantDay } from '../../shared/components/WeeklyGrid';

/** Datos de demostración: no representan registros persistidos ni resultados de una API. */
export const demoWeek: readonly PlantDay[] = [
  { day: 1, state: 'complete' },
  { day: 2, state: 'partial' },
  { day: 3, state: 'current' },
  { day: 4, state: 'future' },
  { day: 5, state: 'future' },
  { day: 6, state: 'future' },
  { day: 7, state: 'future' },
];

export const demoPlant = {
  name: 'Lila',
  health: 'healthy',
  day: 3,
  message: 'Tú cuidas tus hábitos. Yo pongo las hojas.',
} as const;
