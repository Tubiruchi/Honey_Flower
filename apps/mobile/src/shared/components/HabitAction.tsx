import type { HabitKind } from '@honeyflower/contracts';
import { Button } from './Button';
import { HabitSummary } from './HabitSummary';

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
  return (
    <article className={`hf-habit hf-habit--${kind}`} aria-label={label}>
      <HabitSummary kind={kind} value={summary}>
        {completed && <span className="hf-type-label-sm">Meta completada</span>}
      </HabitSummary>
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
