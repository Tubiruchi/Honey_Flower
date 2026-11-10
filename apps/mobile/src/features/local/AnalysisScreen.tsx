import { useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, CycleProgressPanel, MonthNavigator, Segment } from '../../shared/components';
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
  const navigate = useNavigate();
  const bounds = monthBounds(state, now);
  const [selectedMonth, setMonth] = useState(bounds.last);
  const month = Math.max(bounds.first, Math.min(selectedMonth, bounds.last));
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
    setMonth(Math.max(bounds.first, Math.min(month + direction, bounds.last)));
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
        <p className="hf-type-body-sm hf-secondary">
          Tu jardín y tu progreso, en este dispositivo.
        </p>
      </header>
      <Button variant="text" onClick={() => openProgress()}>
        Ver progreso de mi ciclo
      </Button>
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
            previousDisabled={month <= bounds.first}
            nextDisabled={month >= bounds.last}
            onPrevious={() => move(-1)}
            onNext={() => move(1)}
          />
        </div>
        {collection === 'alive' ? (
          <GardenScene plants={plants} month={label} onOpen={openProgress} onMove={move} />
        ) : (
          <section className="analysis-archive">
            <h2 className="hf-type-heading-md">Archivo de plantas marchitas</h2>
            <p className="hf-type-body-sm hf-secondary">
              Cada ciclo conserva su historia. Puedes consultar su progreso y empezar de nuevo con
              tu planta actual.
            </p>
          </section>
        )}
        <div className="analysis-month-dots" aria-hidden="true">
          {Array.from({ length: Math.min(7, bounds.last - bounds.first + 1) }, (_, i) => {
            const firstDot = Math.max(bounds.first, Math.min(month - 3, bounds.last - 6));
            return <span key={i} data-active={firstDot + i === month} />;
          })}
        </div>
        <p className="analysis-month-help hf-type-caption">
          {collection === 'alive' && bounds.first !== bounds.last
            ? 'Desliza para cambiar de mes o usa las flechas.'
            : bounds.first === bounds.last
              ? 'Tu primer mes de jardín.'
              : 'Usa las flechas para cambiar de mes.'}
        </p>
        {plants.length === 0 ? (
          <section className="analysis-empty">
            <h2 className="hf-type-data-md">
              {collection === 'alive'
                ? 'Tu jardín está por florecer'
                : 'No hay plantas marchitas este mes'}
            </h2>
            <p className="hf-type-body-sm hf-secondary">
              {collection === 'alive'
                ? 'Cada planta que sobreviva a su ciclo llegará a este jardín. Una planta por semana, reunidas por el mes de cierre.'
                : 'Los ciclos que cierren por debajo de la meta aparecerán en este archivo.'}
            </p>
            <Button onClick={() => navigate('/inicio')}>Ver planta actual</Button>
          </section>
        ) : (
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
          showChangeCycle={active > 0}
          onChangeCycle={() => {
            setCycle(progress.closed ? active : active - 1);
            focusProgress();
          }}
        />
        <p className="hf-type-caption hf-secondary">
          Agua y protector aportan el mismo peso. Cada día cuenta hasta el 100 % de su meta
          histórica; el promedio se calcula sobre siete días. Un excedente no compensa otro día.
        </p>
      </div>
    </div>
  );
}
