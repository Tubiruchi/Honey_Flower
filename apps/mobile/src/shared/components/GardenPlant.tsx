import { Button } from './Button';
import { PlantCharacter } from './PlantCharacter';

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
      <PlantCharacter
        species={species.toLocaleLowerCase('es').includes('cactus') ? 'cactus' : 'sprout'}
        view="face"
        decorative
      />
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
