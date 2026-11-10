import { useState } from 'react';
import { Button, Feedback, TimeRow } from '../../shared/components';
import type { OnboardingDraft } from '../onboarding/model';
import { validateReminderPreferences } from '../reminders/preferences';
import './preferences.css';

export function HabitScheduleFields({
  draft,
  onChange: change,
}: {
  draft: OnboardingDraft;
  onChange: (draft: OnboardingDraft) => void;
}) {
  const [managing, setManaging] = useState(false);
  const validation = validateReminderPreferences(draft);
  return (
    <>
      <h2 className="hf-type-heading-md">Agua</h2>
      {draft.waterTimes.map((time, i) => (
        <div key={`water-${i}`} className="settings-time">
          <TimeRow
            label="Cita de agua"
            accessibleLabel={`Horario de agua ${i + 1}`}
            value={time}
            onChange={(next) =>
              change({
                ...draft,
                waterTimes: draft.waterTimes.map((old, j) => (i === j ? next : old)),
              })
            }
          />
          {managing && draft.waterTimes.length > 1 && (
            <Button
              variant="text"
              onClick={() =>
                change({ ...draft, waterTimes: draft.waterTimes.filter((_, j) => i !== j) })
              }
            >
              Quitar cita de agua {i + 1}
            </Button>
          )}
        </div>
      ))}
      {managing && draft.waterTimes.length < 12 && (
        <Button
          variant="secondary"
          onClick={() => change({ ...draft, waterTimes: [...draft.waterTimes, ''] })}
        >
          Añadir cita de agua
        </Button>
      )}
      <h2 className="hf-type-heading-md">Protector solar</h2>
      {draft.sunscreenTimes.map((time, i) => (
        <TimeRow
          key={`sun-${i}`}
          label={i ? `Reaplicación ${i}` : 'Aplicación inicial'}
          accessibleLabel={`Horario de protector ${i + 1}`}
          value={time}
          onChange={(next) =>
            change({
              ...draft,
              sunscreenTimes: draft.sunscreenTimes.map((old, j) => (i === j ? next : old)),
            })
          }
        />
      ))}
      <p className="hf-type-caption hf-secondary">
        Al guardar se actualizan las próximas citas de hoy. Los registros anteriores se conservan.
        Si cambias la cantidad de aplicaciones, la nueva meta y sus citas comienzan mañana.
      </p>
      <Button variant="text" onClick={() => setManaging(!managing)}>
        {managing ? 'Terminar de organizar citas' : 'Organizar citas de agua'}
      </Button>
      {validation && <Feedback variant="error">{validation}</Feedback>}
    </>
  );
}
