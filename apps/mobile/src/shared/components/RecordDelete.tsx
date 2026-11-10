import { Button } from './Button';
export interface RecordDeleteProps {
  state?: 'confirmation' | 'deleting';
  title?: string;
  effect?: string;
  onCancel: () => void;
  onDelete: () => void;
}
export function RecordDelete({
  state = 'confirmation',
  title = '¿Eliminar este registro de 250 mL?',
  effect = 'El total quedará en 1,000 mL.',
  onCancel,
  onDelete,
}: RecordDeleteProps) {
  const deleting = state === 'deleting';
  return (
    <section
      className="hf-record-delete"
      aria-label="Confirmar eliminación"
      aria-busy={deleting || undefined}
    >
      <h2 className="hf-type-label-md">{title}</h2>
      <p className="hf-type-body-sm">{effect}</p>
      <div className="hf-operation-actions">
        <Button variant="secondary" disabled={deleting} onClick={onCancel}>
          Cancelar
        </Button>
        <Button className="hf-button--destructive" loading={deleting} onClick={onDelete}>
          Eliminar
        </Button>
      </div>
    </section>
  );
}
