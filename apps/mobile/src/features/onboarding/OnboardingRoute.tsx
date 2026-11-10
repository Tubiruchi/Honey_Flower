import { IonPage } from '@ionic/react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button, InfoCard } from '../../shared/components';
import { OnboardingFlow } from './OnboardingFlow';
import { isOnboardingStep, readOnboardingSnapshot } from './model';
import { confirmed } from '../../shared/data/localSnapshot';
import { useLocal } from '../local/LocalProvider';

export function onboardingEntryPath(hasLocalState = false, persistDraft = true): string {
  if (hasLocalState) return '/inicio';
  if (!persistDraft) return '/onboarding/bienvenida';
  try {
    return `/onboarding/${readOnboardingSnapshot(window.localStorage)?.step ?? 'bienvenida'}`;
  } catch {
    return '/onboarding/bienvenida';
  }
}

export function OnboardingRoute({ persistDraft = true }: { persistDraft?: boolean }) {
  const local = useLocal();
  const { step } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  if (!isOnboardingStep(step))
    return <Navigate to={onboardingEntryPath(!!local.state, persistDraft)} replace />;
  return (
    <IonPage>
      <OnboardingFlow
        step={step}
        initialDraft={draftFromNavigation(location.state) ?? local.state?.preferences}
        completionLabel="Empezar en este dispositivo"
        persist={persistDraft}
        onOpenContent={(kind, draft) =>
          navigate(kind === 'sources' ? '/fuentes' : '/privacidad', {
            state: { from: location.pathname, draft },
          })
        }
        onStepChange={(next) => navigate(`/onboarding/${next}`)}
        onCreateAccount={async (preferences) => {
          const draft = { ...preferences, waterGoalMl: String(preferences.waterGoalMl) };
          confirmed(await (local.state ? local.update(draft) : local.start(draft)));
          navigate('/inicio', { replace: true });
        }}
        onSignIn={async () => {
          confirmed(await local.start());
          navigate('/inicio', { replace: true });
        }}
      />
    </IonPage>
  );
}

function draftFromNavigation(state: unknown) {
  try {
    if (!state || typeof state !== 'object' || !('draft' in state)) return undefined;
    return readOnboardingSnapshot({
      getItem: () => JSON.stringify({ version: 1, step: 'resumen', draft: state.draft }),
    })?.draft;
  } catch {
    return undefined;
  }
}

/** Límite explícito de la entrega: todavía no existe un proveedor de autenticación. */
export function AccountBoundary({ intent }: { intent: 'register' | 'login' }) {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <IonPage>
      <main className="onb-boundary">
        <p className="hf-type-label-sm hf-muted">HONEYFLOWER</p>
        <h1 className="hf-type-heading-xl">
          {intent === 'register' ? 'Tu configuración está lista' : 'Tu jardín te espera'}
        </h1>
        <InfoCard
          title={
            intent === 'register'
              ? 'El siguiente paso es crear tu cuenta'
              : 'Próximamente podrás entrar a tu cuenta'
          }
        >
          <p>
            El acceso y la creación de cuentas todavía no están disponibles. Puedes volver a tus
            preferencias o explorar la demostración.
          </p>
        </InfoCard>
        <Button
          onClick={() =>
            navigate(intent === 'register' ? '/onboarding/resumen' : '/onboarding/bienvenida', {
              state: location.state,
            })
          }
        >
          Volver al onboarding
        </Button>
        <Button variant="secondary" onClick={() => navigate('/inicio')}>
          Explorar demostración
        </Button>
      </main>
    </IonPage>
  );
}
