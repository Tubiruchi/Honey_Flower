import type { ReactNode } from 'react';
import { figmaComponents } from '../../assets/figma/components';

export interface FeedbackProps {
  children: ReactNode;
  icon?: ReactNode;
  variant?: 'neutral' | 'error' | 'info' | 'success' | 'warning';
  title?: string;
}

const icons = figmaComponents.feedback;
const source = {
  info: icons.imgFrame,
  success: icons.imgFrame1,
  warning: icons.imgFrame2,
  error: icons.imgFrame3,
  neutral: icons.imgFrame4,
};

export function Feedback({ children, icon, title, variant = 'neutral' }: FeedbackProps) {
  return (
    <div
      className={`hf-feedback hf-feedback--${variant}`}
      role={variant === 'error' ? 'alert' : undefined}
    >
      <span aria-hidden="true">{icon ?? <img src={source[variant]} alt="" />}</span>
      <div className="hf-feedback__message">
        {title && <p className="hf-type-label-md">{title}</p>}
        <div className="hf-feedback__body">{children}</div>
      </div>
    </div>
  );
}
