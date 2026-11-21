import { IonPage } from '@ionic/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, InfoCard } from '../../shared/components';
import { useLocal } from '../local/LocalProvider';
import { isOnboardingStep } from '../onboarding/model';
import { SettingsPage } from '../preferences/SettingsPage';

export const privacyLegalReady = false;
export function contentOrigin(value: unknown, hasProfile: boolean) {
  if (value && typeof value === 'object' && 'from' in value && typeof value.from === 'string') {
    if (value.from === '/perfil') return value.from;
    if (value.from === '/cuenta/registro') return value.from;
    if (
      value.from.startsWith('/onboarding/') &&
      isOnboardingStep(value.from.slice('/onboarding/'.length))
    )
      return value.from;
  }
  return hasProfile ? '/perfil' : '/onboarding/bienvenida';
}
const privacy = [
  [
    'En este dispositivo',
    'La app conserva una copia local de registros y preferencias. Sin cuenta, permanecen únicamente en este dispositivo. Desinstalar o borrar sus datos elimina esa copia.',
  ],
  [
    'Versión con cuenta',
    'Al iniciar sesión, los cambios se guardan primero en el dispositivo y se envían al espacio protegido de la cuenta. El servidor valida cada operación antes de aplicarla; la descarga hacia otros dispositivos y la resolución asistida de conflictos todavía están en desarrollo.',
  ],
  [
    'Imágenes de agua',
    'La cámara se usa en ciertos registros de agua y la foto es temporal. No se conserva con el registro ni se envía a un servidor. La revisión actual es personal; no hay identificación automática. Protector se registra sin fotografías.',
  ],
  [
    'Mensajes de la planta',
    'Los mensajes actuales se generan con reglas locales de horarios y registros. Un mensaje o una foto no demuestran que realizaste un hábito.',
  ],
  [
    'Control de tus registros',
    'Puedes consultar el historial y corregir registros del día abierto desde Perfil. Los días cerrados permanecen de consulta.',
  ],
] as const;
const sources = [
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
export function ContentPage({ kind }: { kind: 'sources' | 'privacy' }) {
  const local = useLocal();
  const navigate = useNavigate();
  const location = useLocation();
  const origin = contentOrigin(location.state, !!local.state);
  const back = () =>
    void navigate(origin, {
      replace: true,
      state: {
        draft: location.state?.draft,
        focusSetting: kind === 'sources' ? 'profile-sources' : 'profile-privacy',
      },
    });
  return (
    <IonPage>
      <div data-privacy-legal-ready={String(privacyLegalReady)}>
        <SettingsPage
          title={kind === 'sources' ? 'Fuentes y más información' : 'Aviso de privacidad'}
          description={
            kind === 'sources' ? 'Referencias de los hábitos' : 'Información para este prototipo'
          }
          onBack={back}
          footer={<Button onClick={back}>Entendido</Button>}
        >
          {kind === 'privacy' ? (
            <PrivacyDetails />
          ) : (
            <>
              {sources.map(([title, description, label, url]) => (
                <div className="settings-fields" key={title}>
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
                Fuentes revisadas: 9 de noviembre de 2026. Contenido informativo; no sustituye
                orientación profesional.
              </p>
            </>
          )}
        </SettingsPage>
      </div>
    </IonPage>
  );
}

export function PrivacyDetails() {
  return (
    <div className="hf-stack">
      {privacy.map(([title, description]) => (
        <InfoCard title={title} key={title}>
          <p>{description}</p>
        </InfoCard>
      ))}
      <InfoCard title="Acceso a cuentas">
        <p>
          Supabase gestiona el correo, la contraseña y la sesión. También recibe las operaciones de
          hábitos de cada cuenta, las valida y conserva sus resultados canónicos. Las fotografías
          temporales no forman parte de esas operaciones. La sincronización descendente entre
          dispositivos aún no está disponible.
        </p>
      </InfoCard>
      <p className="hf-type-caption hf-secondary">
        Borrador informativo. El aviso definitivo se completará antes de habilitar cuentas reales;
        este contenido no sustituye el aviso legal del responsable.
      </p>
    </div>
  );
}
