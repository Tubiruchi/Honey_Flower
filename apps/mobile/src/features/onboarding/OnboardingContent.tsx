import type { ReactNode } from 'react';
import { onboardingAssets as assets } from '../../assets/figma/onboarding';
import {
  AlertLevel,
  Button,
  Feedback,
  InfoCard,
  Icon,
  IconButton,
  Input,
  SettingRow,
  Stepper,
  TimeRow,
} from '../../shared/components';
import { nextUnusedTime, onboardingLimits, setReapplications } from './model';
import type { OnboardingDraft, OnboardingStep } from './model';

export function FigmaAsset({ src }: { src: string }) {
  return <img className="hf-figma-asset" src={src} alt="" aria-hidden="true" data-figma-asset />;
}

const image = (src: string) => <FigmaAsset src={src} />;
const shield = <Icon name="shield" inheritColor />;
const tones = { gentle: 'suave', medium: 'medio', intense: 'intenso' };
const tonePreview = {
  gentle: '«Una pausa para ti y un poco de agua para seguir.»',
  medium: '«Tu vaso y yo seguimos esperando nuestra aparición del día.»',
  intense: '«Tu vaso no va a levantar la mano para recordártelo. Aquí estamos.»',
};

interface ContentProps {
  step: OnboardingStep;
  draft: OnboardingDraft;
  onChange: (draft: OnboardingDraft) => void;
  onEdit: (step: OnboardingStep) => void;
}

function SectionTitle({
  children,
  icon,
  variant,
}: {
  children: ReactNode;
  icon?: ReactNode;
  variant?: 'water' | 'sunscreen';
}) {
  return (
    <h2 className={`onb-section-title${variant ? ` onb-section-title--${variant}` : ''}`}>
      {icon}
      {children}
    </h2>
  );
}

function HabitSchedules({ draft, onChange }: Pick<ContentProps, 'draft' | 'onChange'>) {
  return (
    <>
      <SectionTitle icon={image(assets.schedule.imgHfIconDrop)} variant="water">
        Agua
      </SectionTitle>
      <div className="onb-schedule-list">
        {draft.waterTimes.map((time, index) => (
          <div className="onb-editable-time" key={index}>
            <TimeRow
              label="Recordatorio"
              accessibleLabel={`Horario de agua ${index + 1}`}
              value={time}
              clockIcon={image(assets.schedule.imgHfIconClock)}
              onChange={(value) =>
                onChange({
                  ...draft,
                  waterTimes: draft.waterTimes.map((current, i) => (i === index ? value : current)),
                })
              }
            />
            <IconButton
              label={`Quitar horario de agua ${index + 1}`}
              onClick={() =>
                onChange({ ...draft, waterTimes: draft.waterTimes.filter((_, i) => i !== index) })
              }
            >
              {image(assets.schedule.imgFrame)}
            </IconButton>
          </div>
        ))}
        <div className="onb-action-slot">
          <Button
            variant="secondary"
            disabled={draft.waterTimes.length >= onboardingLimits.waterTimesMax}
            onClick={() =>
              onChange({
                ...draft,
                waterTimes: [...draft.waterTimes, nextUnusedTime(draft.waterTimes)],
              })
            }
          >
            + Añadir horario
          </Button>
        </div>
        <p className="hf-type-caption hf-muted">Cada horario permite editar o quitar la cita.</p>
      </div>
      <SectionTitle icon={image(assets.schedule.imgHfIconSun)} variant="sunscreen">
        Protector solar
      </SectionTitle>
      <div className="onb-schedule-list">
        {draft.sunscreenTimes.map((time, index) => (
          <TimeRow
            key={index}
            label={index === 0 ? 'Aplicación inicial' : `Reaplicación ${index}`}
            accessibleLabel={`Horario de protector ${index + 1}`}
            value={time}
            clockIcon={image(assets.schedule.imgHfIconClock)}
            onChange={(value) =>
              onChange({
                ...draft,
                sunscreenTimes: draft.sunscreenTimes.map((current, i) =>
                  i === index ? value : current,
                ),
              })
            }
          />
        ))}
      </div>
      <InfoCard title="Zona horaria" icon={image(assets.schedule.imgHfIconClock)}>
        <p>{draft.timeZone} · tomada del dispositivo.</p>
      </InfoCard>
      <p className="hf-type-caption hf-muted">
        Los avisos no registran hábitos automáticamente. Puedes modificar estos horarios.
      </p>
    </>
  );
}

