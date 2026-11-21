import { useId, useRef, useState } from 'react';
import { CycleProgressPanel, MonthNavigator, Segment } from '../../shared/components';
import { useLocal } from './LocalProvider';
import { currentDay } from './model';
import {
  collectionDate,
  cycleProgress,
  gardenPlants,
  monthBounds,
  monthLabel,
} from '../analysis/model';
import { GardenScene } from '../analysis/GardenScene';
import { GardenCollectionList } from '../analysis/GardenCollectionList';
import '../analysis/analysis.css';

export function AnalysisScreen() {
  const { state: snapshot, now } = useLocal();
  const state = snapshot!;
  const bounds = monthBounds(state, now);
  // Keep a useful archive even during the first month, while preserving older real history.
  const firstBrowsableMonth = Math.min(bounds.first, bounds.last - 11);
  const [selectedMonth, setMonth] = useState(bounds.last);
  const month = Math.max(firstBrowsableMonth, Math.min(selectedMonth, bounds.last));
  const [collection, setCollection] = useState<'alive' | 'withered'>('alive');
  const [selectedCycle, setCycle] = useState<number | null>(null);
  const active = Math.min(Math.floor(currentDay(state, now) / 7), state.cycleStarts.length - 1);
  const progress = cycleProgress(state, now, selectedCycle ?? Math.max(0, active - 1));
  const monthPlants = gardenPlants(state, now, month);
  const plants = monthPlants.filter((plant) =>
    collection === 'alive' ? plant.survived : !plant.survived,
  );
  const label = monthLabel(month);
  const name = useId();
  const panel = useRef<HTMLDivElement>(null);
  const move = (direction: -1 | 1) =>
    setMonth(Math.max(firstBrowsableMonth, Math.min(month + direction, bounds.last)));
  const focusProgress = () => {
    requestAnimationFrame(() => {
      panel.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
      panel.current?.focus({ preventScroll: true });
    });
  };
  const openProgress = (index?: number) => {
    if (index !== undefined) setCycle(index);
    focusProgress();
  };
  return (
    <div className="local-screen analysis-screen">
      <header className="analysis-header">
        <h1 className="hf-type-heading-xl">Análisis</h1>
      </header>

      <div className="analysis-garden" aria-label="Colección mensual">
        <fieldset className="hf-garden-selector">
          <legend className="hf-sr-only">Colección de plantas</legend>
          <Segment
            name={name}
            label="Vivas"
            value="alive"
            checked={collection === 'alive'}
            onChange={() => setCollection('alive')}
          />
          <Segment
            name={name}
            label="Marchitas"
            value="withered"
            checked={collection === 'withered'}
            onChange={() => setCollection('withered')}
          />
        </fieldset>
        <div aria-live="polite" aria-atomic="true">
          <MonthNavigator
            month={label}
            count={`${plants.length} ${plants.length === 1 ? 'planta' : 'plantas'} ${collection === 'alive' ? (plants.length === 1 ? 'ganada' : 'ganadas') : plants.length === 1 ? 'marchita' : 'marchitas'} este mes`}
            previousDisabled={month <= firstBrowsableMonth}
            nextDisabled={month >= bounds.last}
            onPrevious={() => move(-1)}
            onNext={() => move(1)}
          />
        </div>
        <GardenScene
          plants={plants}
          collection={collection}
          month={label}
          onOpen={openProgress}
          onMove={move}
        />
        {plants.length > 0 && (
          <GardenCollectionList
            plants={plants}
            collection={collection}
            title={`${collection === 'alive' ? 'Tus plantas' : 'Tus ciclos'} de ${label.toLocaleLowerCase('es-MX')}`}
            formatDate={(at) => collectionDate(at, state)}
            onOpen={openProgress}
          />
        )}
      </div>
      <div
        ref={panel}
        tabIndex={-1}
        className="hf-analysis-progress analysis-progress"
        aria-label={`Progreso del ciclo ${progress.index + 1}`}
      >
        <CycleProgressPanel
          {...progress}
          state={progress.closed ? 'closed' : 'in-progress'}
          showChangeCycle={false}
          onChangeCycle={() => {}}
        />
      </div>
    </div>
  );
}
