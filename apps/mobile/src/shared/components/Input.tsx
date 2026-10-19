import { useId, useState } from 'react';
import { Icon } from './Icon';
import type { InputHTMLAttributes, ReactNode } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  help?: string;
  error?: string;
  leadingIcon?: ReactNode;
}

export function Input({
  label,
  help,
  error,
  id,
  type = 'text',
  leadingIcon,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);
  const message = error || help;
  return (
    <div
      className={`hf-field${props.disabled ? ' hf-field--disabled' : ''}${error ? ' hf-field--error' : ''}`}
    >
      <label className="hf-type-label-md" htmlFor={inputId}>
        {label}
      </label>
      <div className="hf-field__control">
        <span className="hf-field__leading-icon" aria-hidden="true">
          {leadingIcon ?? (
            <Icon
              name={type === 'password' ? 'lock' : type === 'email' ? 'mail' : 'user'}
              inheritColor
            />
          )}
        </span>
        <input
          {...props}
          id={inputId}
          type={type === 'password' && visible ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? `${inputId}-help` : undefined}
        />
        {type === 'password' && (
          <button
            className="hf-field__visibility"
            type="button"
            disabled={props.disabled}
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={visible}
            onClick={() => setVisible(!visible)}
          >
            <Icon name={visible ? 'eyeoff' : 'eye'} inheritColor />
          </button>
        )}
      </div>
      {message && (
        <p id={`${inputId}-help`} className={error ? 'hf-error' : 'hf-muted'}>
          {message}
        </p>
      )}
    </div>
  );
}
