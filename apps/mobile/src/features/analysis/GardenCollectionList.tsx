import { GardenCollectionRow } from '../../shared/components';
import type { GardenPlant } from './model';

export function GardenCollectionList({
  plants,
  collection,
  title,
  formatDate,
  onOpen,
}: {
  plants: readonly GardenPlant[];
  collection: 'alive' | 'withered';
  title: string;
  formatDate: (at: number) => string;
  onOpen: (index: number) => void;
}) {
  return (
    <section
      className="analysis-collection"
      aria-label={collection === 'alive' ? 'Plantas ganadas' : 'Plantas archivadas'}
    >
      <h2 className="hf-type-data-md">{title}</h2>
      {[...plants]
        .sort((a, b) => b.endedAt - a.endedAt)
        .map((plant) => (
          <GardenCollectionRow
            key={plant.id}
            name={`${plant.species === 'sprout' ? 'Brote' : 'Cactus'} · Ciclo ${plant.index + 1}`}
            species={plant.species}
            health={plant.survived ? 'healthy' : 'withered'}
            date={`${formatDate(plant.endedAt)} · ${(plant.progress * 100).toFixed(1)} % · Cierre local`}
            onOpen={() => onOpen(plant.index)}
          />
        ))}
      {plants.some((plant) => plant.slot >= 5) && (
        <p className="hf-type-caption hf-secondary">
          La lista contiene todas tus plantas, incluidas las que no caben en el patio.
        </p>
      )}
    </section>
  );
}
