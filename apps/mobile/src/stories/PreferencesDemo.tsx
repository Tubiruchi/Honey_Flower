import { useState } from 'react';
import {
  Button,
  Feedback,
  IconButton,
  InfoCard,
  SettingRow,
  SettingsLink,
  Stepper,
  TimeRow,
} from '../shared/components';
import { phase2Assets } from '../assets/figma/components/phase2';

type Page =
  'preferences' | 'calm' | 'schedule' | 'limit' | 'sources' | 'privacy' | 'permission' | 'saved';
export interface PreferencesDemoProps {
  initialPage?: Page;
  initialReminders?: boolean;
  initialSound?: boolean;
  initialFlash?: boolean;
  initialPermission?: 'granted' | 'denied';
  invalidCalm?: boolean;
}
const sourceContent = [
  [
    'Agua · CDC',
    'Beber suficiente agua ayuda al funcionamiento normal del cuerpo. Las necesidades varían entre personas; la meta de HoneyFlower la eliges tú.',
    'Leer en CDC · cdc.gov',
    'https://www.cdc.gov/healthy-weight-growth/water-healthy-drinks/',
  ],
  [
    'Protección solar · AAD',
    'La protección solar combina sombra, ropa adecuada y protector en la piel expuesta. Registrar una aplicación no demuestra protección efectiva.',
    'Leer en AAD · aad.org',
    'https://www.aad.org/public/everyday-care/sun-protection/shade-clothing-sunscreen/practice-safe-sun',
  ],
] as const;
const privacyContent = [
  [
    'En este dispositivo',
    'La prueba local conserva registros y preferencias en este dispositivo, sin sincronización con una cuenta.',
  ],
  [
    'Versión con cuenta',
    'El producto objetivo contempla guardar y sincronizar registros y preferencias al iniciar sesión. Esa capacidad no está activa en la prueba local.',
  ],
  [
    'Imágenes de agua',
    'El diseño contempla cámara en ciertos registros de agua y análisis efímero, sin conservar ni enviar fotos por defecto. Protector se registra sin fotografías.',
  ],
  [
    'Mensajes de la planta',
    'La personalización prevista usa información agregada de registros. Un mensaje o una foto no demuestran que realizaste un hábito.',
  ],
  [
    'Control de tus registros',
    'Puedes consultar el historial y corregir registros del día abierto desde Perfil. Los días cerrados permanecen de consulta.',
  ],
] as const;
const minutes = (t: string) => {
  const [h = 0, m = 0] = t.split(':').map(Number);
  return h * 60 + m;
};
const inCalm = (hour: string, start: string, end: string) => {
  const t = minutes(hour),
    a = minutes(start),
    b = minutes(end);
  return a < b ? t >= a && t < b : t >= a || t < b;
};

