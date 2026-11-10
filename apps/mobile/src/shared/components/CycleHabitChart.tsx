import { useId } from 'react';
import type { HabitKind } from '@honeyflower/contracts';
import { Icon } from './Icon';
export interface CycleChartDay {
  id: string;
  day: string;
  date: string;
  value: number | null;
  goal?: number;
  state: 'closed' | 'current' | 'future';
}
export interface CycleHabitChartProps {
  kind: HabitKind;
  period: 'closed' | 'in-progress';
  days: readonly CycleChartDay[];
  totalLabel: string;
  goal: number;
  note: string;
  detail: string;
}
export function CycleHabitChart({
  kind,
  period,
  days,
  totalLabel,
  goal,
  note,
  detail,
}: CycleHabitChartProps) {
  const id = useId();
  const title = kind === 'water' ? 'Agua' : 'Protector solar';
  const variableGoals = new Set(days.map((day) => day.goal ?? goal)).size > 1;
  const scale = Math.max(goal, ...days.map((d) => (d.state === 'future' ? 0 : (d.value ?? 0))), 1);
  return (
    <section
      className={`hf-cycle-chart hf-cycle-chart--${kind}`}
      aria-labelledby={id}
      data-period={period}
    >
      <div className="hf-cycle-chart__heading">
        <Icon name={kind === 'water' ? 'drop' : 'sun'} inheritColor />
        <h3 id={id} className="hf-type-data-md">
          {title}
        </h3>
      </div>
      <p className="hf-type-label-md hf-cycle-chart__total">{totalLabel}</p>
      <ol className="hf-cycle-chart__plot">
        {days.map((d) => {
          const future = d.state === 'future';
          return (
            <li
              key={d.id}
              className="hf-cycle-chart__column"
              data-state={d.state}
              aria-label={`${d.day} ${d.date}: ${future ? 'pendiente, día futuro' : `${d.value ?? 0} ${kind === 'water' ? 'mL' : 'aplicaciones'}, ${d.state === 'current' ? 'en curso' : 'cerrado'}`}${d.goal === undefined ? '' : ` · meta ${d.goal} ${kind === 'water' ? 'mL' : 'aplicaciones'}`}`}
            >
              <div className="hf-cycle-chart__bar-area" aria-hidden="true">
                <span className="hf-type-caption">{future ? '—' : (d.value ?? 0)}</span>
                {!future && (
                  <span
                    className="hf-cycle-chart__bar"
                    style={{ height: `${((d.value ?? 0) / scale) * 72}px` }}
                  />
                )}
              </div>
              <span className="hf-cycle-chart__date hf-type-caption" aria-hidden="true">
                <span>{d.day}</span>
                <span>{d.date}</span>
                {variableGoals && (
                  <span className="hf-cycle-chart__goal">
                    Meta
                    <br />
                    {(d.goal ?? goal).toLocaleString('es-MX')}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="hf-type-caption hf-cycle-chart__note">
        {note}
        <br />
        {detail}
      </p>
    </section>
  );
}
