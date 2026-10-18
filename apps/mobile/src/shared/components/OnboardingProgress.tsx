export function OnboardingProgress({ step, total = 6 }: { step: number; total?: number }) {
  return (
    <div
      className="hf-onboarding-progress"
      role="progressbar"
      aria-label="Personalización"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={step}
      aria-valuetext={`Paso ${step} de ${total}`}
    >
      {Array.from({ length: total }, (_, index) => (
        <span key={index} className={index < step ? 'is-complete' : undefined} />
      ))}
    </div>
  );
}
