import { Capacitor } from '@capacitor/core';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { LocalStoragePort } from '../localRepository.ts';
import type { LegacyImportStatus } from './legacyImport.ts';
import { SqliteDatabaseManager } from './manager.ts';
import { CapacitorSqliteFactory } from './native.ts';
import type { SqliteConnectionPort } from './port.ts';
import { prepareSqliteSnapshotStorage } from './snapshotStorage.ts';

type FoundationStatus = 'unavailable' | 'opening' | 'ready' | 'error';
export interface FoundationState {
  status: FoundationStatus;
  database: string;
  version: number;
  importStatus: LegacyImportStatus | 'not-run';
  connection: SqliteConnectionPort | null;
  localStorage: LocalStoragePort | null;
  issue: string;
}

const unavailable: FoundationState = {
  status: 'unavailable',
  database: '',
  version: 0,
  importStatus: 'not-run',
  connection: null,
  localStorage: null,
  issue: '',
};
const Context = createContext<FoundationState>(unavailable);
let deviceManager: SqliteDatabaseManager | undefined;
const manager = () => (deviceManager ??= new SqliteDatabaseManager(new CapacitorSqliteFactory()));

export function SqliteFoundation({
  children,
  errorFallback = null,
  scope,
  storage,
}: {
  children: ReactNode | ((localStorage: LocalStoragePort) => ReactNode);
  errorFallback?: ReactNode;
  scope: string;
  storage: LocalStoragePort;
}) {
  const supported = Capacitor.getPlatform() === 'android' && scope !== 'signed-out';
  const [state, setState] = useState<FoundationState>(
    supported ? { ...unavailable, status: 'opening' } : unavailable,
  );
  const database = useMemo(() => (supported ? manager() : null), [supported]);

  useEffect(() => {
    if (!database) return;
    let active = true;
    void database
      .open(scope)
      .then(async (opened) => {
        const prepared = await prepareSqliteSnapshotStorage(
          opened.connection,
          storage,
          Date.now,
          scope !== 'guest',
        );
        if (active)
          setState({
            status: 'ready',
            database: opened.name,
            version: opened.version,
            importStatus: prepared.imported.status,
            connection: opened.connection,
            localStorage: prepared.storage,
            issue: '',
          });
      })
      .catch(async () => {
        await database.close().catch(() => undefined);
        if (active)
          setState({
            status: 'error',
            database: '',
            version: 0,
            importStatus: 'not-run',
            connection: null,
            localStorage: null,
            issue: 'No se pudo preparar la base local SQLite.',
          });
      });
    return () => {
      active = false;
      void database.close();
    };
  }, [database, scope, storage]);

  const waiting = supported && state.status === 'opening';
  const failed = supported && state.status === 'error';
  const selected = state.localStorage ?? storage;
  const content = typeof children === 'function' ? children(selected) : children;
  return (
    <Context.Provider value={state}>
      {waiting ? null : failed ? errorFallback : content}
    </Context.Provider>
  );
}

export const useSqliteFoundation = () => useContext(Context);