function ReminderPreferences({ draft, onChange }: Pick<ContentProps, 'draft' | 'onChange'>) {
  const updatePeriod = (index: number, key: 'from' | 'to', value: string) =>
    onChange({
      ...draft,
      quietPeriods: draft.quietPeriods.map((period, i) =>
        i === index ? { ...period, [key]: value } : period,
      ),
    });
  return (
    <>
      <SectionTitle icon={image(assets.preferences.imgHfIconBell)}>Recordatorios</SectionTitle>
      <SettingRow
        label="Recibir notificaciones"
        description="Puedes usar la app con los avisos apagados."
        checked={draft.notifications}
        onChange={(notifications) => onChange({ ...draft, notifications })}
      />
      <Stepper
        label="Máximo de avisos al día"
        value={draft.notificationCap}
        unit="avisos"
        min={1}
        max={onboardingLimits.notificationMax}
        disabled={!draft.notifications}
        onChange={(value) => onChange({ ...draft, notificationCap: Number(value) })}
        minusIcon={image(assets.preferences.imgHfIconMinus)}
        plusIcon={image(assets.preferences.imgHfIconPlus)}
      />
      <SectionTitle icon={image(assets.preferences.imgHfIconMoon)}>Horas de calma</SectionTitle>
      <p className="hf-type-body-sm hf-muted">No recibirás avisos durante estos periodos.</p>
      <div className="onb-schedule-list">
        {draft.quietPeriods.map((period, index) => (
          <div className="onb-quiet-period" key={index}>
            <TimeRow
              label="Desde"
              accessibleLabel={`Inicio de calma ${index + 1}`}
              value={period.from}
              clockIcon={image(assets.preferences.imgHfIconClock)}
              onChange={(value) => updatePeriod(index, 'from', value)}
            />
            <TimeRow
              label="Hasta"
              accessibleLabel={`Fin de calma ${index + 1}`}
              value={period.to}
              clockIcon={image(assets.preferences.imgHfIconClock)}
              onChange={(value) => updatePeriod(index, 'to', value)}
            />
            {index > 0 && (
              <Button
                variant="text"
                onClick={() =>
                  onChange({
                    ...draft,
                    quietPeriods: draft.quietPeriods.filter((_, i) => i !== index),
                  })
                }
              >
                Quitar periodo {index + 1}
              </Button>
            )}
          </div>
        ))}
        <div className="onb-action-slot">
          <Button
            variant="secondary"
            disabled={draft.quietPeriods.length >= onboardingLimits.quietPeriodsMax}
            onClick={() =>
              onChange({
                ...draft,
                quietPeriods: [...draft.quietPeriods, { from: '13:00', to: '14:00' }],
              })
            }
          >
            + Añadir periodo
          </Button>
        </div>
      </div>
      <SectionTitle icon={image(assets.preferences.imgHfIconLeaf)}>Tono de mi planta</SectionTitle>
      <p className="hf-type-body-sm hf-muted">Elige el máximo nivel de sarcasmo.</p>
      <AlertLevel compact value={draft.tone} onChange={(tone) => onChange({ ...draft, tone })} />
      <div className="onb-tone-preview">
        <p className="hf-type-label-sm hf-muted">VISTA PREVIA</p>
        <div className="onb-tone-preview__message">
          {image(assets.preferences.imgFrame2)}
          <p className="hf-type-body-sm" aria-live="polite">
            {tonePreview[draft.tone]}
          </p>
        </div>
        <p className="hf-type-caption hf-muted">
          La personalidad cambia por especie. No superará el nivel que elijas.
        </p>
      </div>
      <SectionTitle>Señales adicionales</SectionTitle>
      <SettingRow
        label="Sonido reforzado"
        description="Avisos de tipo alarma, dentro de tus límites."
        checked={draft.reinforcedSound}
        disabled={!draft.notifications}
        onChange={(reinforcedSound) => onChange({ ...draft, reinforcedSound })}
      />
      <SettingRow
        label="Linterna con la app abierta"
        description="Señal breve, solo si es compatible."
        checked={draft.foregroundFlash}
        disabled={!draft.notifications}
        onChange={(foregroundFlash) => onChange({ ...draft, foregroundFlash })}
      />
      <Feedback icon={shield}>
        <p>
          Cada señal requiere aceptación independiente. Se respetan tus horas de calma y No
          molestar. Pediremos permisos cuando correspondan.
        </p>
      </Feedback>
    </>
  );
}

