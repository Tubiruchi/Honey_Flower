import { Icon } from './Icon';
export function StreakBadge({ days = 2 }: { days?: number }) {
  return (
    <div className="hf-streak-badge">
      <Icon name="flash" inheritColor />
      <span>Racha: {days} días</span>
    </div>
  );
}
