import { useId, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Button,
  Feedback,
  Icon,
  InfoCard,
  Input,
  PlantPrompt,
  SettingRow,
  SettingsLink,
  TimeRow,
} from '../../shared/components';
import { phase2Assets } from '../../assets/figma/components/phase2';
import { useLocal } from '../local/LocalProvider';
import { useReminders } from '../reminders/ReminderProvider';
import { validateReminderPreferences } from '../reminders/preferences';
import { confirmed } from '../../shared/data/localSnapshot';
import type { OnboardingDraft } from '../onboarding/model';
import { TopNotice } from '../../shared/components/TopNotice';
import { SettingsPage } from './SettingsPage';

const base = '/perfil/notificaciones';
const titles = {
  main: ['Notificaciones', 'Tú eliges cuándo y cómo recibir avisos'],
  calma: ['Horas de calma', 'Sin avisos durante esta franja'],
  limite: ['Máximo diario', 'Un límite para todos los avisos'],
  permiso: ['Activar recordatorios', 'El permiso siempre lo decides tú'],
} as const;
type Page = keyof typeof titles;
export function PreferencesScreen() {
  const local = useLocal();
  const notices = useReminders()!;
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const segment = pathname.slice(base.length + 1);
  const page: Page = segment in titles ? (segment as Page) : 'main';
  const [draft, setDraft] = useState<OnboardingDraft>(() =>
    structuredClone(local.state!.preferences),
  );
  const [revision, setRevision] = useState(local.preferencesRevision);
  const [maximum, setMaximum] = useState(String(draft.notificationCap));
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [noticeId, setNoticeId] = useState(0);
  const [consent, setConsent] = useState(false);
  const [managing, setManaging] = useState(false);
  const before = useRef<{ draft: OnboardingDraft; maximum: string } | null>(null);
  const formId = useId();
  const value = { ...draft, notificationCap: Number(maximum) };
  const validation = /^\d+$/.test(maximum)
    ? validateReminderPreferences(value)
    : 'Elige un máximo entero de 1 a 24 avisos al día.';
  const change = (next: OnboardingDraft) => {
    setDraft(next);
    setError('');
    setSaved(false);
  };
  const open = (next: Page) => {
    setManaging(false);
    before.current = { draft: structuredClone(draft), maximum };
    setError('');
    setSaved(false);
    void navigate(`${base}/${next}`);
  };
  const back = () => {
    if (local.busy) return;
    setError('');
    setConsent(false);
    setManaging(false);
    if (page !== 'main') {
      if (before.current) {
        setDraft(before.current.draft);
        setMaximum(before.current.maximum);
        before.current = null;
      } else {
        setDraft(structuredClone(local.state!.preferences));
        setMaximum(String(local.state!.preferences.notificationCap));
      }
      void navigate(base, { replace: true });
    } else
      void navigate('/perfil', {
        state: {
          focusSetting: 'profile-notifications',
        },
      });
  };
  async function save() {
    setSaved(false);
    setError('');
    setNoticeId((n) => n + 1);
    if (validation) {
      setError(validation);
      return;
    }
    try {
      confirmed(await local.update(value, revision));
      setRevision(revision + 1);
      setDraft(value);
      before.current = null;
      setSaved(true);
      setError('');
      if (page !== 'main') void navigate(base, { replace: true });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const actions: Record<Exclude<Page, 'permiso'>, string> = {
    main: 'Guardar preferencias',
    calma: 'Guardar horas de calma',
    limite: 'Guardar máximo',
  };
  return (
    <SettingsPage
      title={titles[page][0]}
      description={
        page === 'calma' && validation ? 'Revisa los horarios antes de guardar' : titles[page][1]
      }
      onBack={back}
      footer={
        page === 'permiso' ? (
          <Button
            loading={notices.busy}
            onClick={async () => {
              await notices.requestPermission();
              void navigate(base, { replace: true });
            }}
          >
            Continuar
          </Button>
        ) : (
          <Button
            type="submit"
            form={formId}
            loading={local.writing}
            disabled={local.busy || (page !== 'main' && !!validation)}
          >
            {actions[page]}
          </Button>
        )
      }
    >
      <>
        <TopNotice
          message={
            local.pending
              ? 'No se pudo confirmar el guardado.'
              : error ||
                (notices.issue
                  ? 'No se pudo confirmar la agenda.'
                  : saved
                    ? 'Preferencias guardadas'
                    : '')
          }
          variant={local.pending || error || notices.issue ? 'error' : 'success'}
          noticeId={noticeId}
          onDismiss={() => {
            setError('');
            setSaved(false);
          }}
        >
          {local.pending ? (
            <Button variant="text" disabled={local.writing} onClick={() => void local.retry()}>
              Reintentar ahora
            </Button>
          ) : !error && notices.issue ? (
            <Button variant="text" onClick={notices.retry}>
              Reintentar ahora
            </Button>
          ) : null}
        </TopNotice>
        <form
          id={formId}
          className="settings-form"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
          noValidate
        >
          <fieldset disabled={local.busy} className="settings-fields">
            {page === 'main' && (
              <>
                <SettingRow
                  label="Recibir recordatorios"
                  description="Se respetan tus horarios, calma y máximo diario."
                  checked={draft.notifications}
                  onChange={(notifications) => change({ ...draft, notifications })}
                />
                {draft.notifications ? (
                  <>
                    {notices.permission === 'unsupported' ? (
                      <Feedback variant="info" title="Avisos del teléfono disponibles en Android">
                        Con la app abierta verás mensajes de tu planta a la hora de tus citas. Los
                        avisos fuera de la app están disponibles en Android con permiso del sistema.
                      </Feedback>
                    ) : (
                      notices.permission !== 'granted' && (
                        <>
                          <Feedback
                            variant="warning"
                            title={
                              notices.permission === 'denied'
                                ? 'Sin permiso del sistema'
                                : 'Activa los avisos cuando quieras'
                            }
                          >
                            Puedes continuar sin avisos. Tus hábitos y registros se conservan.
                          </Feedback>
                          <Button variant="secondary" onClick={() => open('permiso')}>
                            Revisar permiso
                          </Button>
                        </>
                      )
                    )}
                    <SettingsLink
                      label="Horas de calma"
                      detail={
                        draft.quietPeriods.length
                          ? draft.quietPeriods.map(({ from, to }) => `${from}–${to}`).join(' · ')
                          : 'Sin franjas de calma'
                      }
                      icon={
                        <img src={phase2Assets.preferencesCalm} alt="" width={24} height={24} />
                      }
                      onClick={() => open('calma')}
                    />

                    {notices.exact.available &&
                      (notices.exact.granted ? (
                        <p className="hf-type-body-sm hf-secondary">
                          Avisos a la hora elegida activados en Android.
                        </p>
                      ) : (
                        <Feedback variant="warning" title="Permite avisos a la hora elegida">
                          Android necesita el permiso de alarmas y recordatorios. Sin él, los avisos
                          pueden llegar tarde.
                          <Button
                            variant="text"
                            onClick={() => void notices.requestExactDelivery()}
                          >
                            Permitir horarios exactos
                          </Button>
                        </Feedback>
                      ))}

                    <SettingsLink
                      label="Máximo diario"
                      detail={`Hasta ${maximum || '—'} avisos entre ambos hábitos`}
                      icon={
                        <img src={phase2Assets.preferencesLimit} alt="" width={24} height={24} />
                      }
                      onClick={() => open('limite')}
                    />
                    <SettingRow
                      label="Sonido reforzado"
                      description="Solo si lo activas y el sistema lo permite. No evita No molestar."
                      checked={draft.reinforcedSound}
                      onChange={(reinforcedSound) => change({ ...draft, reinforcedSound })}
                    />
                    <SettingRow
                      label="Señal breve de linterna"
                      description="Solo con la app visible, aceptación propia y dispositivo compatible."
                      checked={draft.foregroundFlash}
                      onChange={(enabled) => {
                        if (enabled) setConsent(true);
                        else change({ ...draft, foregroundFlash: false });
                      }}
                    />
                    {consent && (
                      <InfoCard title="Una señal breve, solo si tú aceptas">
                        <p>
                          La linterna puede encenderse durante 0.2 segundos con un aviso reforzado y
                          la app visible. Se apaga al salir de la app. Puedes dejarla desactivada.
                        </p>
                        <Button
                          loading={notices.busy}
                          onClick={async () => {
                            await notices.authorizeFlash();
                            change({ ...draft, foregroundFlash: true });
                            setConsent(false);
                          }}
                        >
                          Aceptar señal de linterna
                        </Button>
                        <Button variant="text" onClick={() => setConsent(false)}>
                          Ahora no
                        </Button>
                      </InfoCard>
                    )}
                    {draft.foregroundFlash &&
                      (!notices.flash.available || !notices.flash.granted) && (
                        <Feedback
                          variant="neutral"
                          title="Linterna sin activar en este dispositivo"
                        >
                          La preferencia se conserva. Hace falta una linterna compatible y acceso a
                          la cámara; el recordatorio visual sigue disponible.
                          {notices.flash.available && (
                            <Button
                              variant="text"
                              loading={notices.busy}
                              onClick={() => void notices.authorizeFlash()}
                            >
                              Revisar acceso a la linterna
                            </Button>
                          )}
                        </Feedback>
                      )}
                    <p className="hf-type-body-sm hf-secondary">
                      Los avisos pendientes se ajustan al guardar. La planta no cambia tus límites.
                      Se preparan hasta el cierre del ciclo actual; al volver a la app se revisa la
                      agenda. Android puede retrasar su entrega.
                    </p>
                  </>
                ) : (
                  <Feedback variant="neutral" title="Avisos apagados">
                    Al guardar se cancelan los avisos pendientes y se desactivan sus señales. Puedes
                    seguir registrando hábitos.
                  </Feedback>
                )}
              </>
            )}
            {page === 'calma' && (
              <>
                {draft.quietPeriods.map((period, i) => (
                  <div key={i} className="settings-fields">
                    {draft.quietPeriods.length > 1 && (
                      <h2 className="hf-type-data-md">Franja {i + 1}</h2>
                    )}
                    <TimeRow
                      label="Desde"
                      accessibleLabel={`Desde, franja ${i + 1}`}
                      error={validation?.includes('calma') ? validation : undefined}
                      value={period.from}
                      onChange={(from) =>
                        change({
                          ...draft,
                          quietPeriods: draft.quietPeriods.map((p, j) =>
                            j === i ? { ...p, from } : p,
                          ),
                        })
                      }
                    />
                    <TimeRow
                      label="Hasta"
                      accessibleLabel={`Hasta, franja ${i + 1}`}
                      error={validation?.includes('calma') ? validation : undefined}
                      value={period.to}
                      onChange={(to) =>
                        change({
                          ...draft,
                          quietPeriods: draft.quietPeriods.map((p, j) =>
                            j === i ? { ...p, to } : p,
                          ),
                        })
                      }
                    />
                    {managing && (
                      <Button
                        variant="text"
                        onClick={() =>
                          change({
                            ...draft,
                            quietPeriods: draft.quietPeriods.filter((_, j) => j !== i),
                          })
                        }
                      >
                        Quitar franja {i + 1}
                      </Button>
                    )}
                  </div>
                ))}
                <p className="hf-type-body-sm hf-secondary">
                  La franja puede terminar al día siguiente. Durante la calma no se emiten avisos ni
                  señales de linterna.
                </p>
                {validation && (
                  <Feedback variant="error" title="Revisa tus horas de calma">
                    {validation}
                  </Feedback>
                )}
                <Button
                  variant="text"
                  onClick={() =>
                    change({
                      ...draft,
                      quietPeriods: [
                        {
                          from: validation ? '22:00' : '07:00',
                          to: validation ? '07:00' : '22:00',
                        },
                      ],
                    })
                  }
                >
                  {validation ? 'Usar 22:00–07:00' : 'Usar 07:00–22:00'}
                </Button>
                {(managing || !draft.quietPeriods.length) && draft.quietPeriods.length < 4 && (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      change({
                        ...draft,
                        quietPeriods: [...draft.quietPeriods, { from: '', to: '' }],
                      })
                    }
                  >
                    Añadir franja de calma
                  </Button>
                )}
                {!!draft.quietPeriods.length && (
                  <Button variant="text" onClick={() => setManaging(!managing)}>
                    {managing ? 'Terminar de organizar franjas' : 'Organizar franjas de calma'}
                  </Button>
                )}
              </>
            )}
            {page === 'limite' && (
              <>
                <Input
                  label="Máximo diario"
                  leadingIcon={<Icon name="clock" inheritColor />}
                  inputMode="numeric"
                  value={maximum}
                  onChange={(e) => {
                    setMaximum(e.target.value);
                    setSaved(false);
                  }}
                  help="De 1 a 24 avisos por día de planta, entre agua y protector."
                />
                <InfoCard title="Un máximo, no una obligación">
                  <p>
                    La app puede enviar menos avisos si registraste tus hábitos, está activa la
                    calma o no hay permiso.
                  </p>
                </InfoCard>
                {validation && <Feedback variant="error">{validation}</Feedback>}
              </>
            )}
            {page === 'permiso' && (
              <>
                <PlantPrompt message="Puedo recordártelo. Pero tú decides si me escuchas." />
                <InfoCard title="Autoriza los avisos del sistema">
                  <p>
                    Al continuar, Android solicitará permiso cuando corresponda. Si ya lo denegaste,
                    puedes revisarlo en los ajustes del teléfono.
                  </p>
                </InfoCard>
                <p className="hf-type-body-sm hf-secondary">
                  Puedes seguir usando la app y registrar hábitos aunque no autorices los avisos. El
                  sonido reforzado y la linterna requieren su propia activación.
                </p>
                <Button variant="text" onClick={back}>
                  Ahora no
                </Button>
              </>
            )}
            {notices.issue && (
              <Feedback variant="warning" title="Agenda sin confirmar">
                {notices.issue}
                <Button variant="text" onClick={notices.retry}>
                  Reintentar agenda
                </Button>
              </Feedback>
            )}
            {page === 'main' && notices.permission === 'granted' && !notices.issue && (
              <p className="hf-type-caption hf-secondary">
                {local.state!.preferences.notifications
                  ? `${notices.pending} avisos pendientes en el teléfono. La entrega depende de Android y de sus ajustes.`
                  : 'No hay avisos programados por la app.'}
              </p>
            )}
          </fieldset>
        </form>
      </>
    </SettingsPage>
  );
}
