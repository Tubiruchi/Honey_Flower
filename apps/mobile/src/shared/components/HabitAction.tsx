import { Check, Droplets, Sun } from 'lucide-react';
import type { HabitKind } from '@honeyflower/contracts';
import { Button } from './Button';

export interface HabitActionProps {
  kind: HabitKind;
  summary: string;
  actionLabel: string;
  completed?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onRegister: () => void;
}

export function HabitAction({
  kind,
  summary,
  actionLabel,
  completed,
  loading,
  disabled,
  onRegister,
}: HabitActionProps) {
  const label = kind === 'water' ? 'Agua' : 'Protector solar';
  const Icon = completed ? Check : kind === 'water' ? Droplets : Sun;
  return (
    <article className={`hf-habit hf-habit--${kind}`} aria-label={label}>
      <div className="hf-habit__summary">
        <Icon size={28} aria-hidden="true" />
        <span className="hf-type-label-md">{label}</span>
        <strong className="hf-type-data-lg">{summary}</strong>
        {completed && <span className="hf-type-label-sm">Meta completada</span>}
      </div>
      <Button
        variant={kind === 'sunscreen' ? 'sunscreen' : 'primary'}
        loading={loading}
        disabled={disabled || completed}
        onClick={onRegister}
      >
        {completed ? 'Completado' : actionLabel}
      </Button>
    </article>
  );
}
