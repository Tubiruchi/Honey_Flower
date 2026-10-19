import { useId } from 'react';
import type { InputHTMLAttributes } from 'react';
import type { AlertIntensity } from '@honeyflower/contracts';

export interface SegmentProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}
export function Segment({ label, ...props }: SegmentProps) {
  return (
    <label className="hf-segment">
      <input {...props} type="radio" />
      <span>{label}</span>
    </label>
  );
}
export interface ToneSelectorProps {
  value: AlertIntensity;
  disabled?: boolean;
  onChange: (value: AlertIntensity) => void;
}
const options = [
  { value: 'gentle', label: 'Suave' },
  { value: 'medium', label: 'Medio' },
  { value: 'intense', label: 'Intenso' },
] as const;
export function ToneSelector({ value, disabled, onChange }: ToneSelectorProps) {
  const name = useId();
  return (
    <fieldset className="hf-tone-selector" disabled={disabled}>
      <legend className="hf-sr-only">Tono de los recordatorios</legend>
      {options.map((option) => (
        <Segment
          key={option.value}
          name={name}
          label={option.label}
          value={option.value}
          checked={value === option.value}
          onChange={() => onChange(option.value)}
        />
      ))}
    </fieldset>
  );
}
