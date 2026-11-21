import { IonSpinner } from '@ionic/react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './async-feedback.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'text' | 'sunscreen';
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({
  children,
  variant = 'primary',
  loading = false,
  icon,
  disabled,
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={`hf-button hf-button--${variant} ${className}`}
      disabled={disabled}
      aria-disabled={loading || disabled || undefined}
      aria-busy={loading || undefined}
      onClick={(event) => {
        if (loading) {
          event.preventDefault();
          return;
        }
        props.onClick?.(event);
      }}
    >
      <span className="hf-button__surface">
        {loading ? (
          <IonSpinner name="crescent" className="hf-native-spinner" aria-hidden="true" />
        ) : (
          icon
        )}
        <span>{loading ? 'Cargando…' : children}</span>
      </span>
    </button>
  );
}
