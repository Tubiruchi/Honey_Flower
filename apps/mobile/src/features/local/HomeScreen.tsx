import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { DayHabitSummary } from '../records/DayHabitSummary';
import {
  Button,
  CalendarDay,
  GreenhouseScene,
  PlantCharacter,
  StreakBadge,
} from '../../shared/components';
import { useLocal } from './LocalProvider';
import { DAY_MS, dayStart, streaks } from './model';
import { date, number, percent, time } from './format';
import { confirmed } from '../../shared/data/localSnapshot';
import { homeState } from '../home/model';
import { waterPhotoTrigger } from '../water/policy';
import { sunscreenState } from '../sunscreen/model';

export function HomeScreen() {
  const local = useLocal();
  const location = useLocation();
  const navigate = useNavigate();
  const state = local.state!;
  const sun = sunscreenState(state, local.now);
  const [selection, setSelection] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [undo, setUndo] = useState<{ id: string; closesAt: number } | null>(null);
  const { today, cycle, selected, stats, summary, species, start, active } = homeState(
    state,
    local.now,
    selection,
  );
  const cycleEnd = state.cycleStarts[cycle]! + 7 * DAY_MS;
  const sameMonth =
    date(state.cycleStarts[cycle]!, state, { month: 'numeric', year: 'numeric' }) ===
    date(cycleEnd, state, { month: 'numeric', year: 'numeric' });
  const cycleLabel = sameMonth
    ? `${date(state.cycleStarts[cycle]!, state, { day: 'numeric' })}–${date(cycleEnd, state)}`
    : `${date(state.cycleStarts[cycle]!, state)}–${date(cycleEnd, state)}`;
  const selectedDate = date(start, state, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }).replace(' de ', ' ');
  const record = async (kind: 'water' | 'sunscreen', value: number) => {
    if (kind === 'sunscreen') {
      void navigate('/inicio/protector', { state: { from: '/inicio' } });
      return;
    }
    const capture = () =>
      void navigate('/inicio/agua', { state: { capture: true, amount: value, from: '/inicio' } });
    if (kind === 'water' && waterPhotoTrigger(state, local.now)) {
      capture();
      return;
    }
    try {
      const response = await local.record(kind, value);
      if (response.status === 'failed' && response.reason === 'capture-required') {
        capture();
        return;
      }
      const result = confirmed(response);
      setUndo({ id: result.operationId, closesAt: start + DAY_MS });
      setMessage(kind === 'water' ? `${number(value)} mL registrados.` : 'Aplicación registrada.');
    } catch (error) {
      setMessage((error as Error).message);
    }
  };
  return (
    <div className="local-home local-screen">
      <header className="local-greeting">
        <div>
          <h1 className="hf-type-heading-lg">Hola, {state.preferences.preferredName}</h1>
          <p className="hf-type-caption">
            Hoy,{' '}
            {date(local.now, state, { weekday: 'short', day: 'numeric', month: 'short' }).replace(
              ' de ',
              ' ',
            )}{' '}
            · Ciclo {cycleLabel}
          </p>
        </div>
        <StreakBadge days={streaks(state, local.now).current} />
      </header>
      <section aria-label="Calendario del ciclo" className="local-calendar">
        <div className="local-calendar__days">
          {summary.days.map((day) => {
            const at = dayStart(state, day.day);
            return (
              <CalendarDay
                key={day.day}
                day={date(at, state, { weekday: 'short' }).replace('.', '')}
                date={date(at, state, { day: 'numeric' })}
                selected={selected === day.day}
                today={day.day === today}
                species={species}
                health={summary.health}
                state={
                  day.day > today
                    ? 'future'
                    : day.complete
                      ? 'complete'
                      : day.progress > 0
                        ? 'partial'
                        : 'missed'
                }
                progress={Math.floor(day.progress * 100)}
                onSelect={() => setSelection(day.day)}
              />
            );
          })}
        </div>
        <div className="local-window">
          <p className="hf-type-label-md">
            {selectedDate.charAt(0).toLocaleUpperCase('es-MX') + selectedDate.slice(1)} ·{' '}
            {active ? 'En curso' : selected > today ? 'Próximo' : 'Cerrado'}
          </p>
          <p className="hf-type-caption">
            Del {date(start, state)}, {time(start, state)} al {date(start + DAY_MS, state)},{' '}
            {time(start + DAY_MS, state)}
          </p>
        </div>
      </section>
      <DayHabitSummary day={selected} />
      <section className="local-plant-panel">
        <header>
          <div>
            <h2 className="hf-type-heading-md">Tu planta</h2>
            <p className="hf-type-caption">
              {summary.health === 'healthy'
                ? 'Estado según días cerrados'
                : `${percent(summary.healthScore).replace('%', ' %')} · ${summary.closed} ${summary.closed === 1 ? 'día cerrado' : 'días cerrados'}`}
            </p>
          </div>
          <span className={`local-health local-health--${summary.health}`}>
            {
              { healthy: 'Saludable', neglected: 'Descuidada', withered: 'Marchita' }[
                summary.health
              ]
            }
          </span>
        </header>
        <div className="local-scene">
          <GreenhouseScene />
          <div className="local-scene__character">
            <PlantCharacter species={species} health={summary.health} />
          </div>
        </div>
        <div className="local-actions">
          <Button disabled={!active || local.busy} onClick={() => void record('water', 250)}>
            +250 mL
          </Button>
          <Button
            variant="sunscreen"
            disabled={!active || local.busy || stats.sunscreenProgress >= 1}
            onClick={() => void record('sunscreen', 1)}
          >
            {stats.sunscreenProgress >= 1 ? (
              'Meta registrada'
            ) : sun.available ? (
              <>
                Registrar
                <br />
                protector
              </>
            ) : (
              <>
                Ver horarios
                <br />
                de protector
              </>
            )}
          </Button>
        </div>
      </section>
      <div role="status" className="local-feedback" aria-live="polite">
        {message && (
          <>
            <span>{message}</span>
            {undo && active && local.now < undo.closesAt && (
              <button
                type="button"
                disabled={local.busy}
                onClick={async () => {
                  try {
                    confirmed(await local.undo(undo.id));
                    setUndo(null);
                    setMessage('Registro deshecho.');
                  } catch (e) {
                    setMessage((e as Error).message);
                  }
                }}
              >
                Deshacer
              </button>
            )}
          </>
        )}
      </div>
      <Link
        id="home-records"
        className="local-records-link"
        to={`/perfil/registros?dia=${selected}`}
        state={{ from: '/inicio', sourceKey: location.key, day: selected }}
      >
        Ver todos los registros
      </Link>
    </div>
  );
}
