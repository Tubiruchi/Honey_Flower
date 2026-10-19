import { useState } from 'react';
import { Button, Icon, PlantCharacter } from '../../shared/components';
import { useLocal } from './LocalProvider';
import { completedCycles, currentDay, cycleStats, DAY_MS, dayStart, dayStats } from './model';
import type { LocalState } from './model';
import { date, percent } from './format';

function Chart({
  state,
  days,
  kind,
  today,
}: {
  state: LocalState;
  days: number[];
  kind: 'water' | 'sunscreen';
  today: number;
}) {
  const groups =
    days.length <= 7
      ? days.map((day) => [day])
      : Array.from({ length: 7 }, (_, i) =>
          days.filter((_, index) => Math.floor((index * 7) / days.length) === i),
        );
  return (
    <section className={`local-chart local-chart--${kind}`}>
      <header>
        <Icon name={kind === 'water' ? 'drop' : 'sun'} />
        <h2 className="hf-type-label-md">{kind === 'water' ? 'Agua' : 'Protector solar'}</h2>
        <span className="hf-type-caption">
          {percent(
            dayStats(state, today)[kind === 'water' ? 'waterProgress' : 'sunscreenProgress'],
          )}{' '}
          en curso
        </span>
      </header>
      <div className="local-chart__bars">
        {groups.map((group, index) => {
          const known = group.filter((day) => day <= today);
          const value = known.length
            ? known.reduce(
                (sum, day) =>
                  sum +
                  dayStats(state, day)[kind === 'water' ? 'waterProgress' : 'sunscreenProgress'],
                0,
              ) / known.length
            : null;
          const at = dayStart(state, group[0]!);
          const label = date(at, state, { weekday: 'short', day: 'numeric' }).replace('.', '');
          return (
            <div className="local-chart__day" key={index}>
              <span>{value === null ? '—' : percent(value)}</span>
              <div
                className={`local-chart__track${group.includes(today) ? ' is-current' : ''}`}
                role="img"
                aria-label={`${label}: ${value === null ? 'próximo' : percent(value)}`}
              >
                <span style={{ height: `${(value ?? 0) * 100}%` }} />
              </div>
              <span>{label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
export function AnalysisScreen() {
  const { state: snapshot, now } = useLocal();
  const state = snapshot!;
  const today = currentDay(state, now);
  const cycle = Math.floor(today / 7);
  const summary = cycleStats(state, cycle, now);
  const [scope, setScope] = useState('week');
  const [collection, setCollection] = useState<'alive' | 'withered'>('alive');
  const [detail, setDetail] = useState<number | null>(null);
  const cycles = completedCycles(state, now);
  const plants = cycles.filter((c) => (collection === 'alive' ? c.survived : !c.survived));
  const from = scope === 'week' ? cycle * 7 : scope === 'month' ? Math.max(0, today - 29) : 0;
  const days = Array.from({ length: scope === 'week' ? 7 : today - from + 1 }, (_, i) => from + i);
  return (
    <div className="local-analysis local-screen">
      <header>
        <h1 className="hf-type-heading-lg">Análisis</h1>
        <p className="hf-type-caption hf-muted">
          Tus registros y tu constancia, en este dispositivo
        </p>
      </header>
      <section className="local-garden">
        <div className="hf-row">
          <h2 className="hf-type-heading-md">Tu jardín</h2>
          <span className="hf-type-caption">{cycles.filter((c) => c.survived).length} plantas</span>
        </div>
        <div className="local-tabs" role="group" aria-label="Colección">
          <button
            type="button"
            aria-pressed={collection === 'alive'}
            onClick={() => setCollection('alive')}
          >
            Vivas · {cycles.filter((c) => c.survived).length}
          </button>
          <button
            type="button"
            aria-pressed={collection === 'withered'}
            onClick={() => setCollection('withered')}
          >
            Marchitas · {cycles.filter((c) => !c.survived).length}
          </button>
        </div>
        {plants.length ? (
          <div className="local-collection">
            {plants.map((plant) => (
              <button
                type="button"
                key={plant.index}
                onClick={() => setDetail(detail === plant.index ? null : plant.index)}
                aria-expanded={detail === plant.index}
              >
                <PlantCharacter species={plant.species} view="face" decorative />
                <span className="hf-type-label-sm">Planta {plant.index + 1}</span>
                <span className="hf-type-caption">
                  {date(state.cycleStarts[plant.index]! + 7 * DAY_MS, state)}
                </span>
                {detail === plant.index && <span>{percent(plant.progress)} al cierre</span>}
              </button>
            ))}
          </div>
        ) : (
          <div className="local-empty">
            <Icon name="leaf" />
            <p>
              {collection === 'alive'
                ? 'Aquí crecerá tu colección.'
                : 'No tienes ciclos marchitos.'}
            </p>
            <p className="hf-type-caption hf-muted">
              El ciclo dura siete días de planta. Los resultados aparecerán al cerrarse.
            </p>
          </div>
        )}
      </section>
      <div className="local-tabs" role="group" aria-label="Periodo de análisis">
        {[
          ['week', 'Semanal'],
          ['month', 'Mensual'],
          ['all', 'Todo'],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={scope === value}
            onClick={() => setScope(value!)}
          >
            {label}
          </button>
        ))}
      </div>
      <Chart state={state} days={days} kind="water" today={today} />
      <Chart state={state} days={days} kind="sunscreen" today={today} />
      <section className="local-cycle">
        <div className="hf-row">
          <h2 className="hf-type-label-md">Tu ciclo, en progreso</h2>
          <strong className="hf-type-heading-lg">{percent(summary.progress)}</strong>
        </div>
        <progress max={1} value={summary.progress} aria-label="Progreso semanal" />
        <p className="hf-type-caption">Provisional · Meta al cierre: 80%</p>
        <p className="hf-muted">
          {summary.closed} días cerrados de 7. El día en curso lleva{' '}
          {percent(dayStats(state, today).progress)}. Los próximos días siguen pendientes.
        </p>
        <p className="hf-type-caption hf-muted">
          Cierre:{' '}
          {date(state.cycleStarts[cycle]! + 7 * DAY_MS, state, {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
          .
        </p>
      </section>
      <section className="hf-stack">
        <h2 className="hf-type-heading-md">Cada día cuenta</h2>
        <p className="hf-muted">
          Agua y protector aportan el mismo peso. Un guion indica un día futuro; no cuenta como un
          hábito incumplido. En Mensual y Todo las barras agrupan los registros del periodo.
        </p>
        <Button
          variant="text"
          onClick={() => {
            setScope('week');
            setDetail(null);
          }}
        >
          Ver ciclo actual
        </Button>
      </section>
    </div>
  );
}
