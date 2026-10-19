import type { ReactNode } from 'react';
import { Icon } from './Icon';
export function AppBar({
  title,
  onBack,
  action,
}: {
  title: string;
  onBack?: () => void;
  action?: ReactNode;
}) {
  return (
    <div className="hf-app-bar">
      {onBack && (
        <button type="button" className="hf-app-bar__back" aria-label="Volver" onClick={onBack}>
          <Icon name="back" inheritColor />
        </button>
      )}
      <p className="hf-type-data-md">{title}</p>
      {action}
    </div>
  );
}
