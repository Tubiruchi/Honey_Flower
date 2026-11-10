import type { ReactNode } from 'react';
import { DetectionApprovalPlant } from './DetectionApprovalPlant';
import { phase2Assets } from '../../assets/figma/components/phase2';
export interface DetectionPlantMessageProps {
  message?: string;
  illustration?: ReactNode;
}
export function DetectionPlantMessage({
  message = 'Bueno, bueno… evidencia aceptada. Procura que esto se vuelva costumbre.',
  illustration,
}: DetectionPlantMessageProps) {
  return (
    <div className="hf-detection-message">
      {illustration ?? <DetectionApprovalPlant />}
      <div className="hf-plant-bubble">
        <p className="hf-type-label-md">{message}</p>
        <img className="hf-plant-bubble__tail" src={phase2Assets.messageTail} alt="" />
      </div>
    </div>
  );
}
