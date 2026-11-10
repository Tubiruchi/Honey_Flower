import { useEffect, useRef, useState } from 'react';
import { IonPage } from '@ionic/react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  AsyncContentState,
  Button,
  Feedback,
  Input,
  PlantCharacter,
} from '../../shared/components';
import { TopNotice } from '../../shared/components/TopNotice';
import { useAuth } from './AuthProvider';
import {
  authError,
  CONNECTION_PENDING,
  emailError,
  parseAuthCallback,
  passwordError,
} from './model';
import { useLocal } from '../local/LocalProvider';
import { confirmed } from '../../shared/data/localSnapshot';
import { readOnboardingSnapshot } from '../onboarding/model';
import { Modal } from '../local/Modal';
import { PrivacyDetails } from '../content/ContentPage';
import './account.css';

type View = 'entrar' | 'registro' | 'recuperar' | 'confirmar' | 'nueva-clave';
const titles: Record<View, string> = {
  entrar: 'Tu jardín te espera',
  registro: 'Crea tu cuenta',
  recuperar: 'Recupera tu acceso',
  confirmar: 'Revisa tu correo',
  'nueva-clave': 'Elige una nueva contraseña',
};
export function AccountRoutes() {
  const location = useLocation();
  const view = location.pathname.slice('/cuenta/'.length);
  if (view === 'callback') return <AccountCallback />;
  if (!Object.hasOwn(titles, view)) return <Navigate to="/cuenta/entrar" replace />;
  return <AccountForm key={view} view={view as View} />;
}
function AccountFrame({
  children,
  title,
  onBack,
}: {
  children: React.ReactNode;
  title: string;
  onBack: () => void;
}) {
  return (
    <IonPage>
      <main className="account-screen">
        <header>
          <AppBar title="HONEYFLOWER" onBack={onBack} />
        </header>
        <section className="account-scroll" aria-label={title}>
          <div className="account-hero">
            <PlantCharacter decorative />
            <h1 className="hf-type-heading-xl">{title}</h1>
          </div>
          {children}
        </section>
      </main>
    </IonPage>
  );
}
function AccountForm({ view }: { view: View }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const local = useLocal();
  const [name, setName] = useState(() =>
    typeof location.state?.draft?.preferredName === 'string'
      ? location.state.draft.preferredName
      : (local.state?.preferences.preferredName ?? ''),
  );
  const [email, setEmail] = useState(() =>
    typeof location.state?.email === 'string' ? location.state.email : '',
  );
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [issue, setIssue] = useState('');
  const [notice, setNotice] = useState(() =>
    location.state?.passwordChanged ? 'Contraseña actualizada. Ya puedes iniciar sesión.' : '',
  );
  const [busy, setBusy] = useState(false);
  const flight = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(view === 'confirmar' ? 60 : 0);
  const [noticeId, setNoticeId] = useState(0);
  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown((n) => Math.max(0, n - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);
  useEffect(() => {
    form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [errors]);
  if (auth.user && (view === 'entrar' || view === 'registro')) return <Navigate to="/" replace />;
  const move = (next: View) =>
    void navigate(`/cuenta/${next}`, { state: { email, draft: location.state?.draft } });
  const guest = () =>
    void navigate('/cuenta/invitado', { state: { draft: location.state?.draft } });
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (flight.current) return;
    const validation: Record<string, string> = {};
    if (view !== 'nueva-clave' && emailError(email)) validation.email = emailError(email);
    if (view === 'entrar' && !password) validation.password = 'Escribe tu contraseña.';
    if ((view === 'registro' || view === 'nueva-clave') && passwordError(password))
      validation.password = passwordError(password);
    if ((view === 'registro' || view === 'nueva-clave') && password !== confirmation)
      validation.confirmation = 'Las contraseñas no coinciden.';
    if (view === 'registro' && (!name.trim() || name.trim().length > 60))
      validation.name = 'Escribe tu nombre, de hasta 60 caracteres.';
    if (view === 'registro' && !accepted)
      validation.accepted = 'Lee y acepta el aviso de privacidad para continuar.';
    setErrors(validation);
    setIssue('');
    setNotice('');
    setNoticeId((n) => n + 1);
    if (Object.keys(validation).length) return;
    if (!auth.port.configured) {
      setIssue(CONNECTION_PENDING);
      return;
    }
    flight.current = true;
    setBusy(true);
    try {
      if (view === 'entrar') {
        await auth.port.signIn(email.trim(), password);
        setPassword('');
        void navigate('/', { replace: true });
      } else if (view === 'registro') {
        const user = await auth.port.signUp(email.trim(), password, name.trim());
        setPassword('');
        setConfirmation('');
        void navigate(user ? '/onboarding/nombre' : '/cuenta/confirmar', {
          replace: true,
          state: { email: email.trim(), draft: location.state?.draft },
        });
      } else if (view === 'recuperar') {
        await auth.port.resetPassword(email.trim());
        setSent(true);
        setCooldown(60);
      } else if (view === 'nueva-clave') {
        await auth.port.updatePassword(password);
        setPassword('');
        setConfirmation('');
        await auth.signOut();
        void navigate('/cuenta/entrar', { replace: true, state: { passwordChanged: true } });
      }
    } catch (error) {
      setIssue(authError(error));
    } finally {
      flight.current = false;
      setBusy(false);
    }
  };
  const resend = async () => {
    if (flight.current || cooldown || !auth.port.configured) return;
    if (emailError(email)) {
      setErrors({ email: emailError(email) });
      return;
    }
    flight.current = true;
    setBusy(true);
    setIssue('');
    setNotice('');
    setNoticeId((n) => n + 1);
    try {
      await auth.port.resendConfirmation(email.trim());
      setCooldown(60);
      setNotice('Si el correo puede confirmarse, recibirás un nuevo enlace.');
    } catch (error) {
      setIssue(authError(error));
    } finally {
      flight.current = false;
      setBusy(false);
    }
  };
  return (
    <AccountFrame
      title={titles[view]}
      onBack={() =>
        busy
          ? undefined
          : view === 'entrar'
            ? void navigate('/onboarding/bienvenida')
            : move('entrar')
      }
    >
      <TopNotice
        message={issue || auth.issue}
        variant="error"
        noticeId={noticeId}
        onDismiss={() => setIssue('')}
      />
      <TopNotice message={notice} noticeId={noticeId} onDismiss={() => setNotice('')} />
      {!auth.port.configured && (
        <Feedback variant="info" title="Acceso a cuentas pendiente">
          {CONNECTION_PENDING}
        </Feedback>
      )}
      {auth.issue && (
        <Button variant="text" onClick={auth.reload}>
          Reintentar conexión
        </Button>
      )}
      {view === 'confirmar' ? (
        <div className="hf-stack">
          <p>
            Si el registro puede completarse, enviaremos un enlace para confirmar tu correo. Ábrelo
            en este mismo dispositivo.
          </p>
          <Input
            label="Correo electrónico"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            disabled={busy}
          />
          <Button
            disabled={!auth.port.configured || busy || cooldown > 0}
            onClick={() => void resend()}
          >
            {cooldown ? `Reenviar en ${cooldown} s` : 'Reenviar correo'}
          </Button>
          <Button variant="secondary" onClick={() => move('entrar')}>
            Ir a iniciar sesión
          </Button>
        </div>
      ) : sent ? (
        <div className="hf-stack" role="status">
          <p>
            Si existe una cuenta con ese correo, recibirás un enlace para elegir una nueva
            contraseña. Ábrelo en este mismo dispositivo.
          </p>
          <Button variant="secondary" onClick={() => move('entrar')}>
            Volver a iniciar sesión
          </Button>
          <Button variant="text" disabled={cooldown > 0} onClick={() => setSent(false)}>
            {cooldown ? `Volver a intentar en ${cooldown} s` : 'Usar otro correo'}
          </Button>
        </div>
      ) : view === 'nueva-clave' && !auth.user ? (
        <Feedback variant="warning" title="Abre el enlace de recuperación">
          Necesitamos un enlace válido para cambiar tu contraseña.
          <Button variant="text" onClick={() => move('recuperar')}>
            Solicitar otro enlace
          </Button>
        </Feedback>
      ) : (
        <form
          ref={form}
          onSubmit={(event) => void submit(event)}
          noValidate
          className="account-form"
          aria-label={view === 'entrar' ? 'Iniciar sesión' : titles[view]}
        >
          <fieldset disabled={busy}>
            {view === 'registro' && (
              <Input
                label="Tu nombre"
                name="name"
                autoComplete="nickname"
                maxLength={60}
                value={name}
                error={errors.name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
            {view !== 'nueva-clave' && (
              <Input
                label="Correo electrónico"
                name="email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={254}
                value={email}
                error={errors.email}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}
            {view !== 'recuperar' && (
              <Input
                label={view === 'nueva-clave' ? 'Nueva contraseña' : 'Contraseña'}
                name="password"
                type="password"
                autoComplete={view === 'entrar' ? 'current-password' : 'new-password'}
                value={password}
                error={errors.password}
                help={view === 'entrar' ? undefined : 'Al menos 8 caracteres.'}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
            {(view === 'registro' || view === 'nueva-clave') && (
              <Input
                label="Confirmar contraseña"
                name="confirmation"
                type="password"
                autoComplete="new-password"
                value={confirmation}
                error={errors.confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
              />
            )}
            {view === 'registro' && (
              <div className="account-consent">
                <label>
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                    aria-invalid={errors.accepted ? true : undefined}
                    aria-describedby={errors.accepted ? 'account-consent-error' : undefined}
                  />
                  He leído y acepto el aviso de privacidad.
                </label>
                <Button variant="text" onClick={() => setPrivacyOpen(true)}>
                  Leer aviso de privacidad
                </Button>
                {errors.accepted && (
                  <p className="hf-error" id="account-consent-error">
                    {errors.accepted}
                  </p>
                )}
              </div>
            )}
            {view === 'entrar' && (
              <Button variant="text" onClick={() => move('recuperar')}>
                Olvidé mi contraseña
              </Button>
            )}
            <Button type="submit" disabled={!auth.port.configured} loading={busy}>
              {
                {
                  entrar: 'Iniciar sesión',
                  registro: 'Crear cuenta',
                  recuperar: 'Enviar enlace',
                  'nueva-clave': 'Guardar contraseña',
                }[view]
              }
            </Button>
          </fieldset>
        </form>
      )}
      {(view === 'entrar' || view === 'registro') && (
        <div className="account-alternatives">
          <Button
            variant="text"
            disabled={busy}
            onClick={() => move(view === 'entrar' ? 'registro' : 'entrar')}
          >
            {view === 'entrar' ? 'Crear una cuenta' : 'Ya tengo cuenta'}
          </Button>
          <Button variant="secondary" disabled={busy} onClick={guest}>
            Continuar sin cuenta
          </Button>
        </div>
      )}
      {privacyOpen && (
        <Modal title="Aviso de privacidad" onClose={() => setPrivacyOpen(false)}>
          <PrivacyDetails />
          <Button onClick={() => setPrivacyOpen(false)}>Entendido</Button>
        </Modal>
      )}
    </AccountFrame>
  );
}
function AccountCallback() {
  const auth = useAuth(),
    navigate = useNavigate(),
    location = useLocation();
  const [issue, setIssue] = useState('');
  useEffect(() => {
    let alive = true;
    const callback = parseAuthCallback(
      window.location.origin + location.pathname + location.search,
      window.location.origin,
    );
    if (!auth.port.configured || !callback?.code) {
      queueMicrotask(() => {
        if (alive) {
          setIssue('Este enlace no es válido o la conexión de cuentas todavía no está activa.');
          window.history.replaceState(window.history.state, '', '/cuenta/callback');
        }
      });
    } else
      void auth.port
        .exchangeCode(callback.code)
        .then(() => {
          if (alive)
            void navigate(callback.recovery ? '/cuenta/nueva-clave' : '/', { replace: true });
        })
        .catch((error) => {
          if (alive) {
            setIssue(authError(error));
            window.history.replaceState(window.history.state, '', '/cuenta/callback');
          }
        });
    return () => {
      alive = false;
    };
  }, [auth.port, location.pathname, location.search, navigate]);
  return (
    <AccountFrame
      title={issue ? 'Revisa tu enlace' : 'Confirmando tu acceso'}
      onBack={() => void navigate('/cuenta/entrar', { replace: true })}
    >
      {issue ? (
        <Feedback variant="error">
          {issue}
          <Button variant="text" onClick={() => navigate('/cuenta/recuperar', { replace: true })}>
            Solicitar otro enlace
          </Button>
        </Feedback>
      ) : (
        <AsyncContentState
          state="loading"
          title="Abriendo tu cuenta"
          description="Estamos comprobando el enlace."
        />
      )}
    </AccountFrame>
  );
}
export function GuestEntry() {
  const auth = useAuth(),
    local = useLocal(),
    navigate = useNavigate(),
    location = useLocation();
  const [issue, setIssue] = useState('');
  useEffect(() => {
    if (auth.user) {
      void navigate('/', { replace: true });
      return;
    }
    if (auth.mode !== 'guest') {
      queueMicrotask(() => {
        try {
          auth.enterGuest();
        } catch {
          setIssue(
            'No pudimos abrir el modo sin cuenta. Revisa el almacenamiento del dispositivo.',
          );
        }
      });
      return;
    }
    if (local.state) {
      void navigate('/inicio', { replace: true });
      return;
    }
    let alive = true;
    const draft = readOnboardingSnapshot({
      getItem: () => JSON.stringify({ version: 1, step: 'resumen', draft: location.state?.draft }),
    })?.draft;
    void local
      .start(draft)
      .then(confirmed)
      .then(() => {
        if (alive) void navigate('/inicio', { replace: true });
      })
      .catch(() => {
        if (alive) setIssue('No pudimos guardar tu configuración. Reintenta para continuar.');
      });
    return () => {
      alive = false;
    };
    // A repository retry resolves the same original start command; never create another from a render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.mode, auth.user, navigate]);
  return (
    <IonPage>
      <main className="account-loading">
        {issue ? (
          <Feedback variant="error">
            {issue}
            <Button onClick={() => navigate('/cuenta/entrar')}>Volver</Button>
          </Feedback>
        ) : (
          <AsyncContentState
            state="loading"
            title="Abriendo tu jardín"
            description="Tus datos se quedan en este dispositivo."
          />
        )}
      </main>
    </IonPage>
  );
}
