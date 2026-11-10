import { Button } from './Button';
import { Feedback } from './Feedback';
export interface RecordFeedbackProps {
  state?: 'updated' | 'deleted' | 'undone' | 'temporary-error';
  title?: string;
  description?: string;
  showAction?: boolean;
  onAction?: () => void;
}
const messages = {
  updated: ['Agua actualizada', 'Total: 1,400 de 2,000 mL.', 'Deshacer'],
  deleted: ['Registro eliminado', 'Total: 1,000 de 2,000 mL.', 'Deshacer'],
  undone: ['Cambio deshecho', 'Total: 1,250 de 2,000 mL.', 'Entendido'],
  'temporary-error': [
    'No se guardó en el dispositivo',
    'Cambios temporales. Reintenta.',
    'Reintentar',
  ],
} as const;
export function RecordFeedback({
  state = 'updated',
  title,
  description,
  showAction = true,
  onAction,
}: RecordFeedbackProps) {
  const message = messages[state];
  return (
    <div className="hf-record-feedback">
      <div role={state === 'temporary-error' ? undefined : 'status'}>
        <Feedback
          variant={state === 'temporary-error' ? 'error' : 'success'}
          title={title ?? message[0]}
        >
          {description ?? message[1]}
        </Feedback>
      </div>
      {showAction && (
        <Button variant="text" onClick={onAction}>
          {message[2]}
        </Button>
      )}
    </div>
  );
}
