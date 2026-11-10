import { useEffect, useRef, useState } from 'react';
import {
  Button,
  CameraFocus,
  CameraPhoto,
  CameraResult,
  CameraShutter,
  DetectionApprovalBadge,
  DetectionApprovalStamp,
  DetectionPlantMessage,
  DetectionResultActions,
  Feedback,
  PlantPrompt,
  RegistrationConfirmation,
} from '../shared/components';
export interface WaterCaptureDemoProps {
  permissionDenied?: boolean;
  inconclusive?: boolean;
  failOnce?: boolean;
  onSaveAttempt?: (command: { id: string; amount: number }) => void;
}
/** Static capture/result fixtures only. Permission, recognition and storage remain external adapters. */
export function WaterCaptureDemo({
  permissionDenied = false,
  inconclusive = false,
  failOnce = false,
  onSaveAttempt,
}: WaterCaptureDemoProps) {
  const [stage, setStage] = useState<'camera' | 'result' | 'confirm' | 'saved' | 'exit'>(
    permissionDenied ? 'result' : 'camera',
  );
  const [captured, setCaptured] = useState(false);
  const [value, setValue] = useState('250');
  const [status, setStatus] = useState<'normal' | 'saving' | 'save-error'>('normal');
  const command = useRef<{ id: string; amount: number } | null>(null);
  const serial = useRef(0);
  const failing = useRef(failOnce);
  const flight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const capture = () => {
    setCaptured(true);
    command.current = { id: `capture-${++serial.current}`, amount: 0 };
    setStage('result');
  };
  const retake = () => {
    if (flight.current) return;
    setCaptured(false);
    command.current = null;
    setStatus('normal');
    setStage('camera');
  };
  const save = () => {
    if (!captured || !command.current || flight.current) return;
    flight.current = true;
    setStatus('saving');
    onSaveAttempt?.({ ...command.current });
    timer.current = setTimeout(() => {
      flight.current = false;
      if (failing.current) {
        failing.current = false;
        setStatus('save-error');
      } else {
        setStatus('normal');
        setStage('saved');
      }
    }, 120);
  };
  return (
    <main className="hf-story-content">
      {stage === 'camera' && (
        <>
          <div className="hf-capture-preview">
            <CameraPhoto />
            <div className="hf-capture-preview__focus">
              <CameraFocus />
            </div>
            <div className="hf-capture-preview__prompt">
              <PlantPrompt />
            </div>
            <div className="hf-capture-preview__shutter">
              <CameraShutter onCapture={capture} />
            </div>
          </div>
          <Button variant="text" onClick={() => setStage('exit')}>
            Salir sin registrar
          </Button>
        </>
      )}
      {stage === 'result' && (!captured || inconclusive) && (
        <CameraResult
          outcome={!captured ? 'permission-denied' : 'uncertain'}
          requiresPhoto
          hasCapturedPhoto={captured}
          onRetry={() => {
            if (!permissionDenied) retake();
          }}
          onConfirm={() => setStage('confirm')}
          onManual={() => setStage('confirm')}
          onExit={() => setStage('exit')}
        />
      )}
      {stage === 'result' && captured && !inconclusive && (
        <>
          <div className="hf-capture-result">
            <CameraPhoto />
            <span className="hf-capture-result__stamp">
              <DetectionApprovalStamp />
            </span>
            <span className="hf-capture-result__badge">
              <DetectionApprovalBadge />
            </span>
          </div>
          <DetectionPlantMessage />
          <DetectionResultActions onReview={() => setStage('confirm')} onRetake={retake} />
        </>
      )}
      {stage === 'confirm' && captured && (
        <RegistrationConfirmation
          value={value}
          state={status}
          onChange={setValue}
          onRetake={retake}
          onConfirm={(n) => {
            if (command.current) command.current.amount = n;
            save();
          }}
          onRetrySave={save}
        />
      )}
      {stage === 'saved' && (
        <Feedback variant="success" title="Registro guardado">
          {value} mL añadidos. Confirmaste personalmente tu registro.
        </Feedback>
      )}
      {stage === 'exit' && (
        <Feedback variant="neutral" title="Saliste sin registrar">
          No se añadió ningún registro de agua.
        </Feedback>
      )}
    </main>
  );
}
