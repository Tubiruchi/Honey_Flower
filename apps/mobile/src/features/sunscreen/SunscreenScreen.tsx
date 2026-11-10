import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Button,
  Feedback,
  Icon,
  IconButton,
  PlantCharacter,
  PlantPrompt,
  SunscreenScheduleAgenda,
  SunscreenWindowCard,
} from '../../shared/components';
import { confirmed } from '../../shared/data/localSnapshot';
import { useLocal } from '../local/LocalProvider';
import { Modal } from '../local/Modal';
import { dayStart, DAY_MS, speciesAt } from '../local/model';
import { RouteEditGuard } from '../records/RouteEditGuard';
import { sunscreenState, containsNow, formatSunscreenTime, scheduleAt, windowLabel } from './model';
import { sameAppointment } from './schema';
import type { SunscreenAppointment } from './schema';
import './sunscreen.css';

export function SunscreenScreen() {
  const local = useLocal();
  const state = local.state!;
  const navigate = useNavigate();
  const location = useLocation();
  const view = sunscreenState(state, local.now);
  const [selected, setSelected] = useState<SunscreenAppointment | null>(null);
  const [receipt, setReceipt] = useState<{ id: string; eventId: string; dayStart: number } | null>(
    null,
  );
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [noticeDay, setNoticeDay] = useState(() => dayStart(state, view.day));
  const flight = useRef(false);
  const locked = working || local.busy;
  const target = selected
    ? view.windows.find((window) => sameAppointment(window.appointment, selected))
    : null;
  const validTarget = !!target && !target.event && containsNow(target, local.now) && !view.complete;
  const schedule = scheduleAt(state, view.day);
  const primary = view.available ?? (view.status === 'registered' ? view.registered : view.next);
  const start = dayStart(state, view.day);
  const undoable =
    receipt &&
    receipt.dayStart === start &&
    state.events.some((event) => event.id === receipt.eventId);
  const back = () => {
    if (locked) return;
    if (selected) setSelected(null);
    else void navigate('/inicio', { replace: true });
  };
  useEffect(() => {
    const handler = (event: Event) => {
      (
        event as CustomEvent<{ register: (priority: number, fn: () => void) => void }>
      ).detail.register(30, back);
    };
    document.addEventListener('ionBackButton', handler);
    return () => document.removeEventListener('ionBackButton', handler);
  });
  async function register() {
    if (flight.current || locked || !selected || !validTarget) return;
    flight.current = true;
    setWorking(true);
    setError('');
    setNotice('');
    try {
      const result = confirmed(await local.recordSunscreen(selected));
      setReceipt({
        id: result.operationId,
        eventId: result.receipt.after!.id,
        dayStart: selected.dayStart,
      });
      setSelected(null);
      setNoticeDay(selected.dayStart);
      setNotice('Registro guardado');
    } catch (issue) {
      setError((issue as Error).message);
    } finally {
      flight.current = false;
      setWorking(false);
    }
  }
  async function undo() {
    if (!receipt || locked || flight.current) return;
    flight.current = true;
    setWorking(true);
    setError('');
    try {
      confirmed(await local.undo(receipt.id));
      setReceipt(null);
      setNoticeDay(receipt.dayStart);
      setNotice('Registro deshecho.');
    } catch (issue) {
      setError((issue as Error).message);
    } finally {
      flight.current = false;
      setWorking(false);
    }
  }
  const prompt =
    view.status === 'in-window'
      ? 'Ahora sí estamos a tiempo.'
      : view.status === 'context'
        ? 'Mi confianza se evapora.\nTodavía puedes registrarla.'
        : view.status === 'registered'
          ? 'Un registro.\nCasi aplaudo.'
          : view.status === 'upcoming'
            ? 'Tu siguiente horario aún no comienza.'
            : 'El horario cerró.\nDrama archivado.';
  return (
    <main className="sunscreen-screen" aria-labelledby="sunscreen-title">
      <RouteEditGuard
        active={!!selected || locked}
        busy={locked}
        onCancel={() => setSelected(null)}
      />
      <header className="sunscreen-header">
        <IconButton label="Volver" disabled={locked} onClick={back} />
        <div>
          <h1 id="sunscreen-title" className="hf-type-heading-md">
            Protector solar
          </h1>
          <p className="hf-type-caption">Día de planta en curso</p>
        </div>
      </header>
      {/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- The read-only scrolling agenda needs a keyboard focus target. */}
      <section className="sunscreen-content" aria-label="Agenda del día de planta" tabIndex={0}>
        <PlantPrompt
          face={
            <PlantCharacter
              view="face"
              decorative
              species={speciesAt(state, Math.floor(view.day / 7))}
            />
          }
          message={prompt}
        />
        <h2 className="hf-type-heading-md">Tu horario de este día</h2>
        <SunscreenWindowCard
          state={view.status}
          window={primary ? windowLabel(primary) : 'Próximo día de planta'}
          application={primary ? `Aplicación de las ${primary.time}` : ''}
          closingTime={
            view.available
              ? formatSunscreenTime(
                  view.available.closesAt!,
                  view.available.timeZone,
                  view.available.closesAt! % 60000 !== 0,
                )
              : undefined
          }
          registeredAt={
            view.registered
              ? `Guardada a las ${formatSunscreenTime(view.registered.event!.at, view.registered.timeZone)}`
              : view.complete
                ? 'Meta registrada en la versión anterior'
                : undefined
          }
          nextWindow={!view.complete && view.next ? windowLabel(view.next) : undefined}
        />
        <div className="sunscreen-count">
          <Icon name="sun" inheritColor />
          <p className="hf-type-data-md">
            {view.stats.sunscreen} de {view.stats.goals.sunscreen} aplicaciones registradas
          </p>
        </div>
        {view.windows.length > 0 ? (
          <SunscreenScheduleAgenda
            state={
              view.status === 'registered'
                ? 'registered'
                : view.status === 'closed'
                  ? 'closed'
                  : 'active'
            }
            rows={view.windows.map((window) => ({
              id: window.id,
              time: window.time,
              state: window.event
                ? 'registered'
                : containsNow(window, local.now) && !view.complete
                  ? 'available'
                  : window.opensAt !== null && window.opensAt > local.now
                    ? 'upcoming'
                    : 'closed',
              detail: window.event
                ? `Registrada · ${formatSunscreenTime(window.event.at, window.timeZone)}`
                : window.opensAt === null
                  ? 'Hora no disponible en este día'
                  : window.opensAt > local.now
                    ? 'Próximo horario'
                    : window.closesAt! <= local.now
                      ? 'Cerrada · Sin registro'
                      : view.complete
                        ? 'Meta registrada'
                        : 'Ventana abierta',
            }))}
          />
        ) : (
          <p className="hf-type-body-sm">
            Los nuevos horarios comenzarán en el siguiente día de planta.
          </p>
        )}
        {view.legacy > 0 && (
          <p className="hf-type-caption hf-muted">
            {view.legacy}{' '}
            {view.legacy === 1
              ? 'registro anterior sin cita asociada. Se conserva'
              : 'registros anteriores sin cita asociada. Se conservan'}{' '}
            en el total.
          </p>
        )}
        <p className="hf-type-caption hf-muted sunscreen-day-note">
          El día termina a las{' '}
          {formatSunscreenTime(
            start + DAY_MS,
            schedule?.timeZone ?? state.preferences.timeZone,
            true,
          )}
          .{' '}
          {view.complete
            ? 'Meta registrada.'
            : !view.available
              ? 'No tener una ventana abierta no significa que la meta esté completa.'
              : ''}
        </p>
        {error && !selected && <Feedback variant="error">{error}</Feedback>}
      </section>
      {/* eslint-enable jsx-a11y/no-noninteractive-tabindex */}
      <footer className="sunscreen-footer">
        {notice &&
          noticeDay === start &&
          (!receipt || view.current?.event?.id === receipt.eventId) && (
            <div className="sunscreen-feedback" role="status">
              <Feedback variant="success" icon={<Icon name="check" inheritColor />}>
                {notice}
              </Feedback>
              {undoable && (
                <Button variant="text" disabled={locked} onClick={() => void undo()}>
                  Deshacer
                </Button>
              )}
            </div>
          )}
        {view.status === 'registered' ? (
          <Button disabled={locked} onClick={back}>
            Volver a Inicio
          </Button>
        ) : (
          <Button
            variant="sunscreen"
            disabled={locked || !view.available}
            onClick={() => {
              if (view.available) {
                setSelected(structuredClone(view.available.appointment));
                setError('');
              }
            }}
          >
            {view.available ? 'Registrar aplicación' : 'Registro no disponible'}
          </Button>
        )}
        {view.status !== 'registered' && (
          <Button
            variant="text"
            disabled={locked}
            onClick={() =>
              view.status === 'closed' || view.status === 'upcoming'
                ? void navigate('/perfil', {
                    state: { openEditor: 'schedule', from: '/inicio/protector' },
                  })
                : void navigate(`/perfil/registros?dia=${view.day}&filtro=sunscreen`, {
                    state: { from: '/inicio/protector', sourceKey: location.key, day: view.day },
                  })
            }
          >
            {view.status === 'closed' || view.status === 'upcoming'
              ? 'Revisar horarios en Perfil'
              : 'Mis registros en Perfil'}
          </Button>
        )}
      </footer>
      {selected && (
        <Modal title="¿Te aplicaste protector?" busy={locked} onClose={() => setSelected(null)}>
          <p>
            Confirma personalmente la aplicación correspondiente a la cita de las {selected.time}.
            No necesitas una fotografía.
          </p>
          {target && <p className="hf-type-label-md">Ventana: {windowLabel(target)}</p>}
          {!validTarget && (
            <Feedback variant="warning">
              Este horario ya terminó o tiene un registro. Revisa la agenda antes de continuar.
            </Feedback>
          )}
          {error && <Feedback variant="error">{error}</Feedback>}
          <Button
            variant="sunscreen"
            disabled={!validTarget || local.busy}
            loading={working && !local.pending}
            onClick={() => void register()}
          >
            Confirmar aplicación
          </Button>
          <Button variant="text" disabled={locked} onClick={() => setSelected(null)}>
            Cancelar
          </Button>
        </Modal>
      )}
    </main>
  );
}