function OnboardingSummary({ draft, onEdit }: Pick<ContentProps, 'draft' | 'onEdit'>) {
  const edit = (label: string, step: OnboardingStep) => (
    <Button variant="text" aria-label={`Editar ${label}`} onClick={() => onEdit(step)}>
      Editar
    </Button>
  );
  return (
    <>
      <InfoCard
        title="Tu nombre"
        icon={image(assets.summary.imgHfIconUser)}
        action={edit('nombre', 'nombre')}
      >
        <p>{draft.preferredName || 'Sin configurar'}</p>
      </InfoCard>
      <InfoCard
        title="Tus metas"
        icon={image(assets.summary.imgHfIconCheck)}
        action={edit('metas', 'agua')}
      >
        <p>Agua: {new Intl.NumberFormat('es-MX').format(Number(draft.waterGoalMl))} mL</p>
        <p>Protector: 1 inicial + {draft.sunscreenReapplications} reaplicaciones</p>
      </InfoCard>
      <InfoCard
        title="Tus horarios"
        icon={image(assets.summary.imgHfIconClock)}
        action={edit('horarios', 'horarios')}
      >
        <p>Agua: {draft.waterTimes.join(' / ') || 'Sin configurar'}</p>
        <p>Protector: {draft.sunscreenTimes.join(' / ')}</p>
        <p>Zona: {draft.timeZone}</p>
      </InfoCard>
      <InfoCard
        title="Tus avisos"
        icon={image(assets.summary.imgHfIconBell)}
        action={edit('avisos', 'avisos')}
      >
        <p>
          {draft.notifications
            ? `Activos · Máximo ${draft.notificationCap} al día`
            : 'Desactivados'}
        </p>
        <p>
          Calma: {draft.quietPeriods.map((p) => `${p.from}–${p.to}`).join(' / ')} · Tono{' '}
          {tones[draft.tone]}
        </p>
        <p>
          Sonido: {draft.notifications && draft.reinforcedSound ? 'activado' : 'desactivado'} ·
          Linterna: {draft.notifications && draft.foregroundFlash ? 'activada' : 'desactivada'}
        </p>
      </InfoCard>
      <Feedback icon={shield}>
        <p>
          Tu ciclo todavía no ha comenzado. Después de crear tu cuenta podrás activar tu primera
          planta.
        </p>
      </Feedback>
    </>
  );
}

