import {
  IonApp,
  IonContent,
  IonFooter,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { BrowserRouter, Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { Flower2, House, Info, UserRound } from 'lucide-react';
import { GardenDemo } from '../features/garden/GardenDemo';
import { HomeDemo } from '../features/home/HomeDemo';
import { SettingsDemo } from '../features/settings/SettingsDemo';
import {
  AccountBoundary,
  OnboardingRoute,
  onboardingEntryPath,
} from '../features/onboarding/OnboardingRoute';

const destinations = [
  { to: '/inicio', label: 'Inicio', Icon: House },
  { to: '/jardin', label: 'Jardín', Icon: Flower2 },
  { to: '/perfil', label: 'Perfil', Icon: UserRound },
];

function DemoShell() {
  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle>HoneyFlower</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <main className="hf-screen">
          <p className="hf-demo-notice">
            <Info size={16} aria-hidden="true" />
            Demostración · datos locales de ejemplo, sin guardado
          </p>
          <Routes>
            <Route path="/inicio" element={<HomeDemo />} />
            <Route path="/jardin" element={<GardenDemo />} />
            <Route path="/perfil" element={<SettingsDemo />} />
            <Route path="*" element={<Navigate to="/inicio" replace />} />
          </Routes>
        </main>
      </IonContent>
      <IonFooter className="ion-no-border">
        <nav className="hf-nav" aria-label="Navegación principal">
          {destinations.map(({ to, label, Icon }) => (
            <NavLink to={to} key={to}>
              <Icon size={24} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </IonFooter>
    </IonPage>
  );
}

export function App() {
  return (
    <IonApp>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to={onboardingEntryPath()} replace />} />
          <Route path="/onboarding" element={<Navigate to={onboardingEntryPath()} replace />} />
          <Route path="/onboarding/:step" element={<OnboardingRoute />} />
          <Route path="/cuenta/registro" element={<AccountBoundary intent="register" />} />
          <Route path="/cuenta/acceso" element={<AccountBoundary intent="login" />} />
          <Route path="/*" element={<DemoShell />} />
        </Routes>
      </BrowserRouter>
    </IonApp>
  );
}
