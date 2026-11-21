import { App as NativeApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import type { SyncState } from '@honeyflower/contracts';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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
import { useSqliteFoundation } from '../../shared/data/sqlite/SqliteFoundation.tsx';
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
  remote,
}: {
  accountId: string | null;
  children: ReactNode;
  remote: SyncRemotePort;
}) {
  const navigate = useNavigate();
  const sqlite = useSqliteFoundation();
  const local = useLocal();
  const refreshLocal = local.refresh;
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
    (force = false) => {
      if (!engine || !sqlite.connection) return;
      const connection = sqlite.connection;
      const online = navigator.onLine !== false;
      const task = force ? engine.retry(online) : engine.run(online);
      void task
        .then(async ({ summary, networkError, pulled }) => {
          if (pulled) await refreshLocal();
          const notice = await unreadReconciliationNotice(connection);
          setReconciliation(notice);
          const state: SyncState =
            summary.failedCount > 0 || networkError
              ? 'error'
              : summary.pendingCount > 0
                ? online
                  ? 'pending'
                  : 'offline'
                : 'synced';
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
    run();
    const online = () => run();
    const visibility = () => {
      if (document.visibilityState === 'visible') run();
    };
    window.addEventListener('online', online);
    document.addEventListener('visibilitychange', visibility);
    const native = NativeApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) run();
    });
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') run();
    }, 30_000);
    return () => {
      window.removeEventListener('online', online);
      document.removeEventListener('visibilitychange', visibility);
      window.clearInterval(interval);
      void native.then((listener) => listener.remove());
    };
  }, [engine, run]);

  useEffect(() => {
    if (engine && local.state) run();
  }, [engine, local.state, run]);

  const value: SyncView = {
    available: Boolean(engine),
    ...view,
    retry: () => run(true),
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
