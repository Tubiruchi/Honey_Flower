import { Flower2 } from 'lucide-react';
import { Button } from './Button';

export interface GardenPlantProps {
  name: string;
  species: string;
  cycleLabel: string;
  result: 'survived' | 'withered';
  onOpen: () => void;
}

export function GardenPlant({ name, species, cycleLabel, result, onOpen }: GardenPlantProps) {
  return (
    <article className="hf-garden-plant hf-card" aria-label={name}>
      <Flower2 size={48} aria-hidden="true" />
      <h2 className="hf-type-heading-md">{name}</h2>
      <p>
        {species} · {cycleLabel}
      </p>
      <span className="hf-chip">
        {result === 'survived' ? 'En tu jardín' : 'En el historial de marchitas'}
      </span>
      <Button variant="secondary" onClick={onOpen}>
        Ver {name}
      </Button>
    </article>
  );
}
