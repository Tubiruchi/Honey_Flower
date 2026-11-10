import { CycleProgressSummary } from './CycleProgressSummary';
import type { CycleProgressSummaryProps } from './CycleProgressSummary';
import { CycleHabitChart } from './CycleHabitChart';
import type { CycleHabitChartProps } from './CycleHabitChart';
import { Button } from './Button';
export interface CycleProgressPanelProps {
  state: 'closed' | 'in-progress';
  range: string;
  summary: Omit<CycleProgressSummaryProps, 'state'>;
  water: Omit<CycleHabitChartProps, 'kind' | 'period'>;
  sunscreen: Omit<CycleHabitChartProps, 'kind' | 'period'>;
  onChangeCycle: () => void;
  showChangeCycle?: boolean;
}
export function CycleProgressPanel({
  state,
  range,
  summary,
  water,
  sunscreen,
  onChangeCycle,
  showChangeCycle = true,
}: CycleProgressPanelProps) {
  return (
    <section className="hf-cycle-panel" aria-label="Progreso de tu ciclo">
      <h2 className="hf-type-heading-md">Progreso de tu ciclo</h2>
      <p className="hf-type-caption hf-cycle-panel__range">{range}</p>
      <CycleProgressSummary {...summary} state={state} />
      <CycleHabitChart {...water} kind="water" period={state} />
      <CycleHabitChart {...sunscreen} kind="sunscreen" period={state} />
      {showChangeCycle && (
        <Button variant="text" onClick={onChangeCycle}>
          {state === 'closed' ? 'Ver ciclo en curso' : 'Ver último ciclo cerrado'}
        </Button>
      )}
    </section>
  );
}
