import { CloudCheck, CloudOff, RefreshCw, TriangleAlert } from 'lucide-react';
import type { SyncState } from '@honeyflower/contracts';
import { Button } from './Button';

export interface SyncStatusProps {
  state: SyncState;
  pendingCount?: number;
  onRetry?: () => void;
}

const content = {
  synced: { Icon: CloudCheck, label: 'Todo sincronizado' },
  pending: { Icon: RefreshCw, label: 'Sincronización pendiente' },
  offline: { Icon: CloudOff, label: 'Sin conexión' },
  error: { Icon: TriangleAlert, label: 'No se pudo sincronizar' },
};

export function SyncStatus({ state, pendingCount = 0, onRetry }: SyncStatusProps) {
  const { Icon, label } = content[state];
  return (
    <div className={`hf-sync hf-sync--${state}`}>
      <div className="hf-row" role="status">
        <Icon size={20} aria-hidden="true" />
        <span>
          {label}
          {state !== 'synced' && pendingCount > 0 ? ` · ${pendingCount} registros pendientes` : ''}
        </span>
      </div>
      {state === 'error' && onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Reintentar sincronización
        </Button>
      )}
    </div>
  );
}
