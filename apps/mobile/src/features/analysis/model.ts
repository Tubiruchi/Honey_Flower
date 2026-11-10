import { completedCycles, currentDay, cycleStats, dayStart, WEEK_MS } from '../local/model.ts';
import type { LocalState } from '../local/model.ts';
import { collectionTimeZone } from './collection.ts';

export function monthAt(at: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(at);
  return (
    Number(parts.find((p) => p.type === 'year')!.value) * 12 +
    Number(parts.find((p) => p.type === 'month')!.value) -
    1
  );
}
export function monthLabel(month: number): string {
  const label = new Intl.DateTimeFormat('es-MX', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  }).format(Date.UTC(Math.floor(month / 12), month % 12, 15));
  return label.charAt(0).toUpperCase() + label.slice(1);
}
export function collectionDate(
  at: number,
  state: LocalState,
  options?: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: collectionTimeZone(state),
    day: 'numeric',
    month: 'short',
    ...options,
  })
    .format(at)
    .replaceAll('.', '');
}
export function monthBounds(state: LocalState, now: number) {
  const zone = collectionTimeZone(state);
  const first = monthAt(state.startedAt, zone);
  return { first, last: Math.max(first, monthAt(now, zone)) };
}
/** Reserve a scene slot for every closure, independently of collection filters and list order. */
export function gardenPlants(state: LocalState, now: number, month: number) {
  const zone = collectionTimeZone(state);
  return completedCycles(state, now)
    .map((cycle) => {
      const startedAt = state.cycleStarts[cycle.index]!;
      const endedAt = startedAt + WEEK_MS;
      return { ...cycle, id: `cycle-${startedAt}`, startedAt, endedAt };
    })
    .filter((cycle) => monthAt(cycle.endedAt, zone) === month)
    .map((cycle, slot) => ({ ...cycle, slot }));
}
export type GardenPlant = ReturnType<typeof gardenPlants>[number];

export function cycleProgress(state: LocalState, now: number, requested: number) {
  const active = Math.floor(currentDay(state, now) / 7);
  // A repository refresh normally advances expired cycles before rendering. Guard direct callers too.
  const index = Math.max(0, Math.min(requested, state.cycleStarts.length - 1));
  const closed = index < active || now >= state.cycleStarts[index]! + WEEK_MS;
  const today = currentDay(state, now);
  const stats = cycleStats(state, index, now);
  const chart = (kind: 'water' | 'sunscreen') => {
    const days = stats.days.map((day) => {
      const at = dayStart(state, day.day);
      const status =
        closed || day.day < today ? 'closed' : day.day === today ? 'current' : 'future';
      return {
        id: `day-${at}`,
        state: status,
        day: collectionDate(at, state, { weekday: 'short', day: undefined, month: undefined }),
        date: collectionDate(at, state, { day: 'numeric', month: undefined }),
        value: status === 'future' ? null : day[kind],
        goal: day.goals[kind],
      } as const;
    });
    const evaluated = stats.days.filter((day) => closed || day.day <= today);
    const total = evaluated.reduce((sum, day) => sum + day[kind], 0);
    const progress =
      evaluated.reduce(
        (sum, day) => sum + day[kind === 'water' ? 'waterProgress' : 'sunscreenProgress'],
        0,
      ) / 7;
    const goals = [...new Set(days.map((day) => day.goal))];
    const units = kind === 'water' ? 'mL' : 'aplicaciones';
    return {
      days,
      goal: Math.max(...goals),
      totalLabel: `${total.toLocaleString('es-MX')} ${units} · ${(progress * 100).toFixed(1)} % del ciclo`,
      note: closed
        ? 'Cada columna representa un día de planta cerrado.'
        : `${stats.closed} días cerrados · día actual en curso · — día futuro.`,
      detail:
        goals.length === 1
          ? `Meta diaria: ${goals[0]!.toLocaleString('es-MX')} ${units}.`
          : `Metas diarias históricas: ${goals.map((goal) => goal.toLocaleString('es-MX')).join(' / ')} ${units}. Consulta cada columna.`,
    };
  };
  return {
    index,
    closed,
    range: `${collectionDate(state.cycleStarts[index]!, state, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })} – ${collectionDate(state.cycleStarts[index]! + WEEK_MS, state, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })} · Ciclo ${index + 1}`,
    summary: {
      percentage: stats.progress * 100,
      outcome: closed && !stats.survived ? ('withered' as const) : ('survived' as const),
      description: closed
        ? stats.survived
          ? 'Alcanzaste la meta del 80 %. Esta planta forma parte de tu jardín. Resultado local.'
          : 'Este ciclo cerró por debajo del 80 %. Su planta se conserva en Marchitas. Resultado local.'
        : 'Progreso provisional de siete días. Incluye el día actual parcial; los próximos días siguen pendientes. Meta al cierre: 80 %.',
    },
    water: chart('water'),
    sunscreen: chart('sunscreen'),
  };
}
