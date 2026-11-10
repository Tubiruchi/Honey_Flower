import type { ReactNode } from 'react';
import type { HabitKind } from '@honeyflower/contracts';
import { Icon } from './Icon';
export interface HabitSummaryProps {
  kind?: HabitKind;
  label?: string;
  value: string;
  icon?: ReactNode;
  children?: ReactNode;
  layout?: 'stacked' | 'metric';
  progress?: number;
}
export function HabitSummary({
  kind = 'water',
  label = kind === 'water' ? 'Agua' : 'Protector solar',
  value,
  icon,
  children,
  layout = 'stacked',
  progress,
}: HabitSummaryProps) {
  return (
    <div
      className={`hf-habit-summary hf-habit-summary--${kind}${layout === 'metric' ? ' hf-habit-summary--metric' : ''}`}
    >
      {layout === 'metric' ? (
        <div className="hf-habit-summary__heading">
          {icon ?? <Icon name={kind === 'water' ? 'drop' : 'sun'} inheritColor />}
          <p className="hf-type-label-sm">{label}</p>
        </div>
      ) : (
        <>
          {icon ?? <Icon name={kind === 'water' ? 'drop' : 'sun'} inheritColor />}
          <p className="hf-type-label-md">{label}</p>
        </>
      )}
      <p className={layout === 'metric' ? 'hf-type-data-md' : 'hf-type-data-lg'}>{value}</p>
      {children}
      {progress !== undefined && (
        <progress
          className="hf-habit-summary__progress"
          max={1}
          value={Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0))}
          aria-label={kind === 'water' ? 'Meta de agua' : 'Meta de protector'}
        />
      )}
    </div>
  );
}
