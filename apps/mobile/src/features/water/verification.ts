export interface WaterVerification {
  version: 1;
  captureId: string;
  capturedAt: number;
  source: 'web' | 'android';
  assessment: 'uncertain' | 'approved';
  analyzer?: string;
}
const shortText = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 128;
/** Metadata only: photo bytes and file URIs never enter the persisted profile. */
export function validWaterVerification(
  value: unknown,
  recordedAt: number,
): value is WaterVerification {
  if (!value || typeof value !== 'object') return false;
  const v = value as WaterVerification;
  return (
    Object.keys(v).every((key) =>
      ['version', 'captureId', 'capturedAt', 'source', 'assessment', 'analyzer'].includes(key),
    ) &&
    v.version === 1 &&
    shortText(v.captureId) &&
    Number.isFinite(v.capturedAt) &&
    v.capturedAt >= 0 &&
    v.capturedAt <= recordedAt &&
    ['web', 'android'].includes(v.source) &&
    ['uncertain', 'approved'].includes(v.assessment) &&
    (v.analyzer === undefined || shortText(v.analyzer)) &&
    (v.assessment !== 'approved' || shortText(v.analyzer))
  );
}
