import { Icon } from './Icon';
export interface SunscreenWindowCardProps {
  state?: 'in-window' | 'context' | 'registered' | 'closed' | 'upcoming';
  window: string;
  application: string;
  registeredAt?: string;
  nextWindow?: string;
  closingTime?: string;
}
const labels = {
  'in-window': 'En horario',
  context: 'Todavía estás a tiempo',
  registered: 'Aplicación registrada',
  closed: 'Horario terminado',
  upcoming: 'Próximo horario',
} as const;
export function SunscreenWindowCard({
  state = 'in-window',
  window,
  application,
  registeredAt,
  nextWindow,
  closingTime,
}: SunscreenWindowCardProps) {
  return (
    <section
      className={`hf-sunscreen-window hf-sunscreen-window--${state}`}
      aria-label={labels[state]}
    >
      <div className="hf-sunscreen-window__status">
        <Icon
          name={state === 'registered' ? 'check' : state === 'closed' ? 'lock' : 'clock'}
          inheritColor
        />
        <h2 className="hf-type-label-md">{labels[state]}</h2>
      </div>
      {state === 'registered' ? (
        <>
          <p className="hf-type-heading-md">{registeredAt}</p>
          <p className="hf-type-label-md hf-sunscreen-window__secondary">Próximo horario</p>
          <p className="hf-type-heading-xl">{nextWindow ?? 'Sin horarios pendientes'}</p>
          <p className="hf-type-body-sm hf-sunscreen-window__secondary">
            {nextWindow
              ? 'El registro se habilitará en esa franja.'
              : 'Tus registros anteriores se conservan.'}
          </p>
        </>
      ) : state === 'closed' ? (
        <>
          <p className="hf-type-heading-md">Sin ventanas abiertas</p>
          <p className="hf-type-body-sm">Ya no hay horarios disponibles para registrar.</p>
          <p className="hf-type-caption">Tus registros anteriores se conservan.</p>
        </>
      ) : (
        <>
          <p className="hf-type-heading-xl">{window}</p>
          <p className="hf-type-data-md">{application}</p>
          <p
            className={`hf-type-body-sm${state === 'context' ? ' hf-sunscreen-window__secondary' : ''}`}
          >
            {state === 'context'
              ? `Aún puedes registrarla${closingTime ? ` hasta las ${closingTime}` : ' durante esta ventana'}.`
              : state === 'upcoming'
                ? 'El registro se habilitará cuando comience esta franja.'
                : 'Puedes registrarla durante esta ventana.'}
          </p>
        </>
      )}
    </section>
  );
}
