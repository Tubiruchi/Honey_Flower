import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { IconButton } from './IconButton';

export interface StepperProps {
  label: string;
  value: number | string;
  unit: string;
  min: number;
  max: number;
  step?: number;
  editable?: boolean;
  disabled?: boolean;
  error?: string;
  variant?: 'default' | 'water';
  minusIcon?: ReactNode;
  plusIcon?: ReactNode;
  onChange: (value: string) => void;
}

export function Stepper({
  label,
  value,
  unit,
  min,
  max,
  step = 1,
  editable,
  disabled,
  error,
  variant = 'default',
  minusIcon,
  plusIcon,
  onChange,
}: StepperProps) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const number = Number(value);
  const change = (delta: number) =>
    onChange(
      String(Math.min(max, Math.max(min, (Number.isFinite(number) ? number : min) + delta))),
    );
  return (
    <div className={`hf-stepper hf-stepper--${variant}${disabled ? ' hf-stepper--disabled' : ''}`}>
      <label id={`${id}-label`} htmlFor={editable ? id : undefined} className="hf-type-label-md">
        {label}
      </label>
      <div className="hf-stepper__controls">
        <IconButton
          className="hf-stepper__button"
          label={`Reducir ${label.toLocaleLowerCase('es')}`}
          disabled={disabled || number <= min}
          onClick={() => change(-step)}
        >
          {disabled || number <= min ? (
            <Icon name="minus" inheritColor />
          ) : (
            (minusIcon ?? <Icon name="minus" inheritColor />)
          )}
        </IconButton>
        <div className="hf-stepper__value">
          {editable ? (
            <input
              id={id}
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={
                editing || value === '' || !Number.isFinite(number)
                  ? value
                  : new Intl.NumberFormat('es-MX').format(number)
              }
              onFocus={() => setEditing(true)}
              onBlur={() => setEditing(false)}
              aria-labelledby={`${id}-label`}
              aria-describedby={`${id}-unit${error ? ` ${id}-error` : ''}`}
              aria-invalid={error ? true : undefined}
              disabled={disabled}
              onChange={(event) => onChange(event.target.value.replaceAll(',', ''))}
            />
          ) : (
            <output aria-labelledby={`${id}-label`}>
              {new Intl.NumberFormat('es-MX').format(number)}
            </output>
          )}
          <span id={`${id}-unit`} className="hf-type-caption">
            {unit}
          </span>
        </div>
        <IconButton
          className="hf-stepper__button"
          label={`Aumentar ${label.toLocaleLowerCase('es')}`}
          disabled={disabled || number >= max}
          onClick={() => change(step)}
        >
          {disabled || number >= max ? (
            <Icon name="plus" inheritColor />
          ) : (
            (plusIcon ?? <Icon name="plus" inheritColor />)
          )}
        </IconButton>
      </div>
      {error && (
        <p className="hf-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
