import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AsyncContentState,
  Button,
  IconButton,
  RecordDayNavigator,
  RecordDelete,
  RecordEditor,
  RecordFeedback,
  RecordFilters,
  RecordItem,
} from '../../shared/components';
import type { RecordFilter } from '../../shared/components';
import { confirmed } from '../../shared/data/localSnapshot';
import { useLocal } from '../local/LocalProvider';
import { currentDay, DAY_MS, dayStart, dayStats } from '../local/model';
import { date, number, time } from '../local/format';
import { DayHabitSummary } from './DayHabitSummary';
import { recordsForDay, recordDay } from './model';
import { recordsOrigin } from './navigation';
import { RouteEditGuard } from './RouteEditGuard';
import { isValidWaterAmount } from '../../shared/components/waterAmount';
import './records.css';

type Mode = { kind: 'actions' | 'edit' | 'delete'; id: string; revision: number } | null;
type Result = {
  state: 'updated' | 'deleted' | 'undone' | 'temporary-error';
  message: string;
  operationId?: string;
  eventId?: string;
  day: number;
  kind?: 'water' | 'sunscreen';
};
export function RecordsScreen() {
  const local = useLocal();
  const state = local.state!;
  const today = currentDay(state, local.now);
  const location = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const entry = location.state as { day?: unknown; eventId?: string } | null;
  const [initialDay] = useState(() => recordDay(params.get('dia') ?? entry?.day, today));
  const day = recordDay(params.get('dia') ?? entry?.day ?? initialDay, today);
  const filter: RecordFilter =
    params.get('filtro') === 'water'
      ? 'water'
      : params.get('filtro') === 'sunscreen'
        ? 'sunscreen'
        : 'all';
  const [mode, setMode] = useState<Mode>(() =>
    entry?.eventId
      ? { id: entry.eventId, kind: 'actions', revision: local.eventRevision(entry.eventId) }
      : null,
  );
  const [value, setValue] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [working, setWorking] = useState(false);
  const flight = useRef(false);
  const root = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const rows = useRef(new Map<string, HTMLDivElement>());
  const events = recordsForDay(state, day);
  const visible = events.filter((event) => filter === 'all' || event.kind === filter);
  const selected = events.find((event) => event.id === mode?.id);
  const readonly = day !== today;
  const locked = working || local.busy;
  const stats = dayStats(state, day);
  const start = dayStart(state, day);
  function focusRow(id?: string) {
    requestAnimationFrame(() =>
      (id
        ? (rows.current.get(id)?.querySelector<HTMLElement>('button') ?? heading.current)
        : heading.current
      )?.focus({ preventScroll: true }),
    );
  }
  function cancel() {
    const id = mode?.id;
    setMode(null);
    focusRow(id);
  }
  function back() {
    if (locked) return;
    if (mode) {
      cancel();
      return;
    }
    if (recordsOrigin(location.state)) navigate(-1);
    else navigate('/perfil', { replace: true });
  }
  useEffect(() => {
    const handler = (event: Event) => {
      (
        event as CustomEvent<{ register: (priority: number, callback: () => void) => void }>
      ).detail.register(20, back);
    };
    document.addEventListener('ionBackButton', handler);
    return () => document.removeEventListener('ionBackButton', handler);
  });
  useLayoutEffect(() => {
    if (!mode) return;
    if (mode.kind === 'actions') {
      const frame = requestAnimationFrame(() =>
        rows.current
          .get(mode.id)
          ?.querySelector<HTMLButtonElement>('button')
          ?.focus({ preventScroll: true }),
      );
      return () => cancelAnimationFrame(frame);
    }
    const element = rows.current.get(mode.id);
    const target = element?.querySelector<HTMLElement>(mode.kind === 'edit' ? 'input' : 'button');
    target?.focus({ preventScroll: true });
    element?.scrollIntoView({ block: 'nearest' });
  }, [mode]);
  useEffect(() => {
    const viewport = window.visualViewport;
    const baseline = window.innerHeight;
    const resize = () => {
      if (!root.current || !viewport) return;
      root.current.style.setProperty('--records-height', `${viewport.height}px`);
      root.current.classList.toggle('is-keyboard', viewport.height < baseline * 0.8);
      if (document.activeElement?.tagName === 'INPUT')
        requestAnimationFrame(() => document.activeElement?.scrollIntoView({ block: 'center' }));
    };
    resize();
    viewport?.addEventListener('resize', resize);
    return () => viewport?.removeEventListener('resize', resize);
  }, []);
  async function mutate(kind: 'edit' | 'delete' | 'undo', id: string, amount?: number) {
    if (flight.current || locked || readonly) return;
    flight.current = true;
    setWorking(true);
    setResult(null);
    try {
      const revision = mode?.revision;
      const response = confirmed(
        await (kind === 'undo'
          ? local.undo(id)
          : kind === 'edit'
            ? local.edit(id, amount!, revision)
            : local.remove(id, revision)),
      );
      const eventId = response.receipt.after?.id ?? response.receipt.before?.id;
      setMode(null);
      setResult({
        state: kind === 'edit' ? 'updated' : kind === 'delete' ? 'deleted' : 'undone',
        operationId: kind === 'undo' ? undefined : response.operationId,
        eventId,
        day,
        kind: response.receipt.after?.kind ?? response.receipt.before?.kind,
        message: '',
      });
      focusRow(eventId);
    } catch (error) {
      setResult({ state: 'temporary-error', message: (error as Error).message, day });
    } finally {
      flight.current = false;
      setWorking(false);
    }
  }
  function changeDay(next: number) {
    if (locked) return;
    setMode(null);
    setResult(null);
    setParams({ dia: String(next), filtro: filter }, { replace: true, state: location.state });
  }
  return (
    <main ref={root} className="records-screen" aria-labelledby="records-heading">
      <RouteEditGuard active={!!mode || locked} busy={locked} onCancel={cancel} />
      <header className="records-header">
        <div className="records-title">
          <IconButton label="Volver" disabled={locked} onClick={back} />
          <h1 id="records-heading" ref={heading} tabIndex={-1} className="hf-type-heading-xl">
            Mis registros
          </h1>
        </div>
        <p className="records-description hf-type-body-sm hf-muted">
          Consulta y corrige los registros de tu día.
        </p>
        <RecordDayNavigator
          state={readonly ? 'closed' : 'current'}
          date={date(start, state, { weekday: 'short', day: 'numeric', month: 'short' })}
          detail={
            readonly
              ? 'Día cerrado · solo lectura'
              : `En curso · Cierra ${date(start + DAY_MS, state)}, ${time(start + DAY_MS, state)}`
          }
          previousDisabled={locked || day === 0}
          nextDisabled={locked || day === today}
          onPrevious={() => changeDay(day - 1)}
          onNext={() => changeDay(day + 1)}
        />
        <div className="records-summary">
          <DayHabitSummary day={day} />
        </div>
        <fieldset className="records-filter-lock" disabled={locked}>
          <RecordFilters
            value={filter}
            onChange={(next) => {
              setMode(null);
              setResult(null);
              setParams(
                { dia: String(day), filtro: next },
                { replace: true, state: location.state },
              );
            }}
          />
        </fieldset>
        <div className="hf-row records-count">
          <h2 className="hf-type-heading-md">Registros del día</h2>
          <span className="hf-type-label-md" aria-label={`${visible.length} registros`}>
            {visible.length}
          </span>
        </div>
      </header>
      <section className="records-list" aria-label="Registros del día">
        {visible.length ? (
          visible.map((event) => (
            <div
              key={event.id}
              ref={(element) => {
                if (element) rows.current.set(event.id, element);
                else rows.current.delete(event.id);
              }}
            >
              {mode?.id === event.id && mode.kind === 'edit' && !readonly ? (
                <RecordEditor
                  value={value}
                  time={`${time(event.at, state)} · Registro del día abierto`}
                  state={locked ? 'saving' : 'normal'}
                  summary={
                    isValidWaterAmount(value)
                      ? `Antes: ${number(event.amount)} mL · Total al guardar: ${number(stats.water - event.amount + Number(value))} mL`
                      : `Antes: ${number(event.amount)} mL · El total no cambia todavía.`
                  }
                  onChange={setValue}
                  onCancel={cancel}
                  onSave={(amount) => void mutate('edit', event.id, amount)}
                />
              ) : mode?.id === event.id && mode.kind === 'delete' && !readonly ? (
                <RecordDelete
                  state={locked ? 'deleting' : 'confirmation'}
                  title={`¿Eliminar este registro de ${event.kind === 'water' ? `${number(event.amount)} mL` : 'protector'}?`}
                  effect={
                    event.kind === 'water'
                      ? `El total quedará en ${number(stats.water - event.amount)} mL.`
                      : `Quedarán ${stats.sunscreen - 1} de ${stats.goals.sunscreen} aplicaciones. Las demás se conservan.`
                  }
                  onCancel={cancel}
                  onDelete={() => void mutate('delete', event.id)}
                />
              ) : (
                <RecordItem
                  kind={event.kind}
                  title={event.title}
                  detail={`${time(event.at, state)} · ${event.kind === 'water' ? 'Registro manual' : event.appointment ? `Cita de las ${event.appointment.time}` : 'Protector solar · sin cita (versión anterior)'}`}
                  state={
                    readonly || locked ? 'readonly' : mode?.id === event.id ? 'actions' : 'normal'
                  }
                  onActionsChange={(open) => {
                    if (!locked)
                      setMode(
                        open
                          ? {
                              kind: 'actions',
                              id: event.id,
                              revision: local.eventRevision(event.id),
                            }
                          : null,
                      );
                  }}
                  onEdit={() => {
                    setValue(String(event.amount));
                    setMode({
                      kind: 'edit',
                      id: event.id,
                      revision: local.eventRevision(event.id),
                    });
                    setResult(null);
                  }}
                  onDelete={() => {
                    setMode({
                      kind: 'delete',
                      id: event.id,
                      revision: local.eventRevision(event.id),
                    });
                    setResult(null);
                  }}
                />
              )}
            </div>
          ))
        ) : (
          <AsyncContentState
            state="empty"
            title={filter === 'all' ? 'Todavía no hay registros' : 'Sin registros para este filtro'}
            description={
              readonly
                ? 'Este día está cerrado. Puedes consultar otro día.'
                : 'Los registros que guardes en Inicio aparecerán aquí.'
            }
          />
        )}
        {local.pending && (
          <aside className="records-recovery" aria-label="Recuperar guardado">
            <RecordFeedback
              state="temporary-error"
              title="Guardado sin confirmar"
              description={local.storageError}
              showAction={!local.writing}
              onAction={() => void local.retry()}
            />
            <Button
              variant="secondary"
              disabled={local.writing}
              onClick={() => void local.discard()}
            >
              Cerrar intento
            </Button>
            <p className="hf-type-caption hf-muted">
              Conservamos el intento en memoria. Mantén abierta la app para reintentarlo.
            </p>
          </aside>
        )}
        {working && (
          <p className="hf-sr-only" role="status">
            Operación en curso
          </p>
        )}
      </section>
      <footer className="records-footer">
        {result && result.day === day && !local.pending ? (
          <RecordFeedback
            state={result.state}
            title={result.state === 'temporary-error' ? 'No se confirmó el cambio' : undefined}
            description={
              result.message ||
              (result.kind === 'sunscreen'
                ? `Protector: ${stats.sunscreen} de ${stats.goals.sunscreen} aplicaciones.`
                : `Total: ${number(stats.water)} de ${number(stats.goals.water)} mL.`)
            }
            showAction={
              !locked && (result.state === 'undone' || (!!result.operationId && !readonly))
            }
            onAction={() => {
              if (result.state === 'undone') setResult(null);
              else if (result.operationId) void mutate('undo', result.operationId);
            }}
          />
        ) : (
          <p className="hf-type-caption hf-muted">
            {readonly
              ? 'Este día cerró. Sus registros se conservan para consulta.'
              : selected && mode?.kind === 'delete'
                ? 'Cancelar conserva el registro. Eliminar solo afecta al evento seleccionado.'
                : 'Desliza a la izquierda o toca Opciones. Tus datos se guardan en este dispositivo.'}
          </p>
        )}
      </footer>
    </main>
  );
}
