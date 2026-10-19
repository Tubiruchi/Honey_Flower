import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon } from './Icon';

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
        {loading ? <Icon name="spinner" inheritColor className="hf-spinner" /> : icon}
        <span>{loading ? 'Cargando…' : children}</span>
      </span>
    </button>
  );
}
