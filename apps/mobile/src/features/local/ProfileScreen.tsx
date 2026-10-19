import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Icon,
  Input,
  PlantCharacter,
  ProfileStat,
  SettingsLink,
  Stepper,
  TimeRow,
  ToneSelector,
} from '../../shared/components';
import type { OnboardingDraft } from '../onboarding/model';
import { setReapplications } from '../onboarding/model';
import { useLocal } from './LocalProvider';
import { completedCycles, currentDay, speciesAt, streaks } from './model';
import { date, number } from './format';
import { Modal } from './Modal';

type Editor = 'name' | 'goals' | 'schedule' | 'tone' | 'privacy' | null;
export function ProfileScreen() {
  const local = useLocal();
  const state = local.state!;
  const navigate = useNavigate();
  const [editor, setEditor] = useState<Editor>(null);
  const [draft, setDraft] = useState<OnboardingDraft>(state.preferences);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const species = speciesAt(state, Math.floor(currentDay(state, local.now) / 7));
  const cycles = completedCycles(state, local.now);
  const open = (section: Editor) => {
    setDraft(structuredClone(state.preferences));
    setError('');
    setEditor(section);
  };
  const titles = {
    name: 'Editar perfil',
    goals: 'Metas de hábitos',
    schedule: 'Horarios de hábitos',
    tone: 'Tono de mi planta',
    privacy: 'Tus datos en este dispositivo',
  };
  return (
    <div className="local-profile local-screen">
      <header>
        <h1 className="hf-type-heading-xl">Perfil</h1>
        <p className="hf-muted">Tu constancia y tus preferencias</p>
      </header>
      <section className="local-identity">
        <div>
          <h2 className="hf-type-heading-xl">{state.preferences.preferredName}</h2>
          <p className="hf-type-caption">
            Desde {date(state.startedAt, state, { month: 'long', year: 'numeric' })}
          </p>
          <p className="hf-type-caption hf-muted">Tu planta actual</p>
          <p className="hf-type-label-md">
            {species === 'sprout' ? 'Brote mordaz' : 'Cactus dramático'}
          </p>
        </div>
        <div className="local-identity__plant">
          <PlantCharacter species={species} decorative />
        </div>
      </section>
      <div className="local-profile-stats">
        <ProfileStat value={`${streaks(state, local.now).best} días`} label="Mayor racha" />
        <ProfileStat value={String(cycles.filter((c) => c.survived).length)} label="En tu jardín" />
        <ProfileStat value={String(cycles.filter((c) => !c.survived).length)} label="Marchitas" />
      </div>
      <h2 className="hf-type-heading-md">Configuración</h2>
      <section className="local-setting-group">
        <h3 className="hf-type-label-md">Mis metas</h3>
        <SettingsLink
          label="Metas de hábitos"
          detail={`Agua: ${number(Number(state.preferences.waterGoalMl))} mL · Protector: 1 + ${state.preferences.sunscreenReapplications}`}
          icon={<Icon name="drop" />}
          onClick={() => open('goals')}
        />
        <p className="hf-type-caption hf-muted">
          Los cambios se aplican al comenzar el siguiente día de planta.
        </p>
      </section>
      <section className="local-setting-group">
        <h3 className="hf-type-label-md">Recordatorios</h3>
        <SettingsLink
          label="Horarios de hábitos"
          detail={`${state.preferences.waterTimes.length} de agua · ${state.preferences.sunscreenTimes.length} de protector`}
          icon={<Icon name="bell" />}
          onClick={() => open('schedule')}
        />
        <p className="hf-type-caption hf-muted">
          Los horarios se guardan como referencia. Esta prueba todavía no envía notificaciones del
          teléfono.
        </p>
      </section>
      <section className="local-setting-group">
        <h3 className="hf-type-label-md">Personalidad de mi planta</h3>
        <SettingsLink
          label="Tono de la planta"
          detail={`${{ gentle: 'Suave', medium: 'Medio', intense: 'Intenso' }[state.preferences.tone]} · Ajustar los mensajes locales`}
          icon={<Icon name="leaf" />}
          onClick={() => open('tone')}
        />
      </section>
      <section className="local-setting-group">
        <h3 className="hf-type-label-md">Perfil y privacidad</h3>
        <div className="local-settings-list">
          <SettingsLink
            label="Editar perfil"
            detail="Cambiar tu nombre preferido"
            icon={<Icon name="user" />}
            onClick={() => open('name')}
          />
          <SettingsLink
            label="Privacidad y uso de datos"
            detail="Tus registros se guardan en este dispositivo"
            icon={<Icon name="shield" />}
            onClick={() => open('privacy')}
          />
        </div>
      </section>
      <section className="local-setting-group">
        <h3 className="hf-type-label-md">Versión de prueba</h3>
        <div className="local-settings-list">
          <SettingsLink
            label="Volver al onboarding"
            detail="Revisar la introducción y tu configuración"
            icon={<Icon name="back" />}
            onClick={() => navigate('/onboarding/bienvenida')}
          />
          <SettingsLink
            label="Ver mis registros"
            detail={`${state.events.length} registros locales · Sin servidor`}
            icon={<Icon name="check" />}
            onClick={() => navigate('/analisis')}
          />
        </div>
      </section>
      <p className="hf-type-caption hf-muted">
        HoneyFlower · Prueba local 0.2.0. No necesitas crear una cuenta.
      </p>
      <p role="status" className="local-feedback">
        {message}
      </p>
      {editor && (
        <Modal title={titles[editor]} onClose={() => setEditor(null)}>
          {editor === 'privacy' ? (
            <div className="hf-stack">
              <p>
                Tu nombre, metas, horarios y {state.events.length} registros se conservan en el
                almacenamiento de esta app. No se envían a un servidor.
              </p>
              <p>
                No se capturan fotos, se usa IA ni se crea una cuenta en esta versión. Desinstalar o
                borrar los datos de la app elimina esta copia local.
              </p>
              <Button onClick={() => setEditor(null)}>Entendido</Button>
            </div>
          ) : (
            <form
              className="hf-stack"
              onSubmit={(event) => {
                event.preventDefault();
                try {
                  local.update(draft);
                  setEditor(null);
                  setMessage(
                    editor === 'goals'
                      ? 'Metas guardadas para el siguiente día de planta.'
                      : 'Cambios guardados en este dispositivo.',
                  );
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              {editor === 'name' && (
                <Input
                  label="Tu nombre preferido"
                  maxLength={60}
                  required
                  value={draft.preferredName}
                  onChange={(e) => setDraft({ ...draft, preferredName: e.target.value })}
                />
              )}
              {editor === 'goals' && (
                <>
                  <Input
                    label="Meta diaria de agua en mL"
                    type="number"
                    min={250}
                    max={10000}
                    step={1}
                    required
                    value={draft.waterGoalMl}
                    leadingIcon={<Icon name="drop" inheritColor />}
                    onChange={(e) => setDraft({ ...draft, waterGoalMl: e.target.value })}
                  />
                  <Stepper
                    label="Reaplicaciones de protector"
                    value={draft.sunscreenReapplications}
                    min={0}
                    max={12}
                    unit="más una aplicación inicial"
                    onChange={(value) => setDraft(setReapplications(draft, Number(value)))}
                  />
                  <p className="hf-type-caption hf-muted">
                    La meta del día en curso y los días cerrados no cambian.
                  </p>
                </>
              )}
              {editor === 'schedule' && (
                <>
                  <h3 className="hf-type-label-md">Agua</h3>
                  {draft.waterTimes.map((value, i) => (
                    <TimeRow
                      key={`water-${i}`}
                      label={`Recordatorio ${i + 1}`}
                      accessibleLabel={`Horario de agua ${i + 1}`}
                      value={value}
                      onChange={(next) =>
                        setDraft({
                          ...draft,
                          waterTimes: draft.waterTimes.map((time, index) =>
                            index === i ? next : time,
                          ),
                        })
                      }
                    />
                  ))}
                  <h3 className="hf-type-label-md">Protector solar</h3>
                  {draft.sunscreenTimes.map((value, i) => (
                    <TimeRow
                      key={`sun-${i}`}
                      label={i ? `Reaplicación ${i}` : 'Aplicación inicial'}
                      accessibleLabel={`Horario de protector ${i + 1}`}
                      value={value}
                      onChange={(next) =>
                        setDraft({
                          ...draft,
                          sunscreenTimes: draft.sunscreenTimes.map((time, index) =>
                            index === i ? next : time,
                          ),
                        })
                      }
                    />
                  ))}
                </>
              )}
              {editor === 'tone' && (
                <>
                  <ToneSelector
                    value={draft.tone}
                    onChange={(tone) => setDraft({ ...draft, tone })}
                  />
                  <p className="hf-muted">
                    {draft.tone === 'gentle'
                      ? '«Un pequeño cuidado a la vez. Aquí te acompaño.»'
                      : draft.tone === 'medium'
                        ? '«Tu vaso y yo seguimos esperando nuestra aparición del día.»'
                        : '«Tu vaso no se llena con buenas intenciones. Hagamos nuestra parte.»'}
                  </p>
                </>
              )}
              {error && (
                <p role="alert" className="hf-error">
                  {error}
                </p>
              )}
              <Button type="submit">Guardar cambios</Button>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
