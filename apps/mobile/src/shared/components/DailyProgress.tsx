export interface DailyProgressProps {
  value: number;
  label?: string;
  provisional?: boolean;
}

export function DailyProgress({
  value,
  label = 'Progreso del día',
  provisional,
}: DailyProgressProps) {
  const percent = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
  const formatted = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 }).format(percent);
  return (
    <section className="hf-progress hf-card" aria-label={label}>
      <div className="hf-row">
        <h2 className="hf-type-label-md">{label}</h2>
        <strong className="hf-type-data-md">{formatted} %</strong>
      </div>
      <progress max={100} value={percent} aria-label={label} />
      <p className="hf-muted">
        {provisional
          ? 'Progreso provisional, pendiente de sincronización.'
          : 'Agua y protector aportan la misma proporción.'}
      </p>
    </section>
  );
}
