import type { ReactNode } from 'react';

export interface FeedbackProps {
  children: ReactNode;
  icon?: ReactNode;
  variant?: 'neutral' | 'error';
}

export function Feedback({ children, icon, variant = 'neutral' }: FeedbackProps) {
  return (
    <div
      className={`hf-feedback hf-feedback--${variant}`}
      role={variant === 'error' ? 'alert' : undefined}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      <div>{children}</div>
    </div>
  );
}
