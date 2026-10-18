export interface PlantDay {
  day: number;
  state: 'complete' | 'partial' | 'missed' | 'current' | 'future';
}

export interface WeeklyGridProps {
  days: readonly PlantDay[];
}

const labels: Record<PlantDay['state'], string> = {
  complete: 'Completo',
  partial: 'Parcial',
  missed: 'Sin registros',
  current: 'Actual',
  future: 'Próximo',
};

export function WeeklyGrid({ days }: WeeklyGridProps) {
  return (
    <section className="hf-card" aria-label="Semana de tu planta">
      <h2 className="hf-type-heading-md">Un día a la vez</h2>
      <p className="hf-muted">Cada día de planta dura 24 horas desde la activación.</p>
      <ol className="hf-week">
        {days.map(({ day, state }) => (
          <li
            key={day}
            className={`hf-week__day hf-week__day--${state}`}
            aria-current={state === 'current' ? 'step' : undefined}
          >
            <strong>D{day}</strong>
            <span>{labels[state]}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
