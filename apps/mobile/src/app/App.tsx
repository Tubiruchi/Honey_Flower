import { IonApp } from '@ionic/react';
import { useState } from 'react';
import {
  createBrowserRouter,
  Navigate,
  Route,
  RouterProvider,
  Routes,
  useLocation,
} from 'react-router-dom';
import { LocalProvider, useLocal } from '../features/local/LocalProvider';
import { LocalShell } from '../features/local/LocalShell';
import { LocalDataBoundary } from '../features/local/LocalDataBoundary';
import { OnboardingRoute, onboardingEntryPath } from '../features/onboarding/OnboardingRoute';
import { WaterRuntime } from '../features/water/WaterRuntime';
import { ReminderProvider } from '../features/reminders/ReminderProvider';
import type { ReminderDevice } from '../shared/native/reminders';
import { ContentPage } from '../features/content/ContentPage';
import { AuthProvider, useAuth } from '../features/auth/AuthProvider';
import { AccountRoutes, GuestEntry } from '../features/auth/AccountScreen';
import { deviceLocalStorage } from '../shared/native/localStorage';
import { memoryStorage } from '../shared/data/localRepository';
import type { LocalStoragePort } from '../shared/data/localRepository';
import { AsyncContentState } from '../shared/components';

export function App() {
  const [router] = useState(() =>
    createBrowserRouter([
      {
        path: '*',
        element: (
          <AuthProvider>
            <AccountScopedApp />
          </AuthProvider>
        ),
      },
    ]),
  );
  return (
    <IonApp>
      <RouterProvider router={router} />
    </IonApp>
  );
}
export function AccountScopedApp({
  storageForScope,
}: {
  storageForScope?: (scope: string) => LocalStoragePort;
}) {
  const auth = useAuth();
  const scope = auth.user?.id ?? auth.mode;
  if (auth.loading)
    return (
      <main className="account-loading">
        <AsyncContentState state="loading" title="Abriendo tu sesión" description="Un momento…" />
      </main>
    );
  return <ScopedLocal key={scope} scope={scope} storageForScope={storageForScope} />;
}
function ScopedLocal({
  scope,
  storageForScope,
}: {
  scope: string;
  storageForScope?: (scope: string) => LocalStoragePort;
}) {
  const [storage] = useState(() =>
    storageForScope
      ? storageForScope(scope)
      : scope === 'signed-out'
        ? memoryStorage()
        : deviceLocalStorage(scope === 'guest' ? undefined : scope),
  );
  return (
    <LocalProvider storage={storage}>
      <AppRoutes />
    </LocalProvider>
  );
}
export function AppRoutes({
  persistOnboardingDraft = true,
  reminderDevice,
}: {
  persistOnboardingDraft?: boolean;
  reminderDevice?: ReminderDevice;
}) {
  const { pathname } = useLocation();
  const publicPage = pathname === '/fuentes' || pathname === '/privacidad';
  return (
    <ReminderProvider device={reminderDevice}>
      <Routes>
        <Route path="/fuentes" element={<ContentPage kind="sources" />} />
        <Route path="/privacidad" element={<ContentPage kind="privacy" />} />
        <Route path="*" element={null} />
      </Routes>
      <div hidden={publicPage}>
        <LocalDataBoundary>
          <WaterRuntime />
          <Routes>
            <Route path="/" element={<EntryRoute persistDraft={persistOnboardingDraft} />} />
            <Route path="/onboarding" element={<Navigate to="/onboarding/bienvenida" replace />} />
            <Route
              path="/onboarding/:step"
              element={<OnboardingRoute persistDraft={persistOnboardingDraft} />}
            />
            <Route path="/cuenta/invitado" element={<GuestEntry />} />
            <Route path="/cuenta/*" element={<AccountRoutes />} />
            <Route path="/*" element={<LocalShell />} />
          </Routes>
        </LocalDataBoundary>
      </div>
    </ReminderProvider>
  );
}
function EntryRoute({ persistDraft }: { persistDraft: boolean }) {
  const local = useLocal();
  const auth = useAuth();
  if (auth.mode === 'signed-out' && !auth.user) return <Navigate to="/cuenta/entrar" replace />;
  if (auth.user && !local.state) return <Navigate to="/onboarding/nombre" replace />;
  return <Navigate to={onboardingEntryPath(!!local.state, persistDraft)} replace />;
}
