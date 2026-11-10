import { useId, useRef } from 'react';
import { Icon } from './Icon';
export interface ConfirmationAmountFieldProps {
  state?: 'normal' | 'error' | 'disabled';
  value: string;
  label?: string;
  help?: string;
  error?: string;
  onChange: (value: string) => void;
}
export function ConfirmationAmountField({
  state = 'normal',
  value,
  label = '¿Cuánta agua tomaste?',
  help = 'Puedes cambiar la cantidad antes de guardar.',
  error = 'Escribe un entero entre 1 y 10,000 mL.',
  onChange,
}: ConfirmationAmountFieldProps) {
  const id = useId();
  const ref = useRef<HTMLInputElement>(null);
  const disabled = state === 'disabled';
  return (
    <div className={`hf-confirm-amount hf-confirm-amount--${state}`}>
      <label className="hf-type-label-md" htmlFor={id}>
        {label}
      </label>
      <div className="hf-confirm-amount__control">
        <input
          ref={ref}
          id={id}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          disabled={disabled}
          aria-invalid={state === 'error' || undefined}
          aria-describedby={`${id}-help ${id}-unit`}
          style={{ width: `${Math.max(value.length, 1)}ch` }}
          onChange={(e) => onChange(e.target.value)}
        />
        <span id={`${id}-unit`} className="hf-type-caption">
          mL
        </span>
        <button
          className="hf-confirm-amount__edit"
          type="button"
          aria-label="Editar cantidad de agua"
          disabled={disabled}
          onClick={() => {
            ref.current?.focus();
            ref.current?.select();
          }}
        >
          <Icon name="edit" inheritColor />
        </button>
      </div>
      <p id={`${id}-help`} className="hf-type-caption">
        {state === 'error' ? error : help}
      </p>
    </div>
  );
}
