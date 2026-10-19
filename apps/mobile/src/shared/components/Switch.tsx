import { useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { figmaComponents } from '../../assets/figma/components';

export interface SwitchProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'onChange'
> {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Switch({ checked, disabled, onChange, ...props }: SwitchProps) {
  const [focused, setFocused] = useState(false);
  const visuals = figmaComponents.switch;
  const src = disabled
    ? checked
      ? visuals.imgEstadoDisabledOn
      : visuals.imgEstadoDisabledOff
    : focused
      ? checked
        ? visuals.imgEstadoFocusedOn
        : visuals.imgEstadoFocusedOff
      : checked
        ? visuals.imgEstadoOn
        : visuals.imgEstadoOff;
  return (
    <span className="hf-switch-control">
      <input
        {...props}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        onFocus={(event) => {
          setFocused(event.currentTarget.matches(':focus-visible'));
          props.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          props.onBlur?.(event);
        }}
      />
      <img src={src} alt="" aria-hidden="true" />
    </span>
  );
}
