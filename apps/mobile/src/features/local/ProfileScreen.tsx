import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import { completedCycles, currentDay, cycleStats, speciesAt, streaks } from './model';
import { date, number } from './format';
import { Modal } from './Modal';
import { confirmed } from '../../shared/data/localSnapshot';
import { useOpenRecords } from '../records/navigation';
import { useReminders } from '../reminders/ReminderProvider';
import '../preferences/profile.css';
import { CAMERA_PREVIEW_PATH, TEMPORARY_CAMERA_PREVIEW_ENABLED } from '../water/temporaryPreview';

type Editor = 'name' | 'goals' | 'schedule' | 'tone' | 'privacy' | null;
export function ProfileScreen() {
  const local = useLocal();
  const state = local.state!;
  const navigate = useNavigate();
  const location = useLocation();
  const openRecords = useOpenRecords();
  const notices = useReminders();
  const [editor, setEditor] = useState<Editor>(null);
  const [draft, setDraft] = useState<OnboardingDraft>(state.preferences);
  const [draftRevision, setDraftRevision] = useState(local.preferencesRevision);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const species = speciesAt(state, Math.floor(currentDay(state, local.now) / 7));
  const cycles = completedCycles(state, local.now);
  const open = useCallback(
    (section: Editor) => {
      setDraft(structuredClone(state.preferences));
      setDraftRevision(local.preferencesRevision);
      setError('');
      setEditor(section);
    },
    [state.preferences, local.preferencesRevision],
  );
  useEffect(() => {
    if (location.pathname !== '/perfil' || location.state?.openEditor !== 'schedule') return;
    // The navigation request is consumed once; cancelling or saving must not reopen the dialog.
    const timer = window.setTimeout(() => {
      open('schedule');
      void navigate('/perfil', { replace: true, state: { ...location.state, openEditor: null } });
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [location, navigate, open]);
  const titles = {
    name: 'Editar perfil',
    goals: 'Metas de hábitos',
    schedule: 'Horarios de hábitos',
    tone: 'Tono de mi planta',
    privacy: 'Tus datos en este dispositivo',
  };
  return (
    <div className="local-screen profile-screen">
      <header className="profile-header">
        <h1 className="hf-type-heading-md">Perfil</h1>
        <p className="hf-type-caption hf-secondary">Tu constancia y tus preferencias</p>
      </header>
      <section className="profile-identity" aria-label="Tu perfil">
        <div>
          <h2 className="hf-type-heading-xl">{state.preferences.preferredName}</h2>
          <p className="hf-type-body-sm hf-secondary">
            Desde {date(state.startedAt, state, { day: undefined, month: 'long', year: 'numeric' })}
          </p>
          <span className="hf-sr-only">
            Tu planta actual: {species === 'sprout' ? 'Brote mordaz' : 'Cactus dramático'}
          </span>
        </div>
        <div className="profile-plant">
          <PlantCharacter
            species={species}
            health={
              cycleStats(state, Math.floor(currentDay(state, local.now) / 7), local.now).health
            }
          />
        </div>
      </section>
      <div className="local-profile-stats" role="group" aria-label="Estadísticas de Perfil">
        <ProfileStat value={`${streaks(state, local.now).best} días`} label="Mayor racha" />
        <ProfileStat value={String(cycles.filter((c) => c.survived).length)} label="En tu jardín" />
        <ProfileStat value={String(cycles.filter((c) => !c.survived).length)} label="Marchitas" />
      </div>
      <SettingsLink
        id="profile-notifications"
        label="Notificaciones y horarios"
        detail="Avisos, calma, frecuencia y permisos"
        icon={<Icon name="bell" />}
        onClick={() => navigate('/perfil/notificaciones')}
      />
      <SettingsLink
        id="profile-records"
        label="Ver mis registros"
        detail="Consultar y corregir agua y protector"
        icon={<Icon name="drop" />}
        onClick={() => openRecords()}
      />
      <SettingsLink
        id="profile-privacy"
        label="Privacidad y uso de datos"
        detail="Conoce qué información utiliza la app"
        icon={<Icon name="lock" />}
        onClick={() => navigate('/privacidad', { state: { from: '/perfil' } })}
      />
      <SettingsLink
        id="profile-sources"
        label="Consultar fuentes"
        detail="Referencias de los hábitos y reglas del juego"
        icon={<Icon name="leaf" />}
        onClick={() => navigate('/fuentes', { state: { from: '/perfil' } })}
      />
      <p className="hf-type-body-sm hf-secondary">
        Las preferencias de avisos acompañan a tu rutina. Siempre puedes apagar los recordatorios.
      </p>
      <section className="local-setting-group profile-more" aria-label="Más opciones de Perfil">
        <h2 className="hf-type-heading-md">Más opciones</h2>
        {/* TEMPORARY: remove with the accepted integrations; see docs/conexiones-futuras.md. */}
        {TEMPORARY_CAMERA_PREVIEW_ENABLED && (
          <SettingsLink
            id="profile-camera-preview"
            label="Probar cámara · temporal"
            detail="Revisar encuadre y foto sin guardar registros"
            icon={<Icon name="eye" />}
            onClick={() => navigate(CAMERA_PREVIEW_PATH)}
          />
        )}
        <SettingsLink
          label="Editar perfil"
          detail="Cambiar tu nombre preferido"
          icon={<Icon name="user" />}
          onClick={() => open('name')}
        />
        <SettingsLink
          label="Metas de hábitos"
          detail={`Agua: ${number(Number(state.preferences.waterGoalMl))} mL · Protector: 1 + ${state.preferences.sunscreenReapplications}`}
          icon={<Icon name="drop" />}
          onClick={() => open('goals')}
        />
        <SettingsLink
          label="Horarios de hábitos"
          detail={`${state.preferences.waterTimes.length} de agua · ${state.preferences.sunscreenTimes.length} de protector`}
          icon={<Icon name="clock" />}
          onClick={() => open('schedule')}
        />
        <SettingsLink
          label="Tono de la planta"
          detail={`${{ gentle: 'Suave', medium: 'Medio', intense: 'Intenso' }[state.preferences.tone]} · Ajustar los mensajes locales`}
          icon={<Icon name="leaf" />}
          onClick={() => open('tone')}
        />
        <p className="hf-type-caption hf-secondary">
          Las metas y citas nuevas se aplican al comenzar el siguiente día de planta. El nombre y el
          tono se actualizan al guardar.
        </p>
        <SettingsLink
          label="Volver al onboarding"
          detail="Revisar la introducción y tu configuración"
          icon={<Icon name="back" />}
          onClick={() => navigate('/onboarding/bienvenida')}
        />
      </section>
      {(!notices || notices.permission === 'unsupported') && (
        <p className="hf-type-caption hf-secondary">
          Los recordatorios del teléfono y la linterna se prueban en Android. Aquí se conservan tus
          preferencias y registros locales.
        </p>
      )}
      <p className="hf-type-caption hf-secondary">
        HoneyFlower · Prueba local en este dispositivo. No necesitas crear una cuenta.
      </p>
      <p role="status" className="local-feedback">
        {message}
      </p>
      {editor && (
        <Modal title={titles[editor]} onClose={() => setEditor(null)} busy={local.busy}>
          {editor === 'privacy' ? (
            <div className="hf-stack">
              <p>
                Tu nombre, metas, horarios y {state.events.length} registros se conservan en el
                almacenamiento de esta app. No se envían a un servidor.
              </p>
              <p>
                Las fotos de agua son temporales y no se conservan con los registros. No hay
                identificación automática ni cuenta en esta versión. Desinstalar o borrar los datos
                de la app elimina esta copia local.
              </p>
              <Button onClick={() => setEditor(null)}>Entendido</Button>
            </div>
          ) : (
            <form
              className="hf-stack"
              onSubmit={async (event) => {
                event.preventDefault();
                try {
                  confirmed(await local.update(draft, draftRevision));
                  setEditor(null);
                  setMessage(
                    editor === 'goals'
                      ? 'Metas guardadas para el siguiente día de planta.'
                      : editor === 'schedule'
                        ? 'Horarios guardados para el siguiente día de planta.'
                        : 'Cambios guardados en este dispositivo.',
                  );
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              <fieldset className="local-form-fields" disabled={local.busy}>
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
                    <p className="hf-type-caption">
                      Los horarios nuevos comienzan el siguiente día de planta. Los registros y las
                      ventanas de este día se conservan.
                    </p>
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
                <Button type="submit" loading={local.writing}>
                  Guardar cambios
                </Button>
              </fieldset>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
