import { useId } from 'react';

export interface SettingRowProps {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  visuals?: { on: string; off: string };
}

export function SettingRow({
  label,
  description,
  checked,
  disabled,
  onChange,
  visuals,
}: SettingRowProps) {
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
      <span className={visuals ? 'hf-switch-visual' : 'hf-switch-container'}>
        <input
          id={id}
          className="hf-switch"
          type="checkbox"
          role="switch"
          aria-describedby={`${id}-help`}
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        {visuals && <img src={checked ? visuals.on : visuals.off} alt="" aria-hidden="true" />}
      </span>
    </div>
  );
}
