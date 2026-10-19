import type { AlertIntensity } from '@honeyflower/contracts';
import { ToneSelector } from './ToneSelector';

export interface AlertLevelProps {
  value: AlertIntensity;
  disabled?: boolean;
  onChange: (value: AlertIntensity) => void;
  compact?: boolean;
}

export function AlertLevel({ value, disabled, onChange, compact }: AlertLevelProps) {
  if (compact) return <ToneSelector value={value} disabled={disabled} onChange={onChange} />;
  return (
    <section className="hf-stack">
      <h2 className="hf-type-label-md">Tono de los recordatorios</h2>
      <p className="hf-muted">
        Elige cuánto sarcasmo tiene tu planta. Puedes cambiarlo cuando quieras.
      </p>
      <ToneSelector value={value} disabled={disabled} onChange={onChange} />
    </section>
  );
}
