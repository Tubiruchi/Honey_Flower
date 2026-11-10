import { Button } from './Button';
import { Icon } from './Icon';

export interface AsyncContentStateProps {
  state: 'loading' | 'error' | 'empty';
  title?: string;
  description?: string;
  onRetry?: () => void;
}
const messages = {
  loading: ['Cargando tus datos', 'Estamos leyendo los datos guardados.'],
  error: ['No pudimos leer tus datos', 'Tus registros no se han editado ni eliminado.'],
  empty: ['Todavía no hay registros', 'Los registros de este día aparecerán aquí.'],
} as const;

export function AsyncContentState({ state, title, description, onRetry }: AsyncContentStateProps) {
  return (
    <section
      className={`hf-async hf-async--${state}`}
      role={state === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      <span className="hf-async__icon">
        <Icon
          name={state === 'loading' ? 'spinner' : state === 'empty' ? 'leaf' : 'info'}
          inheritColor
          className={state === 'loading' ? 'hf-spinner' : ''}
        />
      </span>
      <h2 className="hf-type-heading-md">{title ?? messages[state][0]}</h2>
      <p className="hf-type-body-sm">{description ?? messages[state][1]}</p>
      {state === 'error' && onRetry && (
        <Button variant="text" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </section>
  );
}
