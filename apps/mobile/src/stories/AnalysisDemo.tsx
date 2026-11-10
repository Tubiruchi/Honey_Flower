import { useId, useRef, useState } from 'react';
import {
  AsyncContentState,
  BottomNavigation,
  Button,
  CycleProgressPanel,
  GardenBackdrop,
  GardenCollectionRow,
  MonthNavigator,
  PlantCharacter,
  Segment,
} from '../shared/components';
import { phase2Assets } from '../assets/figma/components/phase2';
import { closedCycle, currentCycle } from './fixtures/phase2';

const slots = [
  {
    x: 40.84,
    y: 56.64,
    w: 132.923,
    h: 108,
    sx: 85.3,
    sy: 160.64,
    species: 'sprout' as const,
    name: 'Brote sarcástico',
    date: '18 sep',
  },
  {
    x: 203.64,
    y: 86.88,
    w: 132.923,
    h: 108,
    sx: 248.1,
    sy: 190.88,
    species: 'cactus' as const,
    name: 'Cactus dramático',
    date: '25 sep',
  },
  {
    x: 34.68,
    y: 187.04,
    w: 137.846,
    h: 112,
    sx: 81.6,
    sy: 295.04,
    species: 'cactus' as const,
    name: 'Cactus dramático',
    date: '11 sep',
  },
  {
    x: 204.88,
    y: 213.92,
    w: 137.846,
    h: 112,
    sx: 251.8,
    sy: 321.92,
    species: 'sprout' as const,
    name: 'Brote sarcástico',
    date: '4 sep',
  },
  {
    x: 130,
    y: 153,
    w: 110,
    h: 90,
    sx: 0,
    sy: 0,
    species: 'sprout' as const,
    name: 'Brote sarcástico',
    date: '27 sep',
  },
];
export interface AnalysisDemoProps {
  count?: 0 | 1 | 2 | 4 | 5;
  initialRead?: 'ready' | 'loading' | 'error';
}
export function AnalysisDemo({ count = 4, initialRead = 'ready' }: AnalysisDemoProps) {
  const collectionName = useId();
  const [read, setRead] = useState(initialRead);
  const [month, setMonth] = useState(8);
  const [collection, setCollection] = useState<'alive' | 'withered'>('alive');
  const [current, setCurrent] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const progress = useRef<HTMLDivElement>(null);
  const shown = month === 8 ? count : 0;
  const monthText = new Intl.DateTimeFormat('es-MX', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
    .format(new Date(Date.UTC(2026, month, 1)))
    .replace(' de ', ' ');
  const monthLabel = monthText.charAt(0).toUpperCase() + monthText.slice(1);
  const scene = slots.slice(0, shown);
  const ordered = [...scene].sort((a, b) => Number.parseInt(b.date) - Number.parseInt(a.date));
  const scroll = (node: HTMLDivElement | null) => {
    node?.scrollIntoView({
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'start',
    });
    node?.focus({ preventScroll: true });
  };
  return (
    <div className="hf-preview-phone">
      <main className="hf-preview-scroll" aria-label="Análisis">
        <h1 className="hf-type-heading-xl">Análisis</h1>
        <p className="hf-type-body-sm hf-secondary">
          Tu jardín y tu progreso, en este dispositivo.
        </p>
        {read !== 'ready' ? (
          <AsyncContentState
            state={read}
            title={read === 'error' ? 'No pudimos leer tu jardín' : 'Cargando tu jardín'}
            description={
              read === 'error'
                ? 'Tus plantas se conservan. Reintenta para volver a consultarlas.'
                : 'Estamos leyendo las plantas y el progreso guardados.'
            }
            onRetry={read === 'error' ? () => setRead('ready') : undefined}
          />
        ) : (
          <>
            <Button variant="text" onClick={() => scroll(progress.current)}>
              Ver progreso de mi ciclo
            </Button>
            <fieldset className="hf-garden-selector">
              <legend className="hf-sr-only">Colección de plantas</legend>
              <Segment
                name={collectionName}
                label="Vivas"
                value="alive"
                checked={collection === 'alive'}
                onChange={() => setCollection('alive')}
              />
              <Segment
                name={collectionName}
                label="Marchitas"
                value="withered"
                checked={collection === 'withered'}
                onChange={() => setCollection('withered')}
              />
            </fieldset>
            <MonthNavigator
              month={monthLabel}
              count={`${shown} plantas ganadas este mes`}
              nextDisabled={month >= 9}
              onPrevious={() => setMonth((previous) => previous - 1)}
              onNext={() => setMonth((previous) => Math.min(9, previous + 1))}
            />
            <div
              className="hf-garden-scene"
              role="img"
              aria-label={`Jardín con ${shown} plantas ${collection === 'alive' ? 'vivas' : 'marchitas'}`}
            >
              <GardenBackdrop />
              {[...scene]
                .sort((a, b) => a.y - b.y)
                .map((slot) => (
                  <span key={slot.date}>
                    {slot.sx !== 0 && (
                      <img
                        className="hf-garden-scene__support"
                        src={phase2Assets.gardenSupport}
                        style={{
                          left: `${(slot.sx / 370) * 100}%`,
                          top: `${(slot.sy / 336) * 100}%`,
                        }}
                        alt=""
                      />
                    )}
                    <span
                      className="hf-garden-scene__plant"
                      style={{
                        left: `${(slot.x / 370) * 100}%`,
                        top: `${(slot.y / 336) * 100}%`,
                        width: `${(slot.w / 370) * 100}%`,
                        height: `${(slot.h / 336) * 100}%`,
                      }}
                    >
                      <PlantCharacter
                        species={slot.species}
                        health={collection === 'alive' ? 'healthy' : 'withered'}
                        decorative
                      />
                    </span>
                  </span>
                ))}
            </div>
            {shown === 0 ? (
              <AsyncContentState
                state="empty"
                title="Tu jardín sigue creciendo"
                description="Este mes todavía no tiene plantas en esta colección. Puedes consultar otro mes."
              />
            ) : (
              <>
                <h2 className="hf-type-heading-md">Tu colección</h2>
                <div className="hf-story-content">
                  {ordered.map((slot) => (
                    <GardenCollectionRow
                      key={slot.date}
                      name={slot.name}
                      species={slot.species}
                      health={collection === 'alive' ? 'healthy' : 'withered'}
                      date={`${slot.date} · Ciclo completado`}
                      onOpen={() => {
                        setDetail(`${slot.name} · ${slot.date}`);
                        scroll(progress.current);
                      }}
                    />
                  ))}
                </div>
              </>
            )}
            {detail && (
              <p className="hf-type-caption" role="status">
                {detail}
              </p>
            )}
            <div ref={progress} tabIndex={-1} className="hf-analysis-progress">
              <CycleProgressPanel
                {...(current ? currentCycle : closedCycle)}
                onChangeCycle={() => setCurrent(!current)}
              />
            </div>
          </>
        )}
      </main>
      <footer className="hf-preview-nav">
        <BottomNavigation active="garden" onNavigate={() => {}} />
      </footer>
    </div>
  );
}
