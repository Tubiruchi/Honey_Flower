import type { ReactNode } from 'react';
import { Icon } from './Icon';
export function ProfileStat({
  label = 'Mayor racha',
  value = '14 días',
}: {
  label?: string;
  value?: string;
}) {
  return (
    <div className="hf-profile-stat">
      <p className="hf-type-data-lg">{value}</p>
      <p className="hf-type-label-sm">{label}</p>
    </div>
  );
}
export function SettingsLink({
  label = 'Horas de calma',
  detail = 'Sin avisos de 22:00 a 07:00',
  caution,
  icon,
  onClick,
}: {
  label?: string;
  detail?: string;
  caution?: boolean;
  icon?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={`hf-settings-link${caution ? ' hf-settings-link--caution' : ''}`}
      type="button"
      onClick={onClick}
    >
      {icon ?? <Icon name="moon" inheritColor />}
      <span className="hf-settings-link__text">
        <span className="hf-type-label-md">{label}</span>
        <span className="hf-type-caption">{detail}</span>
      </span>
      <span className="hf-settings-link__chevron">
        <Icon name="chevron" inheritColor />
      </span>
    </button>
  );
}
