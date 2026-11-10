import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { AppBar, Button, Feedback, OnboardingProgress } from '../../shared/components';
import { FigmaAsset, OnboardingContent } from './OnboardingContent';
import {
  createOnboardingDraft,
  firstInvalidStep,
  ONBOARDING_STORAGE_KEY,
  onboardingSteps,
  readOnboardingSnapshot,
  toOnboardingPreferences,
  validateOnboardingStep,
} from './model';
import type { OnboardingDraft, OnboardingPreferences, OnboardingStep } from './model';
import { onboardingScreens } from './screens';
import './onboarding.css';
import { validateReminderPreferences } from '../reminders/preferences';
import '../preferences/preferences.css';

type DraftStorage = Pick<Storage, 'getItem' | 'setItem'>;
export interface OnboardingFlowProps {
  initialStep?: OnboardingStep;
  initialDraft?: OnboardingDraft;
  step?: OnboardingStep;
  onStepChange?: (step: OnboardingStep) => void;
  onCreateAccount: (preferences: OnboardingPreferences) => void | Promise<void>;
  onSignIn: () => void | Promise<void>;
  persist?: boolean;
  storage?: DraftStorage;
  /** Solo en el catálogo para comparar el mockup; la app obtiene los insets reales. */
  referenceStatusBar?: boolean;
  completionLabel?: string;
  onOpenContent?: (kind: 'sources' | 'privacy', draft: OnboardingDraft) => void;
}

