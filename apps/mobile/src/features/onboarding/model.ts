import type { AlertIntensity } from '@honeyflower/contracts';

export const onboardingSteps = [
  'bienvenida',
  'habitos',
  'nombre',
  'agua',
  'protector',
  'horarios',
  'avisos',
  'resumen',
] as const;
export type OnboardingStep = (typeof onboardingSteps)[number];
export interface QuietPeriod {
  from: string;
  to: string;
}
export interface OnboardingDraft {
  preferredName: string;
  /** Texto del formulario; se convierte a entero solo al validar el resumen. */
  waterGoalMl: string;
  sunscreenReapplications: number;
  waterTimes: string[];
  sunscreenTimes: string[];
  timeZone: string;
  notifications: boolean;
  notificationCap: number;
  quietPeriods: QuietPeriod[];
  tone: AlertIntensity;
  reinforcedSound: boolean;
  foregroundFlash: boolean;
}
export type OnboardingPreferences = Omit<OnboardingDraft, 'waterGoalMl'> & { waterGoalMl: number };
export interface OnboardingSnapshot {
  version: 1;
  step: OnboardingStep;
  draft: OnboardingDraft;
}
export const ONBOARDING_STORAGE_KEY = 'honeyflower.onboarding.v1';
export const onboardingLimits = {
  waterMin: 250,
  waterMax: 10000,
  reapplicationsMax: 12,
  notificationMax: 24,
  waterTimesMax: 12,
  quietPeriodsMax: 4,
} as const;

export function isOnboardingStep(value: unknown): value is OnboardingStep {
  return typeof value === 'string' && onboardingSteps.some((step) => step === value);
}

export function createOnboardingDraft(
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
): OnboardingDraft {
  return {
    preferredName: '',
    waterGoalMl: '2000',
    sunscreenReapplications: 2,
    waterTimes: ['08:00', '13:00', '18:00'],
    sunscreenTimes: ['07:00', '12:00', '15:00'],
    timeZone,
    notifications: true,
    notificationCap: 6,
    quietPeriods: [{ from: '22:00', to: '07:00' }],
    tone: 'medium',
    reinforcedSound: false,
    foregroundFlash: false,
  };
}

export const isTime = (value: unknown): value is string =>
  typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const integer = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;

function hasDraftShape(value: unknown): value is OnboardingDraft {
  if (!value || typeof value !== 'object') return false;
  const d = value as Partial<OnboardingDraft>;
  const timeList = (v: unknown, max: number) =>
    Array.isArray(v) && v.length <= max && v.every((time) => time === '' || isTime(time));
  return (
    typeof d.preferredName === 'string' &&
    d.preferredName.length <= 60 &&
    typeof d.waterGoalMl === 'string' &&
    d.waterGoalMl.length <= 16 &&
    integer(d.sunscreenReapplications, 0, onboardingLimits.reapplicationsMax) &&
    timeList(d.waterTimes, onboardingLimits.waterTimesMax) &&
    timeList(d.sunscreenTimes, 13) &&
    d.sunscreenTimes?.length === d.sunscreenReapplications + 1 &&
    typeof d.timeZone === 'string' &&
    d.timeZone.length > 0 &&
    d.timeZone.length < 100 &&
    typeof d.notifications === 'boolean' &&
    integer(d.notificationCap, 1, onboardingLimits.notificationMax) &&
    Array.isArray(d.quietPeriods) &&
    d.quietPeriods.length <= onboardingLimits.quietPeriodsMax &&
    d.quietPeriods.every(
      (p) =>
        p &&
        typeof p === 'object' &&
        (p.from === '' || isTime(p.from)) &&
        (p.to === '' || isTime(p.to)),
    ) &&
    ['gentle', 'medium', 'intense'].includes(d.tone ?? '') &&
    typeof d.reinforcedSound === 'boolean' &&
    typeof d.foregroundFlash === 'boolean'
  );
}

/** Solo conserva campos conocidos del borrador, nunca sesión, cuenta o eventos. */
export function readOnboardingSnapshot(
  storage: Pick<Storage, 'getItem'>,
): OnboardingSnapshot | null {
  const raw = storage.getItem(ONBOARDING_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const snapshot = parsed as Partial<OnboardingSnapshot>;
    if (
      snapshot.version !== 1 ||
      !isOnboardingStep(snapshot.step) ||
      !hasDraftShape(snapshot.draft)
    )
      return null;
    const d = snapshot.draft;
    return {
      version: 1,
      step: snapshot.step,
      draft: {
        preferredName: d.preferredName,
        waterGoalMl: d.waterGoalMl,
        sunscreenReapplications: d.sunscreenReapplications,
        waterTimes: [...d.waterTimes],
        sunscreenTimes: [...d.sunscreenTimes],
        timeZone: d.timeZone,
        notifications: d.notifications,
        notificationCap: d.notificationCap,
        quietPeriods: d.quietPeriods.map(({ from, to }) => ({ from, to })),
        tone: d.tone,
        reinforcedSound: d.reinforcedSound,
        foregroundFlash: d.foregroundFlash,
      },
    };
  } catch {
    return null;
  }
}

