import { Camera, TriangleAlert } from 'lucide-react';
import type { CameraOutcome } from '@honeyflower/contracts';
import { Button } from './Button';

export interface CameraResultProps {
  outcome: CameraOutcome;
  objectLabel?: string;
  onConfirm: () => void;
  onRetry: () => void;
  onManual: () => void;
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
      <p role="status">{descriptions[outcome]}</p>
      {outcome === 'identified' && (
        <Button onClick={onConfirm}>Confirmo que realicé el hábito</Button>
      )}
      {outcome !== 'permission-denied' && (
        <Button variant="secondary" onClick={onRetry}>
          Intentar otra vez
        </Button>
      )}
      <Button variant="text" onClick={onManual}>
        Registrar manualmente
      </Button>
      <p className="hf-muted">La imagen no demuestra que hayas bebido agua o aplicado protector.</p>
    </section>
  );
}
