import { phase2Assets } from '../../assets/figma/components/phase2';
export interface DetectionApprovalBadgeProps {
  background?: 'photo' | 'surface';
}
export function DetectionApprovalBadge({ background = 'photo' }: DetectionApprovalBadgeProps) {
  return (
    <span className={`hf-detection-badge hf-detection-badge--${background}`} aria-hidden="true">
      <img src={phase2Assets.approvalCheck} alt="" />
    </span>
  );
}
