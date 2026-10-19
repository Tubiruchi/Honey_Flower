import { IonApp } from '@ionic/react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LocalProvider } from '../features/local/LocalProvider';
import { LocalShell } from '../features/local/LocalShell';
import { OnboardingRoute, onboardingEntryPath } from '../features/onboarding/OnboardingRoute';

export function App() {
  return (
    <IonApp>
      <BrowserRouter>
        <LocalProvider>
          <Routes>
            <Route path="/" element={<Navigate to={onboardingEntryPath()} replace />} />
            <Route path="/onboarding" element={<Navigate to="/onboarding/bienvenida" replace />} />
            <Route path="/onboarding/:step" element={<OnboardingRoute />} />
            <Route path="/cuenta/*" element={<Navigate to="/onboarding/bienvenida" replace />} />
            <Route path="/*" element={<LocalShell />} />
          </Routes>
        </LocalProvider>
      </BrowserRouter>
    </IonApp>
  );
}
