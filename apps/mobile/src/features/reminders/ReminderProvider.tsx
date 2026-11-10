import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { App as NativeApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useLocal } from '../local/LocalProvider';
import { deviceReminders } from '../../shared/native/reminders';
import type { ReminderDevice } from '../../shared/native/reminders';
import { ReminderCoordinator } from './coordinator';
import type { ReminderStatus } from './coordinator';
import { foregroundFlashAllowed, inQuietTime } from './preferences';
import { createOnboardingDraft } from '../onboarding/model';
import { ForegroundReminders } from './foreground';
import type { Reminder } from './model';
import { PlantReminderNotice } from './PlantReminderNotice';
import { currentDay, speciesAt } from '../local/model';

interface ReminderContextValue extends ReminderStatus {
  message: string;
  flash: { available: boolean; granted: boolean };
  requestPermission: () => Promise<void>;
  authorizeFlash: () => Promise<void>;
  retry: () => void;
  exact: { available: boolean; granted: boolean };
  requestExactDelivery: () => Promise<void>;
}
const Context = createContext<ReminderContextValue | null>(null);
export function ReminderProvider({
  children,
  device,
}: {
  children: ReactNode;
  device?: ReminderDevice;
}) {
  const local = useLocal();
  const navigate = useNavigate();
  const [port] = useState(device ?? deviceReminders);
  const [coordinator] = useState(() => new ReminderCoordinator(port, local.storage));
  const [status, setStatus] = useState<ReminderStatus>({
    permission: port.supported ? 'unknown' : 'unsupported',
    pending: 0,
    busy: false,
    issue: '',
  });
  const [flash, setFlash] = useState({ available: false, granted: false });
  const [queue, setQueue] = useState<Reminder[]>([]);
  const [exact, setExact] = useState({ available: !!port.exactStatus, granted: false });
  const seen = useRef(new Set<string>());
  const [foreground] = useState(() => new ForegroundReminders());
  const [refresh, setRefresh] = useState(0);
  const latest = useRef(local);
  useEffect(() => {
    latest.current = local;
  }, [local]);
  const received = useCallback(
    (reminder: Reminder) => {
      const current = latest.current;
      if (!current.state || current.status !== 'ready' || document.visibilityState === 'hidden')
        return;
      const prefs = current.state.preferences;
      const now = current.clock.now();
      const time = new Intl.DateTimeFormat('en-GB', {
        timeZone: prefs.timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).format(now);
      if (
        !prefs.notifications ||
        inQuietTime(time, prefs.quietPeriods) ||
        (reminder.expiresAt !== undefined && now >= reminder.expiresAt)
      )
        return;
      const key = reminder.key ?? `${reminder.kind}:${reminder.body}:${now}`;
      if (seen.current.has(key)) return;
      if (seen.current.size > 512) seen.current.delete(seen.current.values().next().value!);
      seen.current.add(key);
      setQueue((q) => [...q, { ...reminder, key }]);
      if (
        foregroundFlashAllowed(
          prefs,
          reminder.level,
          true,
          matchMedia('(prefers-reduced-motion: reduce)').matches,
        )
      )
        void port.pulse().catch(() => {
          /* The visible plant message remains available. */
        });
    },
    [port],
  );
  useEffect(() => {
    const tick = () => {
      const current = latest.current;
      const visible = document.visibilityState !== 'hidden';
      if (!current.state || current.status !== 'ready') return;
      const now = current.clock.now();
      for (const notice of foreground.tick(current.state, now, visible)) received(notice);
      setQueue((q) => {
        const next = q.filter(
          (r) =>
            visible &&
            current.state!.preferences.notifications &&
            (r.expiresAt === undefined || r.expiresAt > now),
        );
        return next.length === q.length ? q : next;
      });
    };
    const interval = window.setInterval(tick, 1000);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
    };
  }, [foreground, received]);
  useEffect(() => {
    let alive = true;
    if (local.status === 'error') {
      void port
        .replace([], local.state?.preferences ?? createOnboardingDraft('UTC'), false)
        .catch(() => {});
      void port.stopFlash().catch(() => {});
      return;
    }
    if (!local.state || local.status !== 'ready') return;
    void coordinator.reconcile(local.state, local.now).then((next) => {
      if (alive && next) setStatus(next);
    });
    return () => {
      alive = false;
    };
  }, [coordinator, port, local.state, local.now, local.status, refresh]);
  useEffect(() => {
    let disposed = false;
    let stop: (() => void) | undefined;
    const opened = (route: string) => {
      if (route === '/inicio/agua' || route === '/inicio/protector')
        void navigate(route, { state: { from: '/inicio' } });
    };
    void port
      .listen(received, opened)
      .then((cleanup) => {
        if (disposed) cleanup();
        else stop = cleanup;
      })
      .catch(() => {
        if (!disposed)
          setStatus((s) => ({
            ...s,
            issue:
              'No pudimos conectar con los avisos del teléfono. Puedes seguir registrando hábitos.',
          }));
      });
    void port
      .flashStatus()
      .then((value) => {
        if (!disposed) setFlash(value);
      })
      .catch(() => {});
    const readExact = () => {
      void port
        .exactStatus?.()
        .then((value) => {
          if (!disposed) setExact({ available: true, granted: value.granted });
        })
        .catch(() => {});
    };
    readExact();
    const resume = () => {
      readExact();
      setRefresh((v) => v + 1);
      void port
        .flashStatus()
        .then((value) => {
          if (!disposed) setFlash(value);
        })
        .catch(() => {});
      if (document.visibilityState === 'hidden') void port.stopFlash().catch(() => {});
    };
    window.addEventListener('focus', resume);
    document.addEventListener('visibilitychange', resume);
    const native = Capacitor.isNativePlatform()
      ? NativeApp.addListener('appStateChange', ({ isActive }) => {
          if (!isActive) void port.stopFlash().catch(() => {});
          else resume();
        })
      : null;
    return () => {
      disposed = true;
      stop?.();
      void port.stopFlash().catch(() => {});
      window.removeEventListener('focus', resume);
      document.removeEventListener('visibilitychange', resume);
      void native?.then((handle) => handle.remove());
    };
  }, [port, navigate, received]);
  async function authorize(action: 'notifications' | 'flash') {
    setStatus((s) => ({ ...s, busy: true, issue: '' }));
    try {
      if (action === 'notifications') {
        const permission = await port.requestPermission();
        setStatus((s) => ({ ...s, permission, busy: false }));
      } else {
        setFlash(await port.authorizeFlash());
        setStatus((s) => ({ ...s, busy: false }));
      }
      setRefresh((v) => v + 1);
    } catch {
      setStatus((s) => ({
        ...s,
        busy: false,
        issue: 'No pudimos consultar el permiso. Puedes continuar sin activar esa capacidad.',
      }));
    }
  }
  const currentNotice = queue[0];
  return (
    <Context.Provider
      value={{
        ...status,
        flash,
        message: queue[0]?.body ?? '',
        requestPermission: () => authorize('notifications'),
        authorizeFlash: () => authorize('flash'),
        retry: () => setRefresh((v) => v + 1),
        exact,
        requestExactDelivery: async () => {
          try {
            await port.requestExactDelivery?.();
            setRefresh((v) => v + 1);
          } catch {
            setStatus((s) => ({
              ...s,
              issue: 'No pudimos abrir el permiso de alarmas. Revisa los ajustes de Android.',
            }));
          }
        },
      }}
    >
      {children}
      {currentNotice && local.state && (
        <PlantReminderNotice
          key={currentNotice.key}
          reminder={currentNotice}
          species={speciesAt(local.state, Math.floor(currentDay(local.state, local.now) / 7))}
          onClose={() => setQueue((q) => q.slice(1))}
          onOpen={() => {
            setQueue((q) => q.slice(1));
            void navigate(currentNotice.kind === 'water' ? '/inicio/agua' : '/inicio/protector', {
              state: { from: '/inicio' },
            });
          }}
        />
      )}
    </Context.Provider>
  );
}
export function useReminders() {
  const value = useContext(Context);
  return value;
}
