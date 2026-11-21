import { App as NativeApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import type { SyncState } from '@honeyflower/contracts';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocal } from '../local/LocalProvider';
import { SyncEngine } from '../../shared/data/sync/engine.ts';
import type { SyncRemotePort } from '../../shared/data/sync/model.ts';
import {
  acknowledgeReconciliationNotice,
  unreadReconciliationNotice,
} from '../../shared/data/sync/outbox.ts';
import type { ReconciliationNotice } from '../../shared/data/sync/outbox.ts';
import { resolveSyncState } from '../../shared/data/sync/status.ts';
import { useSqliteFoundation } from '../../shared/data/sqlite/SqliteFoundation.tsx';
import { createDeviceConnectivity, watchConnectivity } from '../../shared/native/connectivity.ts';
import type { ConnectivityPort } from '../../shared/native/connectivity.ts';
import { APP_VERSION } from '../../shared/appVersion.ts';
import { Button } from '../../shared/components/Button.tsx';
import { TopNotice } from '../../shared/components/TopNotice.tsx';

interface SyncView {
  available: boolean;
  state: SyncState;
  pendingCount: number;
  lastPushedAt: number | null;
  retry: () => void;
}

const Context = createContext<SyncView>({
  available: false,
  state: 'synced',
  pendingCount: 0,
  lastPushedAt: null,
  retry: () => {},
});

export const useSyncStatus = () => useContext(Context);

export function SyncProvider({
  accountId,
  children,
  connectivity,
  remote,
}: {
  accountId: string | null;
  children: ReactNode;
  connectivity?: ConnectivityPort;
  remote: SyncRemotePort;
}) {
  const navigate = useNavigate();
  const sqlite = useSqliteFoundation();
  const local = useLocal();
  const refreshLocal = local.refresh;
  const activeConnectivity = useMemo(
    () => connectivity ?? createDeviceConnectivity(),
    [connectivity],
  );
  const online = useRef<boolean | null>(null);
  const engine = useMemo(
    () =>
      accountId && sqlite.connection && remote.configured
        ? new SyncEngine({
            connection: sqlite.connection,
            accountId,
            remote,
            platform: Capacitor.getPlatform() === 'android' ? 'android' : 'web',
            appVersion: APP_VERSION,
          })
        : null,
    [accountId, remote, sqlite.connection],
  );
  const [view, setView] = useState<Omit<SyncView, 'available' | 'retry'>>({
    state: accountId ? 'pending' : 'synced',
    pendingCount: 0,
    lastPushedAt: null,
  });
  const [reconciliation, setReconciliation] = useState<ReconciliationNotice | null>(null);

  const run = useCallback(
    (force = false, connected = online.current ?? false) => {
      if (!engine || !sqlite.connection) return;
      const connection = sqlite.connection;
      const task = force ? engine.retry(connected) : engine.run(connected);
      void task
        .then(async ({ summary, networkError, pulled }) => {
          if (pulled) await refreshLocal();
          const notice = await unreadReconciliationNotice(connection);
          setReconciliation(notice);
          const state = resolveSyncState({
            connected,
            failedCount: summary.failedCount,
            pendingCount: summary.pendingCount,
            networkError,
          });
          setView({
            state,
            pendingCount: summary.pendingCount,
            lastPushedAt: summary.lastPushedAt,
          });
        })
        .catch(() => setView((current) => ({ ...current, state: 'error' })));
    },
    [engine, refreshLocal, sqlite.connection],
  );

  const runWithCurrentConnectivity = useCallback(
    (force = false) => {
      void activeConnectivity
        .getStatus()
        .then((connected) => {
          online.current = connected;
          run(force, connected);
        })
        .catch(() => run(force, online.current ?? false));
    },
    [activeConnectivity, run],
  );

  const dismissReconciliation = useCallback(() => {
    if (!sqlite.connection || !reconciliation) return;
    const current = reconciliation;
    setReconciliation(null);
    void acknowledgeReconciliationNotice(sqlite.connection, current.operationIds).catch(() => {
      setReconciliation(current);
    });
  }, [reconciliation, sqlite.connection]);

  const reviewReconciliation = useCallback(() => {
    if (!reconciliation) return;
    const target = reconciliation.review === 'records' ? '/perfil/registros' : '/perfil';
    dismissReconciliation();
    void navigate(target, {
      state:
        target === '/perfil/registros'
          ? { from: '/perfil', sourceKey: 'sync-reconciliation' }
          : undefined,
    });
  }, [dismissReconciliation, navigate, reconciliation]);

  useEffect(() => {
    if (!engine) return;
    const stopConnectivity = watchConnectivity(activeConnectivity, (snapshot) => {
      online.current = snapshot.connected;
      if (snapshot.initial || snapshot.recovered || !snapshot.connected) {
        run(false, snapshot.connected);
      }
    });
    const visibility = () => {
      if (document.visibilityState === 'visible') runWithCurrentConnectivity();
    };
    document.addEventListener('visibilitychange', visibility);
    const native = NativeApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) runWithCurrentConnectivity();
    });
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') runWithCurrentConnectivity();
    }, 30_000);
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      window.clearInterval(interval);
      void stopConnectivity();
      void native.then((listener) => listener.remove());
    };
  }, [activeConnectivity, engine, run, runWithCurrentConnectivity]);

  useEffect(() => {
    if (engine && local.state && online.current !== null) run(false, online.current);
  }, [engine, local.state, run]);

  const value: SyncView = {
    available: Boolean(engine),
    ...view,
    retry: () => runWithCurrentConnectivity(true),
  };
  const adjusted = reconciliation?.count ?? 0;
  const reviewCopy =
    reconciliation?.review === 'both'
      ? 'Revisa tu perfil y tus registros antes de continuar.'
      : reconciliation?.review === 'records'
        ? 'Revisa tus registros antes de continuar.'
        : 'Revisa la configuración de tu perfil antes de continuar.';
  return (
    <Context.Provider value={value}>
      {reconciliation && (
        <TopNotice
          variant="warning"
          autoDismiss={false}
          message={`Ajustamos ${adjusted === 1 ? 'un cambio' : `${adjusted} cambios`} para que coincida${
            adjusted === 1 ? '' : 'n'
          } con la copia confirmada de tu cuenta. ${reviewCopy}`}
          onDismiss={dismissReconciliation}
        >
          <Button variant="text" onClick={reviewReconciliation}>
            Revisar ahora
          </Button>
        </TopNotice>
      )}
      {children}
    </Context.Provider>
  );
}
