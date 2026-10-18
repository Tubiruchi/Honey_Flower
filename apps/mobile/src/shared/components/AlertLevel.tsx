import { useId } from 'react';
import type { AlertIntensity } from '@honeyflower/contracts';

export interface AlertLevelProps {
  value: AlertIntensity;
  disabled?: boolean;
  onChange: (value: AlertIntensity) => void;
  compact?: boolean;
}

const options = [
  { value: 'gentle', label: 'Suave' },
  { value: 'medium', label: 'Medio' },
  { value: 'intense', label: 'Intenso' },
] as const;

export function AlertLevel({ value, disabled, onChange, compact }: AlertLevelProps) {
  const name = useId();
  return (
    <fieldset
      className={`hf-tone hf-card${compact ? ' hf-tone--compact' : ''}`}
      disabled={disabled}
    >
      <legend className={compact ? 'hf-sr-only' : 'hf-type-label-md'}>
        Tono de los recordatorios
      </legend>
      {!compact && (
        <p className="hf-muted">
          Elige cuánto sarcasmo tiene tu planta. Puedes cambiarlo cuando quieras.
        </p>
      )}
      <div className="hf-tone__options">
        {options.map((option) => (
          <label key={option.value} className="hf-tone__option">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
