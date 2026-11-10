import type { ButtonHTMLAttributes } from 'react';
import { Icon } from './Icon';
export interface SwipeActionProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  action: 'edit' | 'delete';
}
export function SwipeAction({ action, className = '', ...props }: SwipeActionProps) {
  return (
    <button
      {...props}
      type="button"
      className={`hf-swipe-action hf-swipe-action--${action} ${className}`}
    >
      <Icon name={action} inheritColor />
      <span>{action === 'edit' ? 'Editar' : 'Eliminar'}</span>
    </button>
  );
}
