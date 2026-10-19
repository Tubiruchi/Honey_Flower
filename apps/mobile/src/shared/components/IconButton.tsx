import type { ButtonHTMLAttributes } from 'react';
import { Icon } from './Icon';
import type { IconProps } from './Icon';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon?: IconProps['name'];
}
export function IconButton({
  label,
  icon = 'back',
  children,
  className = '',
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button {...props} type={type} className={`hf-icon-button ${className}`} aria-label={label}>
      {children ?? <Icon name={icon} inheritColor />}
    </button>
  );
}