export function nextUnusedTime(times: readonly string[]): string {
  for (let hour = 8; hour < 32; hour++) {
    const value = `${String(hour % 24).padStart(2, '0')}:00`;
    if (!times.includes(value)) return value;
  }
  return '08:30';
}

export function setReapplications(draft: OnboardingDraft, count: number): OnboardingDraft {
  const sunscreenTimes = draft.sunscreenTimes.slice(0, count + 1);
  while (sunscreenTimes.length < count + 1) sunscreenTimes.push(nextUnusedTime(sunscreenTimes));
  return { ...draft, sunscreenReapplications: count, sunscreenTimes };
}

const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
function overlaps(periods: QuietPeriod[]): boolean {
  const intervals = periods
    .flatMap(({ from, to }) => {
      const start = minutes(from);
      const end = minutes(to);
      return start < end
        ? [[start, end]]
        : [
            [start, 1440],
            [0, end],
          ];
    })
    .sort((a, b) => a[0]! - b[0]!);
  return intervals.some((interval, index) => index > 0 && interval[0]! < intervals[index - 1]![1]!);
}

export function validateOnboardingStep(
  step: OnboardingStep,
  draft: OnboardingDraft,
): string | null {
  if (step === 'nombre' && (!draft.preferredName.trim() || draft.preferredName.trim().length > 60))
    return 'Escribe el nombre que quieres usar, de 1 a 60 caracteres.';
  if (
    step === 'agua' &&
    (!/^\d+$/.test(draft.waterGoalMl) ||
      !integer(Number(draft.waterGoalMl), onboardingLimits.waterMin, onboardingLimits.waterMax))
  )
    return 'Escribe una cantidad entera entre 250 y 10,000 mL. Es un límite de configuración, no una recomendación de consumo.';
  if (
    step === 'protector' &&
    !integer(draft.sunscreenReapplications, 0, onboardingLimits.reapplicationsMax)
  )
    return 'Elige entre 0 y 12 reaplicaciones.';
  if (step === 'horarios') {
    if (draft.sunscreenTimes.length !== draft.sunscreenReapplications + 1)
      return 'Configura un horario para cada aplicación de protector.';
    if (!draft.waterTimes.length)
      return 'Añade al menos un horario de agua para preparar tu agenda.';
    if ([...draft.waterTimes, ...draft.sunscreenTimes].some((time) => !isTime(time)))
      return 'Completa todos los horarios con una hora válida.';
    if (
      [draft.waterTimes, draft.sunscreenTimes].some((times) => new Set(times).size !== times.length)
    )
      return 'Los horarios de un mismo hábito deben ser diferentes.';
  }
  if (step === 'avisos') {
    if (!integer(draft.notificationCap, 1, onboardingLimits.notificationMax))
      return 'Elige un máximo de 1 a 24 avisos al día.';
    if (draft.quietPeriods.some(({ from, to }) => !isTime(from) || !isTime(to) || from === to))
      return 'Completa las horas de calma y usa una hora de inicio y fin diferentes. El periodo puede cruzar la medianoche.';
    if (overlaps(draft.quietPeriods))
      return 'Los periodos de calma se superponen. Ajusta sus horarios para continuar.';
  }
  return null;
}

export function firstInvalidStep(draft: OnboardingDraft): OnboardingStep | null {
  return onboardingSteps.find((step) => Boolean(validateOnboardingStep(step, draft))) ?? null;
}

export function toOnboardingPreferences(draft: OnboardingDraft): OnboardingPreferences {
  if (firstInvalidStep(draft)) throw new Error('El borrador todavía contiene campos inválidos.');
  return {
    ...draft,
    preferredName: draft.preferredName.trim(),
    waterGoalMl: Number(draft.waterGoalMl),
    // Apagar avisos domina todos los opt-ins, aunque el borrador conserve su selección para editar.
    reinforcedSound: draft.notifications && draft.reinforcedSound,
    foregroundFlash: draft.notifications && draft.foregroundFlash,
  };
}