export function OnboardingFlow({
  initialStep,
  initialDraft,
  step: controlledStep,
  onStepChange,
  onCreateAccount,
  onSignIn,
  persist = false,
  storage,
  referenceStatusBar = false,
  completionLabel,
  onOpenContent,
}: OnboardingFlowProps) {
  const [initial] = useState(() => {
    try {
      const snapshot = persist ? readOnboardingSnapshot(storage ?? window.localStorage) : null;
      return {
        draft: initialDraft ?? snapshot?.draft ?? createOnboardingDraft(),
        step: initialStep ?? snapshot?.step ?? 'bienvenida',
        storageIssue: false,
      };
    } catch {
      return {
        draft: initialDraft ?? createOnboardingDraft(),
        step: initialStep ?? 'bienvenida',
        storageIssue: true,
      };
    }
  });
  const [draft, setDraft] = useState(initial.draft);
  const [internalStep, setInternalStep] = useState<OnboardingStep>(initial.step);
  const step = controlledStep ?? internalStep;
  const [returnToSummary, setReturnToSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storageIssue, setStorageIssue] = useState(initial.storageIssue);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const scrollRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const previousStep = useRef(step);
  const formId = useId();
  const screen = onboardingScreens[step];
  const progressStep = onboardingSteps.indexOf(step) - 1;

  useEffect(() => {
    if (previousStep.current !== step) {
      scrollRef.current?.scrollTo({ top: 0 });
      headingRef.current?.focus({ preventScroll: true });
      previousStep.current = step;
    }
  }, [step]);

  function save(nextDraft: OnboardingDraft, nextStep: OnboardingStep) {
    if (!persist) return;
    try {
      (storage ?? window.localStorage).setItem(
        ONBOARDING_STORAGE_KEY,
        JSON.stringify({ version: 1, step: nextStep, draft: nextDraft }),
      );
      setStorageIssue(false);
    } catch {
      setStorageIssue(true);
    }
  }

  function change(nextDraft: OnboardingDraft) {
    setDraft(nextDraft);
    setError(null);
    save(nextDraft, step);
  }

  function go(next: OnboardingStep) {
    setError(null);
    save(draft, next);
    if (onStepChange) onStepChange(next);
    else setInternalStep(next);
  }

  function showError(message: string) {
    setError(message);
    requestAnimationFrame(() => errorRef.current?.focus());
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    if (step === 'avisos' || step === 'resumen') {
      const issue = validateReminderPreferences(draft);
      if (issue) {
        if (step === 'resumen') go('avisos');
        showError(issue);
        return;
      }
    }
    const invalid =
      step === 'resumen'
        ? firstInvalidStep(draft)
        : validateOnboardingStep(step, draft)
          ? step
          : null;
    if (invalid) {
      if (invalid !== step) go(invalid);
      showError(validateOnboardingStep(invalid, draft)!);
      return;
    }
    if (step === 'resumen') {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setSubmitting(true);
      save(draft, step);
      try {
        await onCreateAccount(toOnboardingPreferences(draft));
      } catch {
        showError(
          'No pudimos guardar tu configuración. Conservamos el borrador para que vuelvas a intentarlo.',
        );
      } finally {
        setSubmitting(false);
        submittingRef.current = false;
      }
      return;
    }
    if (returnToSummary && step !== 'agua') {
      setReturnToSummary(false);
      go('resumen');
    } else {
      go(onboardingSteps[onboardingSteps.indexOf(step) + 1]!);
    }
  }

  return (
    <main
      className={`onb${referenceStatusBar ? ' onb--reference' : ''}`}
      data-onboarding-step={step}
      data-figma-node={screen.nodeId}
    >
      {referenceStatusBar && (
        <div className="onb-reference-status" aria-hidden="true">
          <span>12:00</span>
          <FigmaAsset src={screen.status} />
        </div>
      )}
      <form
        id={formId}
        className="onb-scroll"
        ref={scrollRef}
        onSubmit={submit}
        noValidate
        aria-label="Configuración inicial"
      >
        <fieldset disabled={submitting} className="onb-content-lock">
          <div className="onb-document">
            <header className="onb-header">
              {'back' in screen ? (
                <AppBar
                  title={progressStep > 0 ? `PASO ${progressStep} DE 6` : 'HONEYFLOWER'}
                  onBack={() => {
                    setReturnToSummary(false);
                    go(onboardingSteps[onboardingSteps.indexOf(step) - 1]!);
                  }}
                />
              ) : (
                <p className="hf-type-label-sm hf-muted">HONEYFLOWER</p>
              )}
              {progressStep > 0 && <OnboardingProgress step={progressStep} />}
              <div className="onb-hero">
                <h1 className="hf-type-heading-lg" ref={headingRef} tabIndex={-1}>
                  {screen.title}
                </h1>
                <FigmaAsset src={screen.plant} />
              </div>
              <p className="hf-type-body-sm onb-description">{screen.description}</p>
            </header>
            <div className="onb-panel">
              {storageIssue && (
                <Feedback variant="error">
                  <p>
                    No pudimos guardar el borrador en este dispositivo. Mantén esta vista abierta
                    para conservar tus cambios.
                  </p>
                </Feedback>
              )}
              {error && (
                <div ref={errorRef} tabIndex={-1} className="onb-error">
                  <Feedback variant="error">
                    <p>{error}</p>
                  </Feedback>
                </div>
              )}
              <OnboardingContent
                step={step}
                draft={draft}
                onChange={change}
                onEdit={(target) => {
                  setReturnToSummary(true);
                  go(target);
                }}
              />
              {onOpenContent && (step === 'habitos' || step === 'resumen') && (
                <nav className="onb-content-links" aria-label="Información de HoneyFlower">
                  <button
                    className="onb-content-link"
                    type="button"
                    onClick={() => onOpenContent('sources', draft)}
                  >
                    Consultar fuentes
                  </button>
                  <button
                    className="onb-content-link"
                    type="button"
                    onClick={() => onOpenContent('privacy', draft)}
                  >
                    Privacidad y uso de datos
                  </button>
                </nav>
              )}
            </div>
          </div>
        </fieldset>
      </form>
      <footer className="onb-actions">
        <div className="onb-action-slot">
          <Button type="submit" form={formId} loading={submitting}>
            {returnToSummary && step !== 'agua'
              ? 'Guardar cambios'
              : step === 'resumen' && completionLabel
                ? completionLabel
                : screen.action}
          </Button>
        </div>
        {step === 'bienvenida' && (
          <div className="onb-action-slot">
            <Button
              variant="text"
              disabled={submitting}
              onClick={async () => {
                if (submittingRef.current) return;
                submittingRef.current = true;
                setSubmitting(true);
                save(draft, step);
                try {
                  await onSignIn();
                } catch {
                  showError('No pudimos abrir la prueba local. Tu configuración se conserva.');
                } finally {
                  setSubmitting(false);
                  submittingRef.current = false;
                }
              }}
            >
              Ya tengo cuenta
            </Button>
          </div>
        )}
      </footer>
    </main>
  );
}
