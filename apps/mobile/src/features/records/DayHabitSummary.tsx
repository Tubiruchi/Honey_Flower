import { HabitSummary } from '../../shared/components';
import { useLocal } from '../local/LocalProvider';
import { dayStats } from '../local/model';
import { number } from '../local/format';

export function DayHabitSummary({ day }: { day: number }) {
  const state = useLocal().state!;
  const stats = dayStats(state, day);
  return (
    <section className="local-habits" aria-label="Progreso del día seleccionado">
      <HabitSummary
        kind="water"
        layout="metric"
        value={`${number(stats.water)} mL`}
        progress={stats.waterProgress}
      >
        <p className="hf-type-caption">Meta: {number(stats.goals.water)} mL</p>
      </HabitSummary>
      <HabitSummary
        kind="sunscreen"
        layout="metric"
        label="Protector"
        value={`${stats.sunscreen} de ${stats.goals.sunscreen}`}
        progress={stats.sunscreenProgress}
      >
        <p className="hf-type-caption">1 inicial + {stats.goals.sunscreen - 1} reaplic.</p>
      </HabitSummary>
    </section>
  );
}
