import { Icon } from './Icon';
export function StreakBadge({ days = 2 }: { days?: number }) {
  return (
    <div
      className="hf-streak-badge"
      role="img"
      aria-label={`Racha de ${days} ${days === 1 ? 'día' : 'días'}`}
    >
      <Icon name="flash" inheritColor />
      <span>{days}</span>
    </div>
  );
}
