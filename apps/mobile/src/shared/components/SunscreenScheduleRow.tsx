import { Icon } from './Icon';
export type SunscreenScheduleState = 'registered' | 'available' | 'upcoming' | 'closed';
export interface SunscreenScheduleRowProps {
  state: SunscreenScheduleState;
  time: string;
  detail: string;
}
export function SunscreenScheduleRow({ state, time, detail }: SunscreenScheduleRowProps) {
  return (
    <div className={`hf-sunscreen-row hf-sunscreen-row--${state}`}>
      <Icon
        name={state === 'registered' ? 'check' : state === 'closed' ? 'lock' : 'clock'}
        inheritColor
      />
      <p className="hf-type-data-md">{time}</p>
      <p className="hf-type-body-sm">{detail}</p>
    </div>
  );
}
