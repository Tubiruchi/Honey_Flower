import { ConfirmationAmountField } from './ConfirmationAmountField';
import { Button } from './Button';
import { isValidWaterAmount } from './waterAmount';
export interface RegistrationConfirmationProps {
  state?: 'normal' | 'saving' | 'amount-error' | 'save-error';
  value: string;
  title?: string;
  confirmLabel?: string;
  saveError?: string;
  onChange: (value: string) => void;
  onConfirm: (value: number) => void;
  onRetrySave: () => void;
  onRetake: () => void;
  retakeDisabled?: boolean;
}
export function RegistrationConfirmation({
  state = 'normal',
  value,
  title = 'Confirma tu registro',
  confirmLabel = 'Confirmar y guardar',
  saveError = 'No se guardó el registro. Tu cantidad sigue aquí.',
  onChange,
  onConfirm,
  onRetrySave,
  onRetake,
  retakeDisabled = false,
}: RegistrationConfirmationProps) {
  const saving = state === 'saving';
  const failed = state === 'save-error';
  const invalid = state === 'amount-error' || !isValidWaterAmount(value);
  return (
    <section className="hf-registration-confirm" aria-label={title} aria-busy={saving || undefined}>
      <h2 className="hf-type-heading-lg">{title}</h2>
      <ConfirmationAmountField
        value={value}
        onChange={onChange}
        state={saving || failed ? 'disabled' : invalid ? 'error' : 'normal'}
        help={
          saving
            ? 'Espera mientras se guarda.'
            : failed
              ? 'Reintenta para guardar esta cantidad.'
              : undefined
        }
      />
      {failed && (
        <p className="hf-type-body-sm hf-error" role="alert">
          {saveError}
        </p>
      )}
      <Button
        loading={saving}
        disabled={invalid}
        onClick={() => {
          if (invalid || saving) return;
          if (failed) onRetrySave();
          else onConfirm(Number(value));
        }}
      >
        {failed ? 'Reintentar guardado' : confirmLabel}
      </Button>
      <Button variant="text" disabled={saving || retakeDisabled} onClick={onRetake}>
        Volver a tomar
      </Button>
    </section>
  );
}
