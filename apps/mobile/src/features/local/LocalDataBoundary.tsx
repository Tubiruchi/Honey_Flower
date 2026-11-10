import type { ReactNode } from 'react';
import { IonPage } from '@ionic/react';
import { AsyncContentState, Button, Feedback } from '../../shared/components';
import { useLocal } from './LocalProvider';
import './local.css';

export function LocalDataBoundary({ children }: { children: ReactNode }) {
  const local = useLocal();
  if (local.status === 'loading')
    return (
      <IonPage>
        <main className="local-recovery">
          <AsyncContentState state="loading" />
        </main>
      </IonPage>
    );
  if (local.status === 'error')
    return (
      <IonPage>
        <main className="local-recovery">
          <AsyncContentState
            state="error"
            title="No pudimos recuperar tus datos"
            description={local.storageError}
          />
          <Button loading={local.writing} onClick={() => void local.retry()}>
            Reintentar
          </Button>
          {local.pending && (
            <Button variant="text" disabled={local.writing} onClick={() => void local.discard()}>
              Cerrar intento pendiente
            </Button>
          )}
        </main>
      </IonPage>
    );
  return (
    <>
      {children}
      <LocalPendingRecovery />
    </>
  );
}
export function LocalPendingRecovery({ inline = false }: { inline?: boolean }) {
  const local = useLocal();
  if (!local.pending) return null;
  return (
    <aside
      className={`local-pending${inline ? ' local-pending--inline' : ' local-pending--floating'}`}
      aria-label="Recuperar guardado"
    >
      <Feedback variant="error" title="Guardado sin confirmar">
        {local.storageError}
      </Feedback>
      <div className="local-actions">
        <Button loading={local.writing} onClick={() => void local.retry()}>
          Reintentar guardado
        </Button>
        <Button variant="secondary" disabled={local.writing} onClick={() => void local.discard()}>
          Cerrar intento
        </Button>
      </div>
      <p className="hf-type-caption">
        El intento está en memoria. Mantén abierta la app para reintentarlo.
      </p>
    </aside>
  );
}
