import { Input } from './Input';
import { Icon } from './Icon';
import { Button } from './Button';
import { isValidWaterAmount } from './waterAmount';
export interface RecordEditorProps {
  state?: 'normal' | 'error' | 'saving';
  value: string;
  time?: string;
  summary?: string;
  onChange: (value: string) => void;
  onSave: (value: number) => void;
  onCancel: () => void;
}
export function RecordEditor({
  state = 'normal',
  value,
  time = '17:30 · Registro del día abierto',
  summary,
  onChange,
  onSave,
  onCancel,
}: RecordEditorProps) {
  const error = state === 'error' || !isValidWaterAmount(value);
  const saving = state === 'saving';
  return (
    <section
      className={`hf-record-editor${error ? ' hf-record-editor--error' : ''}`}
      aria-label="Editar agua"
      aria-busy={saving || undefined}
    >
      <div className="hf-record-editor__heading">
        <Icon name="drop" inheritColor />
        <div>
          <h2 className="hf-type-label-md">Editar agua</h2>
          <p className="hf-type-caption">{time}</p>
        </div>
      </div>
      <Input
        label="Cantidad de agua (mL)"
        value={value}
        inputMode="numeric"
        pattern="[0-9]*"
        leadingIcon={<Icon name="drop" inheritColor />}
        disabled={saving}
        error={error ? 'Usa un entero entre 1 y 10,000 mL.' : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="hf-type-caption">
        {summary ??
          (error
            ? 'Antes: 250 mL · El total no cambia todavía.'
            : 'Antes: 250 mL · Total al guardar: 1,400 mL')}
      </p>
      <div className="hf-operation-actions">
        <Button
          loading={saving}
          disabled={error}
          onClick={() => {
            if (!error && !saving) onSave(Number(value));
          }}
        >
          Guardar
        </Button>
        <Button variant="secondary" disabled={saving} onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </section>
  );
}
