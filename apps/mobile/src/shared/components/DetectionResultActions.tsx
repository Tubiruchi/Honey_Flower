import { Button } from './Button';
import { Icon } from './Icon';
export interface DetectionResultActionsProps {
  state?: 'normal' | 'loading' | 'disabled';
  title?: string;
  description?: string;
  onReview: () => void;
  onRetake: () => void;
}
export function DetectionResultActions({
  state = 'normal',
  title = '¡Esta foto sí!',
  description = 'Parece un recipiente de agua. Revisa la cantidad para continuar.',
  onReview,
  onRetake,
}: DetectionResultActionsProps) {
  return (
    <section
      className="hf-detection-actions"
      aria-label="Resultado de la fotografía"
      aria-busy={state === 'loading' || undefined}
    >
      <h2 className="hf-type-heading-lg">{title}</h2>
      <p className="hf-type-body-sm">{description}</p>
      <Button
        className="hf-detection-actions__review"
        loading={state === 'loading'}
        disabled={state === 'disabled'}
        onClick={onReview}
      >
        {state !== 'loading' && (
          <span className="hf-detection-actions__label">
            Revisar registro
            <Icon name="arrow" inheritColor />
          </span>
        )}
      </Button>
      <Button
        className="hf-detection-actions__retake"
        variant="text"
        disabled={state !== 'normal'}
        onClick={onRetake}
      >
        Volver a tomar
      </Button>
    </section>
  );
}
