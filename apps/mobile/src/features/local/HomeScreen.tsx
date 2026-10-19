import { useState } from 'react';
import {
  Button,
  CalendarDay,
  GreenhouseScene,
  Icon,
  Input,
  PlantCharacter,
  StreakBadge,
} from '../../shared/components';
import { useLocal } from './LocalProvider';
import {
  currentDay,
  cycleStats,
  DAY_MS,
  dayStart,
  dayStats,
  eventsAt,
  speciesAt,
  streaks,
} from './model';
import { date, number, percent, time } from './format';
import { Modal } from './Modal';

export function HomeScreen() {
  const local = useLocal();
  const state = local.state!;
  const today = currentDay(state, local.now);
  const cycle = Math.floor(today / 7);
  const [selection, setSelection] = useState<number | null>(null);
  const [custom, setCustom] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [undo, setUndo] = useState<string | null>(null);
  const selected = selection !== null && Math.floor(selection / 7) === cycle ? selection : today;
  const stats = dayStats(state, selected);
  const summary = cycleStats(state, cycle, local.now);
  const species = speciesAt(state, cycle);
  const start = dayStart(state, selected);
  const active = selected === today;
  const record = (kind: 'water' | 'sunscreen', value: number) => {
    try {
      const id = local.record(kind, value);
      setUndo(id);
      setMessage(kind === 'water' ? `${number(value)} mL registrados.` : 'Aplicación registrada.');
      setCustom(false);
      setAmount('');
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
            {date(local.now, state, { weekday: 'short', day: 'numeric', month: 'short' })} · Ciclo{' '}
            {date(state.cycleStarts[cycle]!, state)}–
            {date(state.cycleStarts[cycle]! + 7 * DAY_MS, state)}
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
            {date(start, state, { weekday: 'long', day: 'numeric', month: 'short' })} ·{' '}
            {active ? 'En curso' : selected > today ? 'Próximo' : 'Cerrado'}
          </p>
          <p className="hf-type-caption">
            Del {date(start, state)}, {time(start, state)} al {date(start + DAY_MS, state)},{' '}
            {time(start + DAY_MS, state)}
          </p>
        </div>
      </section>
      <section className="local-habits" aria-label="Progreso del día seleccionado">
        <div className="local-habit local-habit--water">
          <p>
            <Icon name="drop" inheritColor />
            Agua
          </p>
          <strong className="hf-type-data-md">{number(stats.water)} mL</strong>
          <span className="hf-type-caption">Meta: {number(stats.goals.water)} mL</span>
          <progress max={1} value={stats.waterProgress} aria-label="Meta de agua" />
        </div>
        <div className="local-habit local-habit--sun">
          <p>
            <Icon name="sun" inheritColor />
            Protector
          </p>
          <strong className="hf-type-data-md">
            {stats.sunscreen} de {stats.goals.sunscreen}
          </strong>
          <span className="hf-type-caption">1 inicial + {stats.goals.sunscreen - 1} reaplic.</span>
          <progress max={1} value={stats.sunscreenProgress} aria-label="Meta de protector" />
        </div>
      </section>
      <section className="local-plant-panel">
        <header>
          <div>
            <h2 className="hf-type-heading-md">Tu planta</h2>
            <p className="hf-type-caption">Estado según días cerrados</p>
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
            <PlantCharacter species={species} decorative />
          </div>
        </div>
        <div className="local-actions">
          <Button disabled={!active} onClick={() => record('water', 250)}>
            +250 mL
          </Button>
          <Button
            variant="sunscreen"
            disabled={!active || stats.sunscreenProgress >= 1}
            onClick={() => record('sunscreen', 1)}
          >
            {stats.sunscreenProgress >= 1 ? (
              'Meta registrada'
            ) : (
              <>
                Registrar
                <br />
                protector
              </>
            )}
          </Button>
        </div>
      </section>
      <div role="status" className="local-feedback" aria-live="polite">
        {message && (
          <>
            <span>{message}</span>
            {undo && (
              <button
                type="button"
                onClick={() => {
                  try {
                    local.remove(undo);
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
      {!active ? (
        <Button variant="secondary" onClick={() => setSelection(null)}>
          Ir al día en curso
        </Button>
      ) : (
        <section className="hf-stack local-other-water">
          <h2 className="hf-type-label-md">Otra cantidad de agua</h2>
          <div className="local-actions">
            <Button variant="secondary" onClick={() => record('water', 500)}>
              +500 mL
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setAmount('');
                setEditing(null);
                setCustom(true);
              }}
            >
              Personalizado
            </Button>
          </div>
          <p className="hf-type-caption hf-muted">
            Tu día de planta termina el {date(start + DAY_MS, state)}, a las{' '}
            {time(start + DAY_MS, state)}.
          </p>
        </section>
      )}
      <section className="local-records">
        <div className="hf-row">
          <h2 className="hf-type-heading-md">Tus registros</h2>
          <span className="hf-type-label-md">{percent(stats.progress)}</span>
        </div>
        {eventsAt(state, selected).length ? (
          <ul>
            {eventsAt(state, selected).map((event, index, all) => (
              <li key={event.id}>
                <Icon name={event.kind === 'water' ? 'drop' : 'sun'} />
                <div>
                  <p className="hf-type-label-md">
                    {event.kind === 'water'
                      ? `${number(event.amount)} mL de agua`
                      : all.slice(index + 1).some((e) => e.kind === 'sunscreen')
                        ? 'Reaplicación de protector'
                        : 'Aplicación inicial'}
                  </p>
                  <p className="hf-type-caption hf-muted">
                    {time(event.at, state)} · Registro manual
                  </p>
                </div>
                {active && event.kind === 'water' && (
                  <button
                    type="button"
                    aria-label={`Editar registro de agua de las ${time(event.at, state)}`}
                    onClick={() => {
                      setEditing(event.id);
                      setAmount(String(event.amount));
                      setCustom(true);
                    }}
                  >
                    Editar
                  </button>
                )}
                {active && (
                  <button
                    type="button"
                    aria-label={`Eliminar registro de ${event.kind === 'water' ? 'agua' : 'protector'} de las ${time(event.at, state)}`}
                    onClick={() => {
                      try {
                        local.remove(event.id);
                        setUndo(null);
                        setMessage('Registro eliminado.');
                      } catch (e) {
                        setMessage((e as Error).message);
                      }
                    }}
                  >
                    Eliminar
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="hf-muted">
            {selected > today
              ? 'Este día todavía no comienza.'
              : 'Aún no hay registros en este día de planta.'}
          </p>
        )}
        <p className="hf-type-caption hf-muted">
          Los dos hábitos cuentan por igual. Los días cerrados conservan sus registros.
        </p>
      </section>
      <section className="local-message hf-stack">
        <h2 className="hf-type-label-md">Un registro a la vez</h2>
        <p className="hf-muted">
          {state.preferences.tone === 'gentle'
            ? 'Un pequeño cuidado a la vez. Aquí te acompaño.'
            : state.preferences.tone === 'medium'
              ? 'Tu vaso y yo seguimos esperando nuestra aparición del día.'
              : 'Tu vaso no se llena con buenas intenciones. Hagamos nuestra parte.'}
        </p>
      </section>
      {custom && (
        <Modal
          title={editing ? 'Editar registro' : 'Registrar agua'}
          onClose={() => setCustom(false)}
        >
          <form
            className="hf-stack"
            onSubmit={(event) => {
              event.preventDefault();
              if (editing) {
                try {
                  local.edit(editing, Number(amount));
                  setCustom(false);
                  setEditing(null);
                  setUndo(null);
                  setMessage('Registro actualizado.');
                } catch (e) {
                  setMessage((e as Error).message);
                }
              } else record('water', Number(amount));
            }}
          >
            <Input
              label="Cantidad en mL"
              type="number"
              min={1}
              max={10000}
              step={1}
              required
              value={amount}
              leadingIcon={<Icon name="drop" inheritColor />}
              onChange={(e) => setAmount(e.target.value)}
              help="Cantidad que tú confirmas haber bebido."
            />
            <Button type="submit">{editing ? 'Guardar registro' : 'Confirmar registro'}</Button>
            <p role="status">{message}</p>
          </form>
        </Modal>
      )}
    </div>
  );
}
