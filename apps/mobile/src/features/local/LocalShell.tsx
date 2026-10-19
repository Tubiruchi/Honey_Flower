import { useEffect, useRef } from 'react';
import { IonPage } from '@ionic/react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { BottomNavigation, Feedback } from '../../shared/components';
import { useLocal } from './LocalProvider';
import { HomeScreen } from './HomeScreen';
import { AnalysisScreen } from './AnalysisScreen';
import { ProfileScreen } from './ProfileScreen';
import './local.css';

export function LocalShell() {
  const local = useLocal();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const scroll = useRef<HTMLElement>(null);
  useEffect(() => {
    scroll.current?.scrollTo({ top: 0 });
  }, [pathname]);
  if (!local.state) return <Navigate to="/onboarding/bienvenida" replace />;
  return (
    <IonPage>
      <div className="local-shell">
        <main ref={scroll} className="local-scroll">
          {local.storageError && (
            <Feedback variant="error">
              <p>{local.storageError}</p>
            </Feedback>
          )}
          <Routes>
            <Route path="/inicio" element={<HomeScreen />} />
            <Route path="/analisis" element={<AnalysisScreen />} />
            <Route path="/perfil" element={<ProfileScreen />} />
            <Route path="/jardin" element={<Navigate to="/analisis" replace />} />
            <Route path="*" element={<Navigate to="/inicio" replace />} />
          </Routes>
        </main>
        <footer className="local-navigation">
          <BottomNavigation
            gardenLabel="Análisis"
            active={
              pathname === '/analisis' ? 'garden' : pathname === '/perfil' ? 'profile' : 'home'
            }
            onNavigate={(value) =>
              navigate({ home: '/inicio', garden: '/analisis', profile: '/perfil' }[value])
            }
          />
        </footer>
      </div>
    </IonPage>
  );
}
