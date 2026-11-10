import { useId } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './Icon';

export interface TimeRowProps {
  label: string;
  accessibleLabel?: string;
  value: string;
  disabled?: boolean;
  clockIcon?: ReactNode;
  onChange: (value: string) => void;
  error?: string;
}

export function TimeRow({
  label,
  accessibleLabel,
  value,
  disabled,
  clockIcon,
  onChange,
  error,
}: TimeRowProps) {
  const id = useId();
  return (
    <div
      className={`hf-time-row${disabled ? ' hf-time-row--disabled' : ''}${error ? ' hf-time-row--error' : ''}`}
    >
      <label htmlFor={id}>{label}</label>
      <div className="hf-time-row__control">
        <span className="hf-time-row__display" aria-hidden="true">
          {disabled ? (
            <Icon name="clock" inheritColor />
          ) : (
            (clockIcon ?? <Icon name="clock" inheritColor />)
          )}
          <span>{value || '--:--'}</span>
        </span>
        <input
          id={id}
          type="time"
          aria-label={accessibleLabel ?? label}
          value={value}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onClick={(event) => event.currentTarget.showPicker?.()}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      {error && (
        <span className="hf-sr-only" id={`${id}-error`}>
          {error}
        </span>
      )}
    </div>
  );
}