export function OnboardingContent({ step, draft, onChange, onEdit }: ContentProps) {
  switch (step) {
    case 'bienvenida':
      return (
        <>
          <h2 className="onb-section-title">Registra, cuida y colecciona</h2>
          <div className="onb-habit-intro">
            <InfoCard
              compact
              variant="water"
              title="Agua"
              icon={image(assets.welcome.imgHfIconDrop)}
            >
              <p>Registra tu consumo</p>
            </InfoCard>
            <InfoCard
              compact
              variant="sunscreen"
              title="Protector solar"
              icon={image(assets.welcome.imgHfIconSun)}
            >
              <p>Registra tus aplicaciones</p>
            </InfoCard>
          </div>
          <div className="onb-garden-teaser">
            {image(assets.welcome.imgFrame2)}
            <p className="hf-type-label-md">
              Dos hábitos → siete días → una nueva planta en tu jardín.
            </p>
          </div>
          <p className="hf-type-body-sm hf-muted">
            Si tu planta alcanza la meta semanal, se quedará en tu jardín. Cada semana comienza una
            nueva historia.
          </p>
        </>
      );
    case 'habitos':
      return (
        <>
          <InfoCard variant="water" title="Hidratación" icon={image(assets.habits.imgHfIconDrop)}>
            <p>Lleva un registro del agua que bebes y sigue una meta elegida por ti.</p>
          </InfoCard>
          <InfoCard
            variant="sunscreen"
            title="Protección solar"
            icon={image(assets.habits.imgHfIconSun)}
          >
            <p>Registra tu aplicación inicial y las reaplicaciones que hayas configurado.</p>
          </InfoCard>
          <InfoCard
            variant="plant"
            title="Un jardín que cuenta tu historia"
            icon={image(assets.habits.imgHfIconLeaf)}
          >
            <p>
              Ambos hábitos cuentan por igual. Alcanza al menos el 80 % del progreso semanal para
              que tu planta se quede en el jardín.
            </p>
          </InfoCard>
          <Feedback icon={shield}>
            <p>
              HoneyFlower registra lo que tú confirmas; no comprueba el hábito ni sustituye
              orientación médica.
            </p>
          </Feedback>
          <details className="onb-sources">
            <summary>Consultar fuentes y más información</summary>
            <div className="onb-sources__body">
              <p>
                Referencias generales para ampliar la información. No definen tus metas personales.
              </p>
              <a
                href="https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2010.1459"
                target="_blank"
                rel="noreferrer"
              >
                EFSA · Valores dietéticos de referencia para el agua (2010)
              </a>
              <a
                href="https://www.who.int/news-room/fact-sheets/detail/ultraviolet-radiation"
                target="_blank"
                rel="noreferrer"
              >
                OMS · Radiación ultravioleta y protección solar (2022)
              </a>
            </div>
          </details>
        </>
      );
    case 'nombre':
      return (
        <>
          <InfoCard
            title={draft.preferredName.trim() ? `¡Hola, ${draft.preferredName.trim()}!` : '¡Hola!'}
            icon={image(assets.name.imgHfIconUser)}
          >
            <p>Así te llamará tu planta.</p>
          </InfoCard>
          <Input
            label="Tu nombre preferido"
            name="preferredName"
            value={draft.preferredName}
            maxLength={60}
            autoComplete="nickname"
            placeholder="Tu nombre"
            help="Puedes cambiarlo después en tu perfil."
            leadingIcon={image(assets.name.imgHfIconUser)}
            onChange={(event) => onChange({ ...draft, preferredName: event.target.value })}
          />
          <Feedback icon={shield}>
            <p>
              Solo necesitamos el nombre que prefieres usar. No hace falta que sea tu nombre
              completo.
            </p>
          </Feedback>
        </>
      );
    case 'agua':
      return (
        <>
          <Stepper
            label="Meta diaria"
            value={draft.waterGoalMl}
            unit="mL"
            min={onboardingLimits.waterMin}
            max={onboardingLimits.waterMax}
            step={250}
            editable
            variant="water"
            onChange={(waterGoalMl) => onChange({ ...draft, waterGoalMl })}
            minusIcon={image(assets.water.imgHfIconMinus)}
            plusIcon={image(assets.water.imgHfIconPlus)}
          />
          <p className="hf-type-caption hf-muted">
            Ajustes de − 250 mL y + 250 mL. Toca la cantidad para escribir otro valor.
          </p>
          <Feedback icon={shield}>
            <p>
              Ejemplo de configuración. Elige una meta según tus necesidades o la orientación que
              sigas; la app no calcula cuánto debes beber.
            </p>
          </Feedback>
          <InfoCard title="¿Qué es un día de planta?" icon={image(assets.water.imgHfIconClock)}>
            <p>Dura 24 horas desde que activas tu ciclo. No siempre termina a medianoche.</p>
          </InfoCard>
          <p className="hf-type-caption hf-muted">
            Si cambias la meta después, se aplicará al siguiente día de planta.
          </p>
        </>
      );
    case 'protector':
      return (
        <>
          <InfoCard
            variant="sunscreen"
            title="Aplicación inicial"
            icon={image(assets.sunscreen.imgHfIconSun)}
          >
            <p>Al comenzar el día · 1 aplicación</p>
          </InfoCard>
          <Stepper
            label="Reaplicaciones"
            value={draft.sunscreenReapplications}
            unit="reaplicaciones"
            min={0}
            max={onboardingLimits.reapplicationsMax}
            onChange={(value) => onChange(setReapplications(draft, Number(value)))}
            minusIcon={image(assets.sunscreen.imgHfIconMinus)}
            plusIcon={image(assets.sunscreen.imgHfIconPlus)}
          />
          <InfoCard
            variant="sunscreen"
            title="Tu meta diaria"
            icon={image(assets.sunscreen.imgHfIconCheck)}
          >
            <p>
              1 aplicación inicial + {draft.sunscreenReapplications} reaplicaciones ={' '}
              {draft.sunscreenReapplications + 1} aplicaciones.
            </p>
          </InfoCard>
          <Feedback icon={shield}>
            <p>
              Configura la cantidad según las indicaciones del producto y la orientación que sigas.
              Cada registro es una aplicación que tú confirmas.
            </p>
          </Feedback>
          <p className="hf-type-caption hf-muted">
            Los cambios posteriores se aplicarán al siguiente día de planta.
          </p>
        </>
      );
    case 'horarios':
      return <HabitSchedules draft={draft} onChange={onChange} />;
    case 'avisos':
      return <ReminderPreferences draft={draft} onChange={onChange} />;
    case 'resumen':
      return <OnboardingSummary draft={draft} onEdit={onEdit} />;
  }
}
