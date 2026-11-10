import { SunscreenScheduleRow } from './SunscreenScheduleRow';
import type { SunscreenScheduleRowProps } from './SunscreenScheduleRow';
export interface SunscreenScheduleAgendaProps {
  state: 'active' | 'registered' | 'closed';
  rows: readonly (SunscreenScheduleRowProps & { id: string })[];
}
export function SunscreenScheduleAgenda({ state, rows }: SunscreenScheduleAgendaProps) {
  return (
    <section
      className="hf-sunscreen-agenda"
      aria-label="Horarios de protector solar"
      data-state={state}
    >
      {rows.map(({ id, ...row }) => (
        <SunscreenScheduleRow key={id} {...row} />
      ))}
    </section>
  );
}
