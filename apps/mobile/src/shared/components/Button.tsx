import { LoaderCircle } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'text' | 'sunscreen';
  loading?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  loading = false,
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
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading && <LoaderCircle className="hf-spinner" size={20} aria-hidden="true" />}
      {loading ? 'Cargando…' : children}
    </button>
  );
}
