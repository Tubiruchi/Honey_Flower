import { Sprout } from 'lucide-react';
import type { PlantHealth } from '@honeyflower/contracts';

export interface PlantStatusProps {
  name: string;
  health: PlantHealth;
  day: number;
  message: string;
  provisional?: boolean;
}

const labels: Record<PlantHealth, string> = {
  healthy: 'Saludable',
  neglected: 'Descuidada',
  withered: 'Marchita',
};

/** El estado se recibe del dominio; el progreso del día abierto no lo recalcula. */
export function PlantStatus({ name, health, day, message, provisional }: PlantStatusProps) {
  return (
    <article className="hf-plant hf-card" aria-label={`Estado de ${name}`}>
      <div className="hf-row">
        <span className="hf-type-label-sm">Tu compañera de hábitos</span>
        <span className="hf-chip">Día {day} de 7</span>
      </div>
      <Sprout
        className={`hf-plant__symbol hf-plant__symbol--${health}`}
        size={88}
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <h2 className="hf-type-heading-lg">{name}</h2>
      <p className={`hf-health hf-health--${health}`}>{labels[health]}</p>
      <p className="hf-plant__message">«{message}»</p>
      {provisional && <p className="hf-muted">Estado provisional hasta sincronizar.</p>}
    </article>
  );
}
