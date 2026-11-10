import { IonPage } from '@ionic/react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { OnboardingFlow } from './OnboardingFlow';
import { createOnboardingDraft, isOnboardingStep, readOnboardingSnapshot } from './model';
import { confirmed } from '../../shared/data/localSnapshot';
import { useLocal } from '../local/LocalProvider';
import { useAuth } from '../auth/AuthProvider';

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
  const auth = useAuth();
  const { step } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  if (!isOnboardingStep(step))
    return <Navigate to={onboardingEntryPath(!!local.state, persistDraft)} replace />;
  return (
    <IonPage>
      <OnboardingFlow
        step={step}
        initialDraft={
          draftFromNavigation(location.state) ??
          local.state?.preferences ??
          (auth.user ? { ...createOnboardingDraft(), preferredName: auth.user.name } : undefined)
        }
        completionLabel={auth.user ? 'Empezar' : 'Crear mi cuenta'}
        persist={persistDraft && !auth.user}
        onOpenContent={(kind, draft) =>
          navigate(kind === 'sources' ? '/fuentes' : '/privacidad', {
            state: { from: location.pathname, draft },
          })
        }
        onStepChange={(next) => navigate(`/onboarding/${next}`)}
        onCreateAccount={async (preferences) => {
          const draft = { ...preferences, waterGoalMl: String(preferences.waterGoalMl) };
          if (!auth.user) {
            navigate('/cuenta/registro', { state: { draft } });
            return;
          }
          confirmed(await (local.state ? local.update(draft) : local.start(draft)));
          navigate('/inicio', { replace: true });
        }}
        onSignIn={() => navigate('/cuenta/entrar')}
        onContinueAsGuest={
          auth.user ? undefined : (draft) => navigate('/cuenta/invitado', { state: { draft } })
        }
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
