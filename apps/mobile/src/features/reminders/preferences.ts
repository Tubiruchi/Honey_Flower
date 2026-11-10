import { isTime, validateOnboardingStep } from '../onboarding/model.ts';
import type { OnboardingDraft, QuietPeriod } from '../onboarding/model.ts';

export const minuteOfDay = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
export function inQuietTime(time: string, periods: readonly QuietPeriod[]) {
  const minute = minuteOfDay(time);
  return periods.some(({ from, to }) => {
    const start = minuteOfDay(from),
      end = minuteOfDay(to);
    return start < end ? minute >= start && minute < end : minute >= start || minute < end;
  });
}
export function foregroundFlashAllowed(
  draft: OnboardingDraft,
  level: string,
  visible: boolean,
  reducedMotion: boolean,
) {
  return (
    draft.notifications &&
    draft.foregroundFlash &&
    level === 'reinforced' &&
    visible &&
    !reducedMotion
  );
}
/** Additional form/command validation; older saved profiles remain readable without data loss. */
export function validateReminderPreferences(draft: OnboardingDraft) {
  const error =
    validateOnboardingStep('horarios', draft) ?? validateOnboardingStep('avisos', draft);
  if (error) return error;
  if (
    draft.notifications &&
    [...draft.waterTimes, ...draft.sunscreenTimes]
      .filter(isTime)
      .every((time) => inQuietTime(time, draft.quietPeriods))
  )
    return 'Todas tus citas quedan en horas de calma. Ajusta la franja o los horarios antes de guardar.';
  return null;
}
