export interface DetectionApprovalStampProps {
  background?: 'photo' | 'surface';
  label?: string;
  status?: string;
}
export function DetectionApprovalStamp({
  background = 'photo',
  label = 'FOTO',
  status = 'APROBADA',
}: DetectionApprovalStampProps) {
  return (
    <div className={`hf-detection-stamp hf-detection-stamp--${background}`}>
      <p className="hf-type-label-sm">{label}</p>
      <p className="hf-type-data-md">{status}</p>
    </div>
  );
}
