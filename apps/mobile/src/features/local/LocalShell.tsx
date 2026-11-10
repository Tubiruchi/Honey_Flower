import { useLayoutEffect, useRef } from 'react';
import { IonPage } from '@ionic/react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { BottomNavigation, Feedback } from '../../shared/components';
import { useLocal } from './LocalProvider';
import { HomeScreen } from './HomeScreen';
import { AnalysisScreen } from './AnalysisScreen';
import { ProfileScreen } from './ProfileScreen';
import { RecordsScreen } from '../records/RecordsScreen';
import { WaterRoute, WaterScreen } from '../water/WaterScreen';
import { CAMERA_PREVIEW_PATH, TEMPORARY_CAMERA_PREVIEW_ENABLED } from '../water/temporaryPreview';
import { SunscreenScreen } from '../sunscreen/SunscreenScreen';
import './local.css';
import { PreferencesScreen } from '../preferences/PreferencesScreen';

export function LocalShell() {
  const local = useLocal();
  const navigate = useNavigate();
  const { pathname, state: navigationState } = useLocation();
  const scroll = useRef<HTMLElement>(null);
  const positions = useRef(new Map<string, number>());
  const previous = useRef(pathname);
  const tab = ['/inicio', '/analisis', '/perfil'].includes(pathname);
  useLayoutEffect(() => {
    if (scroll.current && ['/inicio', '/analisis', '/perfil'].includes(pathname)) {
      scroll.current.scrollTop = positions.current.get(pathname) ?? 0;
      if (previous.current === '/perfil/registros')
        document
          .getElementById(pathname === '/inicio' ? 'home-records' : 'profile-records')
          ?.focus({ preventScroll: true });
    }
    if (
      pathname === '/perfil' &&
      [
        'profile-notifications',
        'profile-sources',
        'profile-privacy',
        'profile-camera-preview',
      ].includes(navigationState?.focusSetting)
    )
      document.getElementById(navigationState.focusSetting)?.focus({ preventScroll: true });
    previous.current = pathname;
  }, [pathname, navigationState]);
  if (!local.state)
    return ['/fuentes', '/privacidad'].includes(pathname) ? null : (
      <Navigate to="/onboarding/bienvenida" replace />
    );
  return (
    <IonPage>
      <div className="local-shell local-shell--tabs" hidden={!tab}>
        <main
          ref={scroll}
          className="local-scroll"
          onScroll={(event) => {
            if (tab) positions.current.set(pathname, event.currentTarget.scrollTop);
          }}
        >
          {local.storageError && (
            <Feedback variant="error">
              <p>{local.storageError}</p>
            </Feedback>
          )}
          <div className="local-tab" hidden={pathname !== '/inicio'}>
            <HomeScreen />
          </div>
          <div className="local-tab" hidden={pathname !== '/analisis'}>
            <AnalysisScreen />
          </div>
          <div className="local-tab" hidden={pathname !== '/perfil'}>
            <ProfileScreen />
          </div>
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
      {!tab && (
        <Routes>
          <Route path="/perfil/registros" element={<RecordsScreen />} />
          <Route path="/perfil/notificaciones/*" element={<PreferencesScreen />} />
          {/* TEMPORARY: delete this route when connecting the final camera/analyzer flow. */}
          {TEMPORARY_CAMERA_PREVIEW_ENABLED && (
            <Route path={CAMERA_PREVIEW_PATH} element={<WaterScreen preview />} />
          )}
          <Route path="/fuentes" element={null} />
          <Route path="/privacidad" element={null} />
          <Route path="/inicio/agua" element={<WaterRoute />} />
          <Route path="/inicio/protector" element={<SunscreenScreen />} />
          <Route path="/jardin" element={<Navigate to="/analisis" replace />} />
          <Route path="*" element={<Navigate to="/inicio" replace />} />
        </Routes>
      )}
    </IonPage>
  );
}
