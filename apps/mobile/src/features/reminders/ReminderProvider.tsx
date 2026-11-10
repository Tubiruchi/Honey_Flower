import { createContext, useContext, useEffect, useRef, useState } from 'react';
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
import { IconButton } from '../../shared/components';
import { createOnboardingDraft } from '../onboarding/model';

interface ReminderContextValue extends ReminderStatus {
  message: string;
  flash: { available: boolean; granted: boolean };
  requestPermission: () => Promise<void>;
  authorizeFlash: () => Promise<void>;
  retry: () => void;
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
  const [message, setMessage] = useState('');
  const [refresh, setRefresh] = useState(0);
  const latest = useRef(local);
  useEffect(() => {
    latest.current = local;
  }, [local]);
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
      .listen((reminder) => {
        const current = latest.current;
        if (!current.state || current.status !== 'ready' || document.visibilityState === 'hidden')
          return;
        const prefs = current.state.preferences;
        const time = new Intl.DateTimeFormat('en-GB', {
          timeZone: prefs.timeZone,
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23',
        }).format(current.clock.now());
        if (
          !prefs.notifications ||
          inQuietTime(time, prefs.quietPeriods) ||
          (reminder.expiresAt !== undefined && current.clock.now() >= reminder.expiresAt)
        )
          return;
        setMessage(reminder.body);
        if (
          foregroundFlashAllowed(
            prefs,
            reminder.level,
            document.visibilityState === 'visible',
            matchMedia('(prefers-reduced-motion: reduce)').matches,
          )
        )
          void port
            .pulse()
            .catch(() =>
              setMessage(
                'La linterna no está disponible. El recordatorio sigue visible en el teléfono.',
              ),
            );
      }, opened)
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
    const resume = () => {
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
  }, [port, navigate]);
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
  return (
    <Context.Provider
      value={{
        ...status,
        flash,
        message,
        requestPermission: () => authorize('notifications'),
        authorizeFlash: () => authorize('flash'),
        retry: () => setRefresh((v) => v + 1),
      }}
    >
      {children}
      {message && (
        <div className="reminder-banner" aria-label="Recordatorio" role="status">
          <p className="hf-type-body-sm">{message}</p>
          <IconButton label="Cerrar recordatorio" icon="close" onClick={() => setMessage('')} />
        </div>
      )}
    </Context.Provider>
  );
}
export function useReminders() {
  const value = useContext(Context);
  return value;
}
