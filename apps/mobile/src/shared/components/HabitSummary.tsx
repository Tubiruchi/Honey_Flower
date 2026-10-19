import type { ReactNode } from 'react';
import type { HabitKind } from '@honeyflower/contracts';
import { Icon } from './Icon';
export interface HabitSummaryProps {
  kind?: HabitKind;
  label?: string;
  value: string;
  icon?: ReactNode;
  children?: ReactNode;
}
export function HabitSummary({
  kind = 'water',
  label = kind === 'water' ? 'Agua' : 'Protector solar',
  value,
  icon,
  children,
}: HabitSummaryProps) {
  return (
    <div className={`hf-habit-summary hf-habit-summary--${kind}`}>
      {icon ?? <Icon name={kind === 'water' ? 'drop' : 'sun'} inheritColor />}
      <p className="hf-type-label-md">{label}</p>
      <p className="hf-type-data-lg">{value}</p>
      {children}
    </div>
  );
}
