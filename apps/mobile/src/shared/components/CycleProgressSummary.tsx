export interface CycleProgressSummaryProps {
  state: 'closed' | 'in-progress';
  percentage: number;
  description: string;
  outcome?: 'survived' | 'withered';
}
export function CycleProgressSummary({
  state,
  percentage,
  description,
  outcome,
}: CycleProgressSummaryProps) {
  return (
    <section
      className={`hf-cycle-summary hf-cycle-summary--${state}`}
      aria-label={state === 'closed' ? 'Ciclo cerrado' : 'Ciclo en curso'}
      data-outcome={state === 'closed' ? outcome : undefined}
    >
      <h3 className="hf-type-label-md">
        {state === 'closed' ? 'Ciclo cerrado' : 'Ciclo en curso'}
      </h3>
      <p className="hf-type-heading-xl">{percentage.toFixed(1)} %</p>
      <p className="hf-type-body-sm">{description}</p>
    </section>
  );
}
