import type {
  WaterCamera,
  WaterCameraSession,
  CapturedWaterPhoto,
} from '../../shared/native/waterCamera.ts';
import type { OperationResult } from '../../shared/data/localSnapshot.ts';
import type { WaterAnalyzer, WaterAnalysis } from './analysis.ts';
import { WaterAttemptStore } from './attempt.ts';
import type { WaterAttempt, WaterRecordCommand } from './attempt.ts';
import { DAY_MS } from '../local/model.ts';

export interface WaterView {
  phase:
    | 'loading'
    | 'ready'
    | 'camera'
    | 'capturing'
    | 'analyzing'
    | 'review'
    | 'rejected'
    | 'error'
    | 'saving'
    | 'saved'
    | 'expired';
  attempt: WaterAttempt | null;
  session: WaterCameraSession | null;
  photo: CapturedWaterPhoto | null;
  analysis: WaterAnalysis | null;
  message: string;
  result: OperationResult | null;
}
export class WaterController {
  private options: {
    store: WaterAttemptStore;
    camera: WaterCamera;
    analyzer: WaterAnalyzer;
    now: () => number;
    id: () => string;
    dayStart: number;
    amount: string;
    commit: (command: WaterRecordCommand) => Promise<OperationResult>;
  };
  private view: WaterView = {
    phase: 'loading',
    attempt: null,
    session: null,
    photo: null,
    analysis: null,
    message: '',
    result: null,
  };
  private listeners = new Set<() => void>();
  private initial: Promise<void> | null = null;
  private writes: Promise<unknown> = Promise.resolve();
  private generation = 0;
  private disposed = false;
  private openingCamera = false;
  private consumers = 0;
  retain() {
    this.consumers++;
    return () => {
      this.consumers--;
      queueMicrotask(() => {
        if (this.consumers === 0) this.dispose();
      });
    };
  }
  constructor(options: WaterController['options']) {
    this.options = options;
  }
  getSnapshot = () => this.view;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(patch: Partial<WaterView>) {
    this.view = { ...this.view, ...patch };
    this.listeners.forEach((listener) => listener());
  }
  private persist(attempt: WaterAttempt) {
    const task = this.writes.then(() => this.options.store.write(attempt));
    this.writes = task.catch(() => undefined);
    return task;
  }
  private expired() {
    const draft = this.view.attempt;
    return (
      !!draft &&
      (this.options.now() < draft.dayStart || this.options.now() >= draft.dayStart + DAY_MS)
    );
  }
  initialize() {
    this.initial ??= this.load();
    return this.initial;
  }
  async reload() {
    this.initial = this.load();
    return this.initial;
  }
  private async load() {
    this.publish({ phase: 'loading', message: '' });
    try {
      let attempt = await this.options.store.read();
      const recovered = !!attempt;
      if (!attempt) {
        attempt = {
          version: 1,
          id: this.options.id(),
          eventId: this.options.id(),
          startedAt: this.options.now(),
          dayStart: this.options.dayStart,
          amount: this.options.amount,
          from: '/inicio',
          captureId: null,
          awaitingCapture: false,
        };
        await this.persist(attempt);
      }
      if (this.disposed) return;
      this.publish({ attempt });
      // Replay a personally confirmed operation before checking expiry: a lost acknowledgement may already be on disk.
      if (attempt.command) {
        await this.save(attempt.command);
        return;
      }
      this.publish({
        phase: this.expired() ? 'expired' : 'ready',
        message: recovered
          ? 'Recuperamos tu cantidad. La foto es temporal: vuelve a tomarla para continuar.'
          : '',
      });
    } catch (error) {
      this.publish({
        phase: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'No pudimos recuperar el intento. Tus registros se conservan.',
      });
    }
  }
  async activateCamera() {
    if (
      !['ready', 'error', 'rejected', 'review'].includes(this.view.phase) ||
      !this.view.attempt ||
      this.view.attempt.command
    )
      return;
    if (this.expired()) {
      this.publish({ phase: 'expired' });
      return;
    }
    const generation = ++this.generation;
    this.openingCamera = true;
    this.release();
    this.publish({ phase: 'loading', message: '' });
    try {
      const session = await this.options.camera.open();
      if (this.disposed || generation !== this.generation) {
        session.stop();
        return;
      }
      this.publish({ session, phase: 'camera' });
    } catch (error) {
      if (!this.disposed && generation === this.generation)
        this.publish({ phase: 'error', message: (error as Error).message });
    } finally {
      if (generation === this.generation) this.openingCamera = false;
    }
  }
  async capture(video?: HTMLVideoElement | null) {
    const { session, attempt } = this.view;
    if (this.view.phase !== 'camera' || !session || !attempt) return;
    if (this.expired()) {
      this.release();
      this.publish({ phase: 'expired' });
      return;
    }
    const generation = this.generation;
    const next = { ...attempt, captureId: this.options.id(), awaitingCapture: true };
    this.publish({ phase: 'capturing', attempt: next });
    try {
      await this.persist(next);
      const photo = await session.capture(next.captureId, video);
      session.stop();
      if (this.disposed || generation !== this.generation) {
        await photo.dispose();
        return;
      }
      await this.acceptPhoto(photo);
    } catch (error) {
      session.stop();
      if (!this.disposed && generation === this.generation)
        this.publish({ session: null, phase: 'error', message: (error as Error).message });
    }
  }
  async acceptPhoto(photo: CapturedWaterPhoto) {
    const attempt = this.view.attempt;
    if (
      !attempt ||
      attempt.command ||
      photo.id !== attempt.captureId ||
      !attempt.awaitingCapture ||
      this.disposed
    ) {
      await photo.dispose();
      return;
    }
    const next = { ...attempt, awaitingCapture: false };
    this.release();
    this.publish({ photo, session: null, phase: 'analyzing', attempt: next });
    try {
      await this.persist(next);
    } catch {
      await photo.dispose();
      this.publish({
        photo: null,
        phase: 'error',
        message: 'No pudimos conservar el intento. Reintenta la foto; tus registros no cambiaron.',
      });
      return;
    }
    let analysis: WaterAnalysis;
    try {
      analysis = await this.options.analyzer.analyze(photo);
    } catch {
      analysis = {
        status: 'uncertain',
        message:
          'El análisis no está disponible. Revisa personalmente tu foto y confirma la cantidad.',
      };
    }
    if (this.disposed || this.view.photo !== photo) return;
    if (this.expired()) {
      this.release();
      this.publish({ phase: 'expired' });
      return;
    }
    this.publish({
      analysis,
      phase: analysis.status === 'rejected' ? 'rejected' : 'review',
      message: analysis.message,
    });
  }
  changeAmount(amount: string) {
    if (this.view.phase !== 'review' || !this.view.attempt || this.view.attempt.command) return;
    const attempt = { ...this.view.attempt, amount: amount.slice(0, 12) };
    this.publish({ attempt, message: this.view.analysis?.message ?? '' });
    void this.persist(attempt).catch(() => {
      this.publish({
        message:
          'No pudimos conservar el cambio. Mantén esta pantalla abierta y vuelve a confirmar.',
      });
    });
  }
  async confirm() {
    const { attempt, photo, analysis } = this.view;
    if (
      this.view.phase !== 'review' ||
      !attempt ||
      !photo ||
      !analysis ||
      analysis.status === 'rejected'
    )
      return;
    if (this.expired()) {
      this.release();
      this.publish({ phase: 'expired' });
      return;
    }
    const amount = Number(attempt.amount);
    if (
      !/^\d+$/.test(attempt.amount) ||
      !Number.isSafeInteger(amount) ||
      amount < 1 ||
      amount > 10000
    ) {
      this.publish({ message: 'Escribe una cantidad entera entre 1 y 10,000 mL.' });
      return;
    }
    const command: WaterRecordCommand = {
      id: attempt.id,
      eventId: attempt.eventId,
      type: 'record',
      kind: 'water',
      amount,
      dayStart: attempt.dayStart,
      createdAt: this.options.now(),
      verification: {
        version: 1,
        captureId: photo.id,
        capturedAt: photo.capturedAt,
        source: photo.source,
        assessment: analysis.status,
        ...(analysis.status === 'approved' ? { analyzer: analysis.analyzer } : {}),
      },
    };
    this.publish({ phase: 'saving' });
    try {
      const frozen = { ...attempt, amount: String(amount), command };
      await this.persist(frozen);
      this.publish({ attempt: frozen });
    } catch {
      this.publish({
        phase: 'review',
        message:
          'No pudimos preparar el guardado. Tu foto y tu cantidad siguen aquí; vuelve a confirmar.',
      });
      return;
    }
    await this.save(command);
  }
  private async save(command: WaterRecordCommand) {
    this.publish({ phase: 'saving' });
    const result = await this.options.commit(command);
    if (result.status === 'confirmed') {
      this.release();
      try {
        await this.options.store.clear(command.id);
      } catch {
        /* Persisted command is safe to replay after a lost cleanup. */
      }
      this.publish({ phase: 'saved', result, message: 'Agua registrada.' });
    } else if (result.reason === 'expired') {
      this.release();
      this.publish({ phase: 'expired', result, message: result.message });
    } else {
      this.publish({ phase: 'error', result, message: result.message });
    }
  }
  pause() {
    const inline = !!this.view.session?.stream || this.view.session?.source === 'web';
    if (this.openingCamera || (inline && ['camera', 'capturing'].includes(this.view.phase))) {
      this.openingCamera = false;
      this.generation++;
      this.release();
      this.publish({
        phase: 'ready',
        message: 'La cámara se pausó al salir de la app. Actívala de nuevo para continuar.',
      });
    }
  }
  private release() {
    this.view.session?.stop();
    if (this.view.photo) void this.view.photo.dispose();
    this.publish({ session: null, photo: null });
  }
  async discard() {
    if (this.view.phase === 'saving') return false;
    try {
      await this.writes;
      if (this.view.attempt) await this.options.store.clear(this.view.attempt.id);
      else await this.options.store.reset();
    } catch {
      this.publish({
        message: 'No pudimos cerrar el intento. Reintenta; tus registros guardados se conservan.',
      });
      return false;
    }
    this.dispose();
    await this.options.camera.cleanup?.();
    return true;
  }
  dispose() {
    this.disposed = true;
    this.generation++;
    this.release();
  }
}
