import { useId } from 'react';
import { Switch } from './Switch';

export interface SettingRowProps {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

export function SettingRow({ label, description, checked, disabled, onChange }: SettingRowProps) {
  const id = useId();
  return (
    <div className="hf-setting-row hf-card">
      <div>
        <label htmlFor={id} className="hf-type-label-md">
          {label}
        </label>
        <p id={`${id}-help`} className="hf-muted">
          {description}
        </p>
      </div>
      <Switch
        id={id}
        aria-describedby={`${id}-help`}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
    </div>
  );
}
