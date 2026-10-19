import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { OnboardingDraft } from '../onboarding/model';
import { readOnboardingSnapshot } from '../onboarding/model';
import {
  advanceCycle,
  createLocalState,
  editWaterEvent,
  LOCAL_STORAGE_KEY,
  parseLocalState,
  recordEvent,
  removeEvent,
  updatePreferences,
} from './model';
import type { LocalState } from './model';

interface LocalContextValue {
  state: LocalState | null;
  now: number;
  storageError: string;
  start: (draft?: OnboardingDraft) => void;
  record: (kind: 'water' | 'sunscreen', amount: number) => string;
  remove: (id: string) => void;
  edit: (id: string, amount: number) => void;
  update: (draft: OnboardingDraft) => void;
}
const LocalContext = createContext<LocalContextValue | null>(null);

export function LocalProvider({
  children,
  initialState,
  persist = true,
  referenceNow,
}: {
  children: ReactNode;
  initialState?: LocalState;
  persist?: boolean;
  referenceNow?: number;
}) {
  const [loaded] = useState(() => {
    if (initialState) return { state: initialState, error: '' };
    if (!persist) return { state: null, error: '' };
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      const state = parseLocalState(raw);
      return {
        state,
        error:
          raw && !state
            ? 'No pudimos leer los datos locales. Conserva una copia antes de reiniciar la prueba.'
            : '',
      };
    } catch {
      return {
        state: null,
        error: 'El almacenamiento no está disponible. Los cambios serán temporales.',
      };
    }
  });
  const [state, setState] = useState<LocalState | null>(() =>
    loaded.state ? advanceCycle(loaded.state, referenceNow ?? Date.now()) : null,
  );
  const stateRef = useRef(state);
  const [now, setNow] = useState(() => referenceNow ?? Date.now());
  const [storageError, setStorageError] = useState(loaded.error);
  const lastRecord = useRef({ at: -Infinity, signature: '' });
  useEffect(() => {
    if (persist && loaded.state && stateRef.current !== loaded.state) {
      const timer = window.setTimeout(() => {
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateRef.current));
        } catch {
          setStorageError('No pudimos guardar el inicio del nuevo ciclo.');
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [loaded, persist]);
  function commit(next: LocalState) {
    if (persist) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
        setStorageError('');
      } catch {
        setStorageError('No pudimos guardar los cambios. Mantén abierta la app para conservarlos.');
      }
    }
    stateRef.current = next;
    setState(next);
  }
  useEffect(() => {
    if (referenceNow !== undefined) return;
    const refresh = () => {
      if (document.visibilityState === 'hidden') return;
      const time = Date.now();
      setNow(time);
      const current = stateRef.current;
      if (current) {
        const next = advanceCycle(current, time);
        if (next !== current) {
          if (persist) {
            try {
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
            } catch {
              setStorageError('No pudimos guardar el inicio del nuevo ciclo.');
            }
          }
          stateRef.current = next;
          setState(next);
        }
      }
    };
    refresh();
    const timer = window.setInterval(refresh, 15_000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [persist, referenceNow]);
  const time = () => referenceNow ?? Date.now();
  const current = () => {
    if (!stateRef.current) throw new Error('Entra al modo de prueba para comenzar.');
    return advanceCycle(stateRef.current, time());
  };
  return (
    <LocalContext.Provider
      value={{
        state,
        now,
        storageError,
        start: (draft) => {
          if (stateRef.current) {
            commit(current());
            return;
          }
          if (!draft && persist) {
            try {
              draft = readOnboardingSnapshot(localStorage)?.draft;
            } catch {
              /* Defaults remain usable. */
            }
          }
          commit(createLocalState(time(), draft, Math.random() < 0.5 ? 'sprout' : 'cactus'));
        },
        record: (kind, amount) => {
          const at = time();
          const signature = `${kind}:${amount}`;
          if (
            signature === lastRecord.current.signature &&
            performance.now() - lastRecord.current.at < 500
          )
            throw new Error('Espera un instante antes de registrar otra vez.');
          const id = crypto.randomUUID();
          commit(recordEvent(current(), { id, kind, amount, at }, at));
          lastRecord.current = { at: performance.now(), signature };
          setNow(at);
          return id;
        },
        edit: (id, amount) => {
          commit(editWaterEvent(current(), id, amount, time()));
        },
        remove: (id) => {
          commit(removeEvent(current(), id, time()));
        },
        update: (draft) => {
          commit(updatePreferences(current(), draft, time()));
        },
      }}
    >
      {children}
    </LocalContext.Provider>
  );
}
export function useLocal() {
  const context = useContext(LocalContext);
  if (!context) throw new Error('LocalProvider is required');
  return context;
}
