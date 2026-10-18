import { useId } from 'react';
import type { ReactNode } from 'react';

export interface TimeRowProps {
  label: string;
  accessibleLabel?: string;
  value: string;
  disabled?: boolean;
  clockIcon: ReactNode;
  onChange: (value: string) => void;
}

export function TimeRow({
  label,
  accessibleLabel,
  value,
  disabled,
  clockIcon,
  onChange,
}: TimeRowProps) {
  const id = useId();
  return (
    <div className="hf-time-row">
      <label htmlFor={id}>{label}</label>
      <div className="hf-time-row__control">
        <span className="hf-time-row__display" aria-hidden="true">
          {clockIcon}
          <span>{value || '--:--'}</span>
        </span>
        <input
          id={id}
          type="time"
          aria-label={accessibleLabel ?? label}
          value={value}
          disabled={disabled}
          onClick={(event) => event.currentTarget.showPicker?.()}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}
