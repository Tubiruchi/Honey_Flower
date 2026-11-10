import type { ReactNode } from 'react';
import { phase2Assets } from '../../assets/figma/components/phase2';
import { PlantCharacter } from './PlantCharacter';
export interface CameraPhotoProps {
  state?: 'focused' | 'blurred';
  src?: string;
}
export function CameraPhoto({ state = 'focused', src = phase2Assets.photo }: CameraPhotoProps) {
  return (
    <div className={`hf-camera-photo hf-camera-photo--${state}`}>
      <img src={src} alt="" />
    </div>
  );
}
export interface PlantPromptProps {
  message?: string;
  face?: ReactNode;
}
export function PlantPrompt({
  message = 'Mi confianza se marchitó. Ahora tómale una foto a tu agua.',
  face,
}: PlantPromptProps) {
  return (
    <div className="hf-plant-prompt">
      {face ?? <PlantCharacter view="face" decorative />}
      <div className="hf-plant-bubble">
        <p className="hf-type-label-md">{message}</p>
        <img className="hf-plant-bubble__tail" src={phase2Assets.promptTail} alt="" />
      </div>
    </div>
  );
}
export function CameraFocus() {
  return (
    <img className="hf-camera-focus" src={phase2Assets.focus} width={224} height={430} alt="" />
  );
}
export interface CameraShutterProps {
  disabled?: boolean;
  onCapture: () => void;
}
export function CameraShutter({ disabled, onCapture }: CameraShutterProps) {
  return (
    <button className="hf-camera-shutter" type="button" disabled={disabled} onClick={onCapture}>
      <img src={phase2Assets.shutter} alt="" />
      <span className="hf-type-label-md">Tomar foto</span>
    </button>
  );
}
