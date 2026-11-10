import { Camera, TriangleAlert } from 'lucide-react';
import type { CameraOutcome } from '@honeyflower/contracts';
import { Button } from './Button';

export interface CameraResultProps {
  outcome: CameraOutcome;
  objectLabel?: string;
  onConfirm: () => void;
  onRetry: () => void;
  onManual: () => void;
  /** Water may require a captured photo before personal review can continue. */
  requiresPhoto?: boolean;
  hasCapturedPhoto?: boolean;
  onExit?: () => void;
}

const descriptions: Record<CameraOutcome, string> = {
  identified: 'Se identificó un objeto. Confirma tú si realizaste el hábito.',
  uncertain: 'No pudimos identificar el objeto con suficiente claridad.',
  'not-found': 'No se identificó un objeto compatible.',
  'permission-denied': 'La cámara no tiene permiso. Puedes registrar el hábito manualmente.',
};

/** Presenta un resultado recibido: no captura imágenes ni ejecuta inferencia. */
export function CameraResult({
  outcome,
  objectLabel,
  onConfirm,
  onRetry,
  onManual,
  requiresPhoto = false,
  hasCapturedPhoto = false,
  onExit,
}: CameraResultProps) {
  return (
    <section className="hf-camera hf-card" aria-label="Resultado de cámara">
      {outcome === 'identified' ? (
        <Camera size={32} aria-hidden="true" />
      ) : (
        <TriangleAlert size={32} aria-hidden="true" />
      )}
      <h2 className="hf-type-heading-md">
        {outcome === 'identified'
          ? (objectLabel ?? 'Objeto identificado')
          : 'Necesitamos tu confirmación'}
      </h2>
      <p role="status">
        {requiresPhoto && !hasCapturedPhoto
          ? 'Necesitas tomar una fotografía para continuar con este registro de agua. Puedes reintentar o salir sin registrar.'
          : descriptions[outcome]}
      </p>
      {outcome === 'identified' && (!requiresPhoto || hasCapturedPhoto) && (
        <Button onClick={onConfirm}>Confirmo que realicé el hábito</Button>
      )}
      {(outcome !== 'permission-denied' || requiresPhoto) && (
        <Button variant="secondary" onClick={onRetry}>
          Intentar otra vez
        </Button>
      )}
      {(!requiresPhoto || hasCapturedPhoto) && (
        <Button variant="text" onClick={onManual}>
          {requiresPhoto ? 'Revisar cantidad' : 'Registrar manualmente'}
        </Button>
      )}
      {requiresPhoto && onExit && (
        <Button variant="text" onClick={onExit}>
          Salir sin registrar
        </Button>
      )}
      <p className="hf-muted">
        La imagen no demuestra que hayas bebido agua. El protector se registra sin cámara.
      </p>
    </section>
  );
}
