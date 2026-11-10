import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Icon, IconButton, Input, RecordFeedback } from '../../shared/components';
import { confirmed } from '../../shared/data/localSnapshot';
import { useLocal } from '../local/LocalProvider';
import { currentDay, dayStart, dayStats, DAY_MS } from '../local/model';
import { time } from '../local/format';
import { DayHabitSummary } from './DayHabitSummary';
import { useOpenRecords } from './navigation';
import { RouteEditGuard } from './RouteEditGuard';
import { isValidWaterAmount } from '../../shared/components/waterAmount';

/** Manual water without a photo requirement; sunscreen awaits its hourly-window integration. */
export function HabitEntryScreen({ kind }: { kind: 'water' | 'sunscreen' }) {
  const local = useLocal();
  const navigate = useNavigate();
  const location = useLocation();
  const records = useOpenRecords();
  const [amount, setAmount] = useState('250');
  const [receipt, setReceipt] = useState<string | null>(null);
  const [error, setError] = useState('');
  const day = currentDay(local.state!, local.now);
  const complete = kind === 'sunscreen' && dayStats(local.state!, day).sunscreenProgress >= 1;
  const back = () => {
    if (!local.busy) {
      if (location.state?.from === '/inicio') navigate(-1);
      else navigate('/inicio', { replace: true });
    }
  };
  return (
    <div className="local-shell local-entry">
      <RouteEditGuard active={local.busy} busy={local.busy} onCancel={() => {}} />
      <main
        className="local-scroll local-screen"
        aria-label={kind === 'water' ? 'Registro manual de agua' : 'Registro manual de protector'}
      >
        <header className="records-title">
          <IconButton label="Volver" disabled={local.busy} onClick={back} />
          <h1 className="hf-type-heading-xl">
            {kind === 'water' ? 'Registrar agua' : 'Registrar protector'}
          </h1>
        </header>
        <DayHabitSummary day={day} />
        <p className="hf-muted">
          Día en curso · cierra a las {time(dayStart(local.state!, day) + DAY_MS, local.state!)}.
        </p>
        <p>
          {kind === 'water'
            ? 'Confirma la cantidad de agua que bebiste.'
            : 'Confirma una aplicación de protector solar que hayas realizado.'}
        </p>
        <form
          className="hf-stack"
          onSubmit={async (event) => {
            event.preventDefault();
            if (local.busy || complete || (kind === 'water' && !isValidWaterAmount(amount))) return;
            setError('');
            try {
              const response = await local.record(kind, kind === 'water' ? Number(amount) : 1);
              if (response.status === 'failed' && response.reason === 'capture-required') {
                void navigate('/inicio/agua', {
                  replace: true,
                  state: { capture: true, amount: Number(amount), from: '/inicio' },
                });
                return;
              }
              const result = confirmed(response);
              setReceipt(result.operationId);
            } catch (issue) {
              setError((issue as Error).message);
            }
          }}
        >
          {kind === 'water' && (
            <Input
              label="Cantidad en mL"
              value={amount}
              inputMode="numeric"
              pattern="[0-9]*"
              disabled={local.busy}
              leadingIcon={<Icon name="drop" inheritColor />}
              onChange={(event) => setAmount(event.target.value)}
              error={!isValidWaterAmount(amount) ? 'Usa un entero entre 1 y 10,000 mL.' : undefined}
            />
          )}
          <Button
            type="submit"
            variant={kind === 'water' ? 'primary' : 'sunscreen'}
            loading={local.writing}
            disabled={local.busy || complete || (kind === 'water' && !isValidWaterAmount(amount))}
          >
            {kind === 'water'
              ? 'Confirmar registro'
              : complete
                ? 'Meta registrada'
                : 'Confirmar aplicación'}
          </Button>
        </form>
        {error && <p role="alert">{error}</p>}
        {receipt && (
          <RecordFeedback
            title="Registro guardado"
            description="El progreso ya incluye este registro."
            onAction={async () => {
              if (local.busy) return;
              try {
                confirmed(await local.undo(receipt));
                setReceipt(null);
              } catch (issue) {
                setError((issue as Error).message);
              }
            }}
          />
        )}
        <Button variant="secondary" disabled={local.busy} onClick={() => records(day)}>
          Ver mis registros
        </Button>
      </main>
    </div>
  );
}
