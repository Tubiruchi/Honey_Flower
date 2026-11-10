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

export function App() {
  const [router] = useState(() =>
    createBrowserRouter([
      {
        path: '*',
        element: (
          <LocalProvider>
            <AppRoutes />
          </LocalProvider>
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
            <Route path="/cuenta/*" element={<Navigate to="/onboarding/bienvenida" replace />} />
            <Route path="/*" element={<LocalShell />} />
          </Routes>
        </LocalDataBoundary>
      </div>
    </ReminderProvider>
  );
}
function EntryRoute({ persistDraft }: { persistDraft: boolean }) {
  const local = useLocal();
  return <Navigate to={onboardingEntryPath(!!local.state, persistDraft)} replace />;
}
