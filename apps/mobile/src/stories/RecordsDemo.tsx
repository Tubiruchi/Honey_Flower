import { useEffect, useRef, useState } from 'react';
import {
  AsyncContentState,
  RecordDayNavigator,
  RecordDelete,
  RecordEditor,
  RecordFeedback,
  RecordFilters,
  RecordItem,
} from '../shared/components';
import type { RecordFilter } from '../shared/components';
import { recordFixture } from './fixtures/phase2';

type Row = (typeof recordFixture)[number];
type Mode = { kind: 'actions' | 'edit' | 'delete'; id: string } | null;
type Operation = {
  id: number;
  eventId: string;
  before: Row[];
  next: Row[];
  result: 'updated' | 'deleted' | 'undone';
};
export interface RecordsDemoProps {
  initialRead?: 'ready' | 'loading' | 'error' | 'empty';
  initialClosed?: boolean;
  failOnce?: boolean;
  closeDuringSave?: boolean;
}
const amount = (rows: Row[]) =>
  rows.filter((r) => r.kind === 'water').reduce((sum, r) => sum + r.amount, 0);
const ml = (value: number) => value.toLocaleString('en-US');

/** Isolated Storybook controller. Acknowledgements/errors are fixtures, never real storage. */
export function RecordsDemo({
  initialRead = 'ready',
  initialClosed = false,
  failOnce = false,
  closeDuringSave = false,
}: RecordsDemoProps) {
  const [rows, setRows] = useState<Row[]>(initialRead === 'empty' ? [] : recordFixture);
  const [read, setRead] = useState(initialRead);
  const [filter, setFilter] = useState<RecordFilter>('all');
  const [day, setDay] = useState(initialClosed ? -1 : 0);
  const [closed, setClosed] = useState(initialClosed);
  const [mode, setMode] = useState<Mode>(null);
  const [value, setValue] = useState('250');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Operation['result'] | 'temporary-error' | null>(null);
  const [expired, setExpired] = useState(false);
  const [pending, setPending] = useState<Operation | null>(null);
  const [saved, setSaved] = useState<Operation | null>(null);
  const failing = useRef(failOnce);
  const flight = useRef(false);
  const serial = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const readonly = closed || day < 0;
  function focusRow(id: string) {
    requestAnimationFrame(() =>
      (
        rowRefs.current.get(id)?.querySelector<HTMLButtonElement>('button') ?? heading.current
      )?.focus(),
    );
  }
  function cancel() {
    const id = mode?.id;
    setMode(null);
    if (id) focusRow(id);
  }
  function execute(operation: Operation) {
    if (flight.current || readonly) return;
    flight.current = true;
    setBusy(true);
    setPending(operation);
    setFeedback(null);
    timer.current = setTimeout(() => {
      flight.current = false;
      setBusy(false);
      if (closeDuringSave) {
        setClosed(true);
        setExpired(true);
        setMode(null);
        setPending(null);
        setFeedback('temporary-error');
        return;
      }
      if (failing.current) {
        failing.current = false;
        setMode(null);
        setFeedback('temporary-error');
        return;
      }
      setRows(operation.next);
      setSaved(operation);
      setPending(null);
      setMode(null);
      setFeedback(operation.result);
      focusRow(operation.eventId);
    }, 120);
  }
  function changeDay(next: number) {
    if (flight.current) return;
    setDay(next);
    setMode(null);
    setFeedback(null);
    setPending(null);
    setSaved(null);
  }
  const selected = rows.find((r) => r.id === mode?.id);
  const visible = rows.filter((r) => filter === 'all' || r.kind === filter);
  return (
    <main className="hf-story-content">
      <h1 className="hf-type-heading-lg" ref={heading} tabIndex={-1}>
        Mis registros
      </h1>
      <RecordFilters
        value={filter}
        onChange={(next) => {
          setFilter(next);
          setMode(null);
        }}
      />
      <RecordDayNavigator
        state={readonly ? 'closed' : 'current'}
        date={day === 0 ? 'Mar, 27 oct' : day === -1 ? 'Lun, 26 oct' : 'Dom, 25 oct'}
        previousDisabled={busy || day <= -2}
        nextDisabled={busy || day === 0}
        onPrevious={() => changeDay(day - 1)}
        onNext={() => changeDay(day + 1)}
      />
      {read === 'ready' ? (
        <>
          <p className="hf-type-label-md" role="status">
            Total: {ml(amount(rows))} de 2,000 mL
          </p>
          {visible.length === 0 && (
            <AsyncContentState
              state="empty"
              title="Sin registros para este filtro"
              description={
                readonly
                  ? 'Este día está cerrado. Puedes consultar otro día.'
                  : 'Prueba con otro filtro para consultar tus registros.'
              }
            />
          )}
          {visible.map((row) => (
            <div
              key={row.id}
              ref={(el) => {
                if (el) rowRefs.current.set(row.id, el);
                else rowRefs.current.delete(row.id);
              }}
            >
              {mode?.id === row.id && mode.kind === 'edit' && !readonly ? (
                <RecordEditor
                  value={value}
                  state={busy ? 'saving' : 'normal'}
                  onChange={setValue}
                  summary={`Antes: ${row.amount} mL · Total al guardar: ${ml(amount(rows) - row.amount + (Number(value) || 0))} mL`}
                  onCancel={cancel}
                  onSave={(n) =>
                    execute({
                      id: ++serial.current,
                      eventId: row.id,
                      before: rows,
                      next: rows.map((r) => (r.id === row.id ? { ...r, amount: n } : r)),
                      result: 'updated',
                    })
                  }
                />
              ) : mode?.id === row.id && mode.kind === 'delete' && !readonly ? (
                <RecordDelete
                  state={busy ? 'deleting' : 'confirmation'}
                  title={`¿Eliminar este registro de ${row.kind === 'water' ? `${row.amount} mL` : 'protector'}?`}
                  effect={
                    row.kind === 'water'
                      ? `El total quedará en ${ml(amount(rows) - row.amount)} mL.`
                      : 'Las demás aplicaciones se conservan.'
                  }
                  onCancel={cancel}
                  onDelete={() =>
                    execute({
                      id: ++serial.current,
                      eventId: row.id,
                      before: rows,
                      next: rows.filter((r) => r.id !== row.id),
                      result: 'deleted',
                    })
                  }
                />
              ) : (
                <RecordItem
                  kind={row.kind}
                  title={
                    row.kind === 'water'
                      ? `${row.amount} mL de agua`
                      : rows
                            .filter((r) => r.kind === 'sunscreen')
                            .findIndex((r) => r.id === row.id) === 0
                        ? 'Aplicación inicial'
                        : 'Reaplicación'
                  }
                  detail={`${row.time} · Registro manual`}
                  state={readonly || busy ? 'readonly' : mode?.id === row.id ? 'actions' : 'normal'}
                  onActionsChange={(open) => {
                    setMode(open ? { id: row.id, kind: 'actions' } : null);
                    if (!open) focusRow(row.id);
                  }}
                  onEdit={() => {
                    setValue(String(row.amount));
                    setMode({ id: row.id, kind: 'edit' });
                    requestAnimationFrame(() =>
                      rowRefs.current
                        .get(row.id)
                        ?.querySelector<HTMLInputElement>('input')
                        ?.focus(),
                    );
                  }}
                  onDelete={() => {
                    setMode({ id: row.id, kind: 'delete' });
                    requestAnimationFrame(() =>
                      rowRefs.current
                        .get(row.id)
                        ?.querySelector<HTMLButtonElement>('button')
                        ?.focus(),
                    );
                  }}
                />
              )}
            </div>
          ))}
          {feedback && (
            <RecordFeedback
              state={feedback}
              description={
                feedback === 'temporary-error'
                  ? expired
                    ? 'El día se cerró. El registro original se conserva; ahora es de solo lectura.'
                    : 'No se editó ni eliminó ningún evento. Reintenta la misma operación.'
                  : `Total: ${ml(amount(rows))} de 2,000 mL.`
              }
              showAction={!readonly}
              onAction={() => {
                if (pending) execute(pending);
                else if (saved && feedback !== 'undone')
                  execute({
                    id: ++serial.current,
                    eventId: saved.eventId,
                    before: rows,
                    next: saved.before,
                    result: 'undone',
                  });
                else setFeedback(null);
              }}
            />
          )}
          {selected && busy && (
            <span className="hf-sr-only" role="status">
              Operación en curso
            </span>
          )}
        </>
      ) : (
        <AsyncContentState
          state={read}
          description={
            read === 'empty' && readonly
              ? 'Este día cerrado no tiene registros. Puedes volver a consultar otro día.'
              : undefined
          }
          onRetry={
            read === 'error'
              ? () => {
                  setRead('loading');
                  timer.current = setTimeout(() => setRead('ready'), 120);
                }
              : undefined
          }
        />
      )}
    </main>
  );
}