export function PreferencesDemo({
  initialPage = 'preferences',
  initialReminders = true,
  initialSound = false,
  initialFlash = false,
  initialPermission = 'granted',
  invalidCalm = false,
}: PreferencesDemoProps) {
  const [page, setPage] = useState<Page>(initialPage);
  const [reminders, setReminders] = useState(initialReminders);
  const [sound, setSound] = useState(initialSound);
  const [flash, setFlash] = useState(initialFlash);
  const [permission, setPermission] = useState(initialPermission);
  const [from, setFrom] = useState(invalidCalm ? '07:00' : '22:00');
  const [to, setTo] = useState(invalidCalm ? '22:00' : '07:00');
  const [water, setWater] = useState(['08:00', '11:00', '14:00', '17:00']);
  const [sun, setSun] = useState(['08:00', '11:00', '14:00']);
  const [maximum, setMaximum] = useState('6');
  const invalid =
    !from || !to || from === to || [...water, ...sun].every((t) => inCalm(t, from, to));
  const titles: Record<Page, [string, string]> = {
    preferences: ['Notificaciones', 'Tú eliges cuándo y cómo recibir avisos'],
    calm: [
      'Horas de calma',
      invalid ? 'Revisa los horarios antes de guardar' : 'Sin avisos durante esta franja',
    ],
    schedule: ['Horarios de hábitos', 'Puedes ajustarlos cuando lo necesites'],
    limit: ['Máximo diario', 'Un límite compartido entre ambos hábitos'],
    sources: ['Fuentes y más información', 'Referencias de los hábitos'],
    privacy: ['Aviso de privacidad', 'Información para este prototipo'],
    permission: ['Permiso para los avisos', 'Tú decides si autorizas los recordatorios'],
    saved: ['Preferencias guardadas', 'Puedes cambiarlas desde Perfil'],
  };
  const back = () => setPage('preferences');
  return (
    <div className="hf-preview-phone" data-privacy-legal-ready="false">
      <header className="hf-preferences-header">
        <IconButton className="hf-preferences-back" label="Volver" onClick={back} />
        <div>
          <h1 className="hf-type-heading-md">{titles[page][0]}</h1>
          <p className="hf-type-caption hf-secondary">{titles[page][1]}</p>
        </div>
      </header>
      <main className="hf-preview-scroll hf-preferences-scroll">
        {page === 'preferences' && (
          <>
            <SettingRow
              label="Recibir recordatorios"
              description="Se respetan tus horarios, horas de calma y máximo diario."
              checked={reminders}
              onChange={setReminders}
            />
            {reminders && (
              <>
                {permission === 'denied' && (
                  <>
                    <Feedback variant="warning" title="Sin permiso del sistema">
                      Puedes continuar sin avisos. Tus hábitos y registros se conservan.
                    </Feedback>
                    <Button variant="secondary" onClick={() => setPage('permission')}>
                      Revisar permiso
                    </Button>
                  </>
                )}
                <SettingsLink
                  label="Horas de calma"
                  detail={`Sin avisos de ${from} a ${to}`}
                  icon={<img src={phase2Assets.preferencesCalm} alt="" />}
                  onClick={() => setPage('calm')}
                />
                <SettingsLink
                  label="Horarios de hábitos"
                  detail="Agua: 4 citas · Protector: 3 citas"
                  icon={<img src={phase2Assets.preferencesSchedule} alt="" />}
                  onClick={() => setPage('schedule')}
                />
                <SettingsLink
                  label="Máximo diario"
                  detail={`Hasta ${maximum} avisos entre ambos hábitos`}
                  icon={<img src={phase2Assets.preferencesLimit} alt="" />}
                  onClick={() => setPage('limit')}
                />
                <SettingRow
                  label="Sonido reforzado"
                  description="Solo si lo activas y el sistema lo permite. No evita No molestar."
                  checked={sound}
                  onChange={setSound}
                />
                <SettingRow
                  label="Señal breve de linterna"
                  description="Solo con la app visible, aceptación propia y dispositivo compatible."
                  checked={flash}
                  onChange={setFlash}
                />
                <p className="hf-type-body-sm hf-secondary">
                  Los avisos pendientes se ajustan a tus preferencias. La planta no modifica estos
                  límites por su cuenta.
                </p>
              </>
            )}
            {!reminders && (
              <Feedback variant="neutral" title="Avisos apagados">
                Puedes seguir registrando hábitos sin recibir recordatorios.
              </Feedback>
            )}
            <Button onClick={() => setPage('saved')}>Guardar preferencias</Button>
          </>
        )}
        {page === 'calm' && (
          <>
            <TimeRow label="Desde" value={from} onChange={setFrom} />
            <TimeRow label="Hasta" value={to} onChange={setTo} />
            {invalid ? (
              <Feedback variant="error" title="Todas tus citas quedan en calma">
                Agua: 08, 11, 14 y 17 h. Protector: 08, 11 y 14 h. Ajusta esta franja o los horarios
                de hábitos.
              </Feedback>
            ) : (
              <Feedback variant="info">
                Esta franja termina al día siguiente. En horas de calma no se emiten alarmas ni
                señales de linterna.
              </Feedback>
            )}
            <Button
              variant="text"
              onClick={() => {
                setFrom(invalid ? '22:00' : '07:00');
                setTo(invalid ? '07:00' : '22:00');
              }}
            >
              {invalid ? 'Usar 22:00–07:00' : 'Usar 07:00–22:00'}
            </Button>
            <Button disabled={invalid} onClick={back}>
              {invalid ? 'Guardar' : 'Guardar horas de calma'}
            </Button>
          </>
        )}
        {page === 'schedule' && (
          <>
            <h2 className="hf-type-heading-md">Agua</h2>
            {water.map((t, i) => (
              <TimeRow
                key={i}
                label={`Cita de agua ${i + 1}`}
                value={t}
                onChange={(next) => setWater(water.map((old, j) => (i === j ? next : old)))}
              />
            ))}
            <h2 className="hf-type-heading-md">Protector solar</h2>
            {sun.map((t, i) => (
              <TimeRow
                key={i}
                label={`Cita de protector ${i + 1}`}
                value={t}
                onChange={(next) => setSun(sun.map((old, j) => (i === j ? next : old)))}
              />
            ))}
            <Button onClick={back}>Guardar horarios</Button>
          </>
        )}
        {page === 'limit' && (
          <>
            <Stepper
              label="Máximo diario"
              value={maximum}
              min={1}
              max={12}
              unit="avisos"
              onChange={setMaximum}
            />
            <Feedback variant="info">
              Este máximo se comparte entre agua y protector, respetando las horas de calma.
            </Feedback>
            <Button onClick={back}>Guardar máximo diario</Button>
          </>
        )}
        {page === 'permission' && (
          <>
            <InfoCard title="El permiso lo decides tú">
              <p>
                Puedes continuar sin autorización y registrar tus hábitos. Los horarios y límites
                son tuyos.
              </p>
            </InfoCard>
            <Button
              onClick={() => {
                setPermission('granted');
                back();
              }}
            >
              Continuar
            </Button>
            <Button
              variant="text"
              onClick={() => {
                setPermission('denied');
                back();
              }}
            >
              Continuar sin permiso
            </Button>
          </>
        )}
        {page === 'saved' && (
          <>
            <Feedback variant="success" title="Preferencias guardadas">
              Puedes volver a cambiarlas cuando lo necesites.
            </Feedback>
            <Button onClick={back}>Entendido</Button>
          </>
        )}
        {page === 'sources' && (
          <>
            {sourceContent.map(([title, description, label, url]) => (
              <div className="hf-story-content" key={title}>
                <InfoCard title={title}>
                  <p>{description}</p>
                </InfoCard>
                <a className="hf-source-link" href={url} target="_blank" rel="noreferrer">
                  {label}
                </a>
              </div>
            ))}
            <InfoCard title="Cómo cuenta el juego">
              <p>
                Agua y protector pesan 50 % cada uno. El 80 % semanal es una regla para la planta
                virtual; no es un indicador médico.
              </p>
            </InfoCard>
            <p className="hf-type-caption hf-secondary">
              Fuentes consultadas: 4 de noviembre de 2026. Contenido informativo; no sustituye
              orientación profesional.
            </p>
            <Button onClick={back}>Entendido</Button>
          </>
        )}
        {page === 'privacy' && (
          <>
            {privacyContent.map(([title, description]) => (
              <InfoCard title={title} key={title}>
                <p>{description}</p>
              </InfoCard>
            ))}
            <p className="hf-type-caption hf-secondary">
              El aviso definitivo se completará antes de habilitar cuentas reales. Este contenido de
              diseño no sustituye el aviso legal del responsable.
            </p>
            <Button onClick={back}>Entendido</Button>
          </>
        )}
      </main>
    </div>
  );
}
