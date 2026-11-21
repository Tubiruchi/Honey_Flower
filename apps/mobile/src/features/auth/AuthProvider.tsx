import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { App as NativeApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { createSupabaseServices } from './supabase';
import { parseAuthCallback, unconfiguredAuth } from './model';
import type { AccountUser, AuthPort } from './model';
import { unconfiguredSync } from '../../shared/data/sync/model';
import type { SyncRemotePort } from '../../shared/data/sync/model';
import { deviceReminders } from '../../shared/native/reminders';
import { createOnboardingDraft } from '../onboarding/model';
import { clearAccountReminders } from '../reminders/coordinator';

interface AccountContext {
  port: AuthPort;
  sync: SyncRemotePort;
  user: AccountUser | null;
  loading: boolean;
  issue: string;
  recovery: boolean;
  mode: 'guest' | 'signed-out';
  enterGuest: () => void;
  reload: () => void;
  signOut: () => Promise<void>;
}
const Context = createContext<AccountContext>({
  port: unconfiguredAuth,
  sync: unconfiguredSync,
  user: null,
  loading: false,
  issue: '',
  recovery: false,
  mode: 'guest',
  enterGuest: () => {},
  reload: () => {},
  signOut: async () => {},
});
export const useAuth = () => useContext(Context);
const ACCESS_KEY = 'honeyflower.access.v1';
export function AuthProvider({
  children,
  port: supplied,
  sync: suppliedSync,
  persist = true,
}: {
  children: ReactNode;
  port?: AuthPort;
  sync?: SyncRemotePort;
  persist?: boolean;
}) {
  const navigate = useNavigate();
  const [services] = useState(() =>
    supplied
      ? { auth: supplied, sync: suppliedSync ?? unconfiguredSync }
      : createSupabaseServices(),
  );
  const port = services.auth;
  const [user, setUser] = useState<AccountUser | null>(null);
  const [loading, setLoading] = useState(port.configured);
  const [issue, setIssue] = useState('');
  const [recovery, setRecovery] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const previousUser = useRef<string | null>(null);
  const [mode, setMode] = useState<'guest' | 'signed-out'>(() => {
    try {
      return persist && localStorage.getItem(ACCESS_KEY) === 'guest' ? 'guest' : 'signed-out';
    } catch {
      return 'signed-out';
    }
  });
  const changeMode = (next: 'guest' | 'signed-out') => {
    if (persist) localStorage.setItem(ACCESS_KEY, next);
    setMode(next);
  };
  useEffect(() => {
    let alive = true,
      changed = false;
    const settleWithoutSession = () => {
      let guest = false;
      if (persist) {
        try {
          guest = localStorage.getItem(ACCESS_KEY) === 'guest';
          if (!guest) localStorage.setItem(ACCESS_KEY, 'signed-out');
        } catch {
          guest = false;
        }
      }
      setMode(guest ? 'guest' : 'signed-out');
    };
    const unsubscribe = port.subscribe((next, recovering) => {
      changed = true;
      if (!alive) return;
      if (previousUser.current !== (next?.id ?? null)) {
        previousUser.current = next?.id ?? null;
        void clearAccountReminders(deviceReminders(), createOnboardingDraft()).catch(() => {});
      }
      setUser(next);
      setRecovery(recovering);
      setLoading(false);
      setIssue('');
      if (!next) settleWithoutSession();
    });
    void port
      .restore()
      .then((next) => {
        if (alive && !changed) {
          if (previousUser.current !== (next?.id ?? null)) {
            previousUser.current = next?.id ?? null;
            void clearAccountReminders(deviceReminders(), createOnboardingDraft()).catch(() => {});
          }
          setUser(next);
          setLoading(false);
          setIssue('');
        }
      })
      .catch(() => {
        if (alive && !changed) {
          setLoading(false);
          settleWithoutSession();
          setIssue('No pudimos recuperar tu sesión. Reintenta o vuelve al onboarding.');
        }
      });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [port, persist, attempt]);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let disposed = false;
    const open = (url: string) => {
      const callback = parseAuthCallback(url, window.location.origin);
      if (!callback || disposed) return;
      const query = new URLSearchParams({
        code: callback.code,
        ...(callback.recovery ? { flow: 'recovery' } : {}),
        ...(callback.flowId ? { sb_flow_id: callback.flowId } : {}),
      });
      void navigate(`/cuenta/callback?${query}`, { replace: true });
    };
    const listener = NativeApp.addListener('appUrlOpen', ({ url }) => open(url));
    void NativeApp.getLaunchUrl()
      .then((value) => {
        if (value?.url) open(value.url);
      })
      .catch(() => {});
    return () => {
      disposed = true;
      void listener.then((handle) => handle.remove());
    };
  }, [navigate]);
  return (
    <Context.Provider
      value={{
        port,
        sync: services.sync,
        user,
        loading,
        issue,
        recovery,
        mode,
        enterGuest: () => {
          changeMode('guest');
          setIssue('');
        },
        reload: () => {
          setLoading(true);
          setAttempt((n) => n + 1);
        },
        signOut: async () => {
          // Cancel this account's native agenda before releasing its visible local state.
          await clearAccountReminders(deviceReminders(), createOnboardingDraft());
          await port.signOut();
          changeMode('signed-out');
          setUser(null);
          setRecovery(false);
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
