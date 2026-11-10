import { useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { UNSAFE_DataRouterContext, useBlocker, useLocation, useNavigate } from 'react-router-dom';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import {
  Button,
  CameraFocus,
  CameraPhoto,
  CameraShutter,
  PlantPrompt,
  PlantCharacter,
  RegistrationConfirmation,
  DetectionPlantMessage,
  DetectionApprovalBadge,
  DetectionApprovalStamp,
} from '../../shared/components';
import { useLocal } from '../local/LocalProvider';
import { Modal } from '../local/Modal';
import { currentDay, dayStart, speciesAt } from '../local/model';
import { HabitEntryScreen } from '../records/HabitEntryScreen';
import { waterPhotoTrigger } from './policy';
import { WaterAttemptStore } from './attempt';
import { WaterController } from './WaterController';
import { useWaterServices } from './WaterServices';
import { takeRestoredWaterPhoto, onRestoredWaterPhoto } from './WaterRuntime';
import './water.css';
import { memoryStorage } from '../../shared/data/localRepository';

export function WaterRoute() {
  const local = useLocal();
  const location = useLocation();
  const [pending] = useState(() => new WaterAttemptStore(local.storage).read());
  const [check] = useState(() => ({
    done: false,
    required: false,
    listeners: new Set<() => void>(),
  }));
  useEffect(() => {
    let active = true;
    void pending.then(
      (attempt) => {
        if (active) {
          check.done = true;
          check.required = !!attempt;
          check.listeners.forEach((l) => l());
        }
      },
      () => {
        if (active) {
          check.done = true;
          check.required = true;
          check.listeners.forEach((l) => l());
        }
      },
    );
    return () => {
      active = false;
    };
  }, [pending, check]);
  const status = useSyncExternalStore(
    (callback) => {
      check.listeners.add(callback);
      return () => {
        check.listeners.delete(callback);
      };
    },
    () => (check.done ? (check.required ? 'capture' : 'manual') : 'loading'),
  );
  if (status === 'loading')
    return (
      <main className="local-recovery" role="status">
        Recuperando intento…
      </main>
    );
  const requested = (location.state as { capture?: boolean } | null)?.capture;
  return (
    <WaterChoice
      capture={status === 'capture' || !!requested}
      initialRequired={!!waterPhotoTrigger(local.state!, local.now)}
    />
  );
}
function WaterChoice({ capture, initialRequired }: { capture: boolean; initialRequired: boolean }) {
  const [started, setStarted] = useState(capture || initialRequired);
  if (capture && !started) setStarted(true);
  return started ? <WaterScreen /> : <HabitEntryScreen kind="water" />;
}
function WaterBackGuard({ active, onBack }: { active: boolean; onBack: () => void }) {
  return useContext(UNSAFE_DataRouterContext) ? (
    <DataWaterBackGuard active={active} onBack={onBack} />
  ) : null;
}
function DataWaterBackGuard({ active, onBack }: { active: boolean; onBack: () => void }) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      active && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    if (blocker.state === 'blocked') {
      blocker.reset();
      onBack();
    }
  }, [blocker, onBack]);
  return null;
}
export function WaterScreen({ preview = false }: { preview?: boolean }) {
  const local = useLocal();
  const navigate = useNavigate();
  const location = useLocation();
  const services = useWaterServices();
  const [controller] = useState(
    () =>
      new WaterController({
        // TEMPORARY preview is memory-only: never consume a real attempt or commit to the repository.
        // Remove with temporaryPreview.ts; see docs/conexiones-futuras.md.
        store: new WaterAttemptStore(preview ? memoryStorage() : local.storage),
        camera: services.camera,
        analyzer: services.analyzer,
        now: local.clock.now,
        id: () => crypto.randomUUID(),
        dayStart: dayStart(local.state!, currentDay(local.state!, local.now)),
        amount: String((location.state as { amount?: number } | null)?.amount ?? 250),
        commit: preview
          ? async () => {
              throw new Error('La prueba temporal de cámara no permite registrar hábitos.');
            }
          : local.commit,
      }),
  );
  const view = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  const [exit, setExit] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const [readyStream, setReadyStream] = useState<MediaStream | null>(null);
  const face = (
    <PlantCharacter
      view="face"
      decorative
      species={speciesAt(local.state!, Math.floor(currentDay(local.state!, local.now) / 7))}
    />
  );
  const locked = view.phase === 'saving';
  const returnPath = preview ? '/perfil' : '/inicio';
  const close = () =>
    void navigate(returnPath, {
      replace: true,
      state: preview ? { focusSetting: 'profile-camera-preview' } : undefined,
    });
  useEffect(() => {
    const release = controller.retain();
    const restore = async () => {
      await controller.initialize();
      if (preview) return;
      const photo = takeRestoredWaterPhoto();
      if (photo) await controller.acceptPhoto(photo);
    };
    void restore();
    const stop = preview ? () => {} : onRestoredWaterPhoto(() => void restore());
    const visibility = () => {
      if (document.visibilityState === 'hidden') controller.pause();
    };
    document.addEventListener('visibilitychange', visibility);
    const nativeState = Capacitor.isNativePlatform()
      ? App.addListener('appStateChange', ({ isActive }) => {
          if (!isActive) controller.pause();
        })
      : null;
    const nativePause = Capacitor.isNativePlatform()
      ? App.addListener('pause', () => {
          // Pause precedes Stop during a quick app switch. A permission dialog has no stream yet.
          if (controller.getSnapshot().session?.stream) controller.pause();
        })
      : null;
    return () => {
      stop();
      document.removeEventListener('visibilitychange', visibility);
      void nativeState?.then((handle) => handle.remove()).catch(() => {});
      void nativePause?.then((handle) => handle.remove()).catch(() => {});
      release();
    };
  }, [controller, preview]);
  useEffect(() => {
    const element = video.current;
    if (element && view.session?.stream) {
      element.srcObject = view.session.stream;
      void element.play().catch(() => undefined);
    }
    return () => {
      if (element) element.srcObject = null;
    };
  }, [view.session]);
  useEffect(() => {
    const back = (event: Event) => {
      (
        event as CustomEvent<{ register: (priority: number, handler: () => void) => void }>
      ).detail.register(30, () => {
        if (view.phase === 'saved') void navigate(returnPath, { replace: true });
        else if (!locked) setExit(true);
      });
    };
    document.addEventListener('ionBackButton', back);
    return () => document.removeEventListener('ionBackButton', back);
  }, [locked, view.phase, navigate, returnPath]);
  async function leave() {
    if (locked) return;
    setLeaving(true);
    if (await controller.discard()) {
      setExit(false);
      close();
    } else setLeaving(false);
  }
  const capture = view.phase === 'camera' || view.phase === 'capturing';
  return (
    <main
      className={`water-screen ${view.photo ? 'water-screen--photo' : ''}`}
      aria-label={preview ? 'Prueba temporal de cámara' : 'Registro de agua con fotografía'}
    >
      <WaterBackGuard
        active={!leaving && view.phase !== 'saved'}
        onBack={() => {
          if (!locked) setExit(true);
        }}
      />
      {view.photo && (
        <div className="water-background">
          <CameraPhoto src={view.photo.url} />
        </div>
      )}
      {view.session?.stream && (
        <video
          ref={video}
          className="water-video"
          playsInline
          muted
          autoPlay
          onLoadedData={() => setReadyStream(view.session?.stream ?? null)}
          onPlaying={() => setReadyStream(view.session?.stream ?? null)}
          aria-label="Vista previa de la cámara"
        />
      )}
      <header className="water-header">
        <h1 className="hf-type-label-md">{preview ? 'Prueba de cámara' : 'Registro de agua'}</h1>
        <Button
          variant="text"
          disabled={locked || leaving}
          onClick={() => {
            if (view.phase === 'saved') close();
            else setExit(true);
          }}
        >
          {view.phase === 'saved' ? 'Cerrar' : 'Cancelar'}
        </Button>
      </header>
      {preview && (
        <p className="water-preview-notice hf-type-caption" role="note">
          Temporal · Solo para revisar el diseño. No guarda registros. Se retirará al conectar la
          versión final.
        </p>
      )}
      {view.phase === 'saved' ? (
        <section className="water-card water-saved" role="status">
          <PlantPrompt face={face} message="¡Agua registrada!" />
          <h2 className="hf-type-heading-lg">Tu registro está guardado</h2>
          <p>Se añadieron {view.attempt?.amount} mL a tu día de planta.</p>
          <Button onClick={() => void navigate('/inicio', { replace: true })}>
            Volver al inicio
          </Button>
        </section>
      ) : (
        <>
          {view.phase === 'review' || (locked && view.photo) ? (
            <section className="water-review">
              {view.analysis?.status === 'approved' ? (
                <div className="water-approved">
                  <DetectionPlantMessage message={view.analysis.message} />
                  <DetectionApprovalStamp />
                  <DetectionApprovalBadge />
                </div>
              ) : (
                <PlantPrompt face={face} message="Revisa tu foto y confirma cuánto bebiste." />
              )}
              <p className="water-review__caption hf-type-body-sm" role="status">
                {view.message}
              </p>
              <RegistrationConfirmation
                value={view.attempt?.amount ?? ''}
                title={preview ? 'Prueba de la confirmación' : undefined}
                confirmLabel={preview ? 'Terminar prueba' : undefined}
                state={!preview && local.pending ? 'save-error' : locked ? 'saving' : 'normal'}
                saveError={local.storageError}
                retakeDisabled={locked}
                onChange={(amount) => controller.changeAmount(amount)}
                onConfirm={() => void (preview ? leave() : controller.confirm())}
                onRetrySave={() => void local.retry()}
                onRetake={() => void controller.activateCamera()}
              />
              {!preview && local.pending && (
                <Button
                  variant="text"
                  disabled={local.writing}
                  onClick={() => void local.discard()}
                >
                  Cerrar intento de guardado
                </Button>
              )}
            </section>
          ) : capture ? (
            <section className="water-capture">
              <PlantPrompt face={face} message="Encuadra tu vaso o botella de agua." />
              <div className="water-focus">
                <CameraFocus />
                {view.session?.stream && readyStream !== view.session.stream && (
                  <p>Preparando vista previa…</p>
                )}
              </div>
              <CameraShutter
                disabled={
                  view.phase === 'capturing' ||
                  (!!view.session?.stream && readyStream !== view.session.stream)
                }
                onCapture={() => void controller.capture(video.current)}
              />
              {view.phase === 'capturing' && <p role="status">Preparando la fotografía…</p>}
            </section>
          ) : (
            <section className="water-card">
              <PlantPrompt
                face={face}
                message={
                  view.phase === 'expired'
                    ? 'El día de planta cambió.'
                    : 'Una foto antes de registrar tu agua.'
                }
              />
              <h2 className="hf-type-heading-lg">
                {view.phase === 'loading'
                  ? 'Preparando cámara…'
                  : view.phase === 'analyzing'
                    ? 'Preparando tu fotografía…'
                    : view.phase === 'saving'
                      ? 'Recuperando guardado…'
                      : view.phase === 'expired'
                        ? 'Este intento terminó'
                        : view.phase === 'rejected'
                          ? 'Vuelve a tomar la foto'
                          : view.phase === 'error'
                            ? 'No pudimos continuar'
                            : 'Fotografía tu agua'}
              </h2>
              <p role="status">
                {view.phase === 'expired'
                  ? 'No se añadieron registros a otro día. Regresa al inicio para comenzar de nuevo.'
                  : view.message ||
                    (preview
                      ? 'Abre la cámara para revisar el encuadre y cómo queda tu foto en la pantalla de confirmación. La cantidad es solo de prueba.'
                      : 'Hay un día cerrado con agua pendiente. Toma una foto de tu vaso o botella y confirma la cantidad que bebiste. La foto no mide el volumen ni prueba el consumo.')}
              </p>
              {view.attempt && (
                <p className="hf-type-label-md">Cantidad del intento: {view.attempt.amount} mL</p>
              )}
              {['ready', 'error', 'rejected'].includes(view.phase) && !view.attempt?.command && (
                <Button
                  onClick={() =>
                    void (view.attempt ? controller.activateCamera() : controller.reload())
                  }
                >
                  {view.phase === 'ready' ? 'Activar cámara' : 'Reintentar'}
                </Button>
              )}
              {!preview && local.pending && (
                <>
                  <Button loading={local.writing} onClick={() => void local.retry()}>
                    Reintentar guardado
                  </Button>
                  <Button
                    variant="text"
                    disabled={local.writing}
                    onClick={() => void local.discard()}
                  >
                    Cerrar intento de guardado
                  </Button>
                </>
              )}
              {view.phase === 'expired' && (
                <Button onClick={() => void leave()}>Volver al inicio</Button>
              )}
            </section>
          )}
        </>
      )}
      {exit && (
        <Modal
          title={preview ? '¿Salir de la prueba?' : '¿Salir sin registrar?'}
          busy={leaving}
          onClose={() => setExit(false)}
        >
          <p>
            {preview
              ? 'Se descartará la foto temporal. Esta prueba no añade ni modifica tus registros.'
              : 'Si sales, esta foto y este intento se descartarán. Tus registros guardados se conservan.'}
          </p>
          <Button onClick={() => setExit(false)}>Volver a la cámara</Button>
          <Button variant="text" disabled={leaving} onClick={() => void leave()}>
            {preview ? 'Salir de la prueba' : 'Salir sin registrar'}
          </Button>
        </Modal>
      )}
    </main>
  );
}
