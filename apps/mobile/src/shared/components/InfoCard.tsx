import type { ReactNode } from 'react';

export interface InfoCardProps {
  title: string;
  children: ReactNode;
  icon?: ReactNode;
  variant?: 'default' | 'water' | 'sunscreen' | 'plant';
  compact?: boolean;
  action?: ReactNode;
}

export function InfoCard({
  title,
  children,
  icon,
  variant = 'default',
  compact,
  action,
}: InfoCardProps) {
  return (
    <section
      className={`hf-info-card hf-info-card--${variant}${compact ? ' hf-info-card--compact' : ''}`}
    >
      {icon && (
        <div className="hf-info-card__icon" aria-hidden="true">
          {icon}
        </div>
      )}
      {action && <div className="hf-info-card__action">{action}</div>}
      <h2 className="hf-info-card__title">{title}</h2>
      <div className="hf-info-card__body">{children}</div>
    </section>
  );
}
