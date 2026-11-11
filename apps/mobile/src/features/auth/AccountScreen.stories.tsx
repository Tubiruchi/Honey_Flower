import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './AuthProvider';
import type { AccountUser, AuthPort } from './model';
import { AccountScopedApp } from '../../app/App';
import { memoryStorage } from '../../shared/data/localRepository';
import type { LocalStoragePort } from '../../shared/data/localRepository';
import { createLocalState } from '../local/model';
import { createOnboardingDraft } from '../onboarding/model';
import { ONBOARDING_STORAGE_KEY } from '../onboarding/model';
import { createSnapshot, LOCAL_SNAPSHOT_KEY } from '../../shared/data/localSnapshot';
import { PENDING_ACCOUNT_SETUP_KEY, savePendingAccountSetup } from './pendingSetup';

const completedDraft = () => ({
  ...createOnboardingDraft('America/Cancun'),
  preferredName: 'Ana',
});
const registrationEntry = () => ({
  pathname: '/cuenta/registro',
  state: { draft: completedDraft() },
});

function AccountDemo({
  route = '/cuenta/entrar',
  scenario = 'ready',
  onAction = () => {},
}: {
  route?: string | { pathname: string; state?: unknown };
  scenario?:
    | 'ready'
    | 'unconfigured'
    | 'invalid'
    | 'offline'
    | 'restored'
    | 'signout-error'
    | 'restore-error'
    | 'new-account';
  onAction?: (action: string) => void;
}) {
  const [router] = useState(() => {
    window.localStorage.removeItem(PENDING_ACCOUNT_SETUP_KEY);
    window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    const a: AccountUser = { id: 'account-a', email: 'ana@example.com', name: 'Ana' };
    const b: AccountUser = { id: 'account-b', email: 'beto@example.com', name: 'Beto' };
    let user = scenario === 'restored' || scenario === 'signout-error' ? a : null;
    let restoreFailed = scenario === 'restore-error';
    const listeners = new Set<(user: AccountUser | null, recovery: boolean) => void>();
    const emit = (next: AccountUser | null, recovery = false) => {
      user = next;
      listeners.forEach((listener) => listener(next, recovery));
    };
    const sources = new Map<string, LocalStoragePort>();
    for (const [scope, name] of [
      ['guest', 'Invitada'],
      [a.id, 'Ana'],
      [b.id, 'Beto'],
    ] as const) {
      if (scenario === 'new-account' && scope === a.id) continue;
      const state = createLocalState(Date.now() - 3_600_000, {
        ...createOnboardingDraft('UTC'),
        preferredName: name,
      });
      if (scope === a.id)
        state.events.push({ id: 'ana-water', kind: 'water', amount: 500, at: Date.now() - 60_000 });
      sources.set(
        scope,
        memoryStorage({ [LOCAL_SNAPSHOT_KEY]: JSON.stringify(createSnapshot(state)) }),
      );
    }
    const source = (scope: string) => {
      let storage = sources.get(scope);
      if (!storage) {
        storage = memoryStorage();
        sources.set(scope, storage);
      }
      return storage;
    };
    let callback: Promise<AccountUser> | undefined;
    if (scenario === 'new-account')
      savePendingAccountSetup(window.localStorage, a.email, completedDraft());
    const port: AuthPort = {
      configured: scenario !== 'unconfigured',
      restore: async () => {
        if (restoreFailed) {
          restoreFailed = false;
          throw Error('offline');
        }
        return user;
      },
      subscribe: (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
      signIn: async (email) => {
        onAction('sign-in');
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (scenario === 'invalid') throw { code: 'invalid_credentials' };
        if (scenario === 'offline') throw Error('network');
        const next = email === b.email ? b : a;
        emit(next);
        return next;
      },
      signUp: async () => {
        onAction('sign-up');
        return null;
      },
      resetPassword: async () => {
        onAction('reset');
      },
      resendConfirmation: async () => {
        onAction('resend');
      },
      updatePassword: async () => {
        onAction('password-updated');
      },
      exchangeCode: (code, flowId) => {
        callback ??= Promise.resolve().then(() => {
          onAction(flowId ? `exchange:${flowId}` : 'exchange');
          if (code === 'expired') throw { code: 'flow_state_expired' };
          emit(a, true);
          return a;
        });
        return callback;
      },
      signOut: async () => {
        onAction('sign-out');
        if (scenario === 'signout-error') throw Error('network');
        emit(null);
      },
    };
    return createMemoryRouter(
      [
        {
          path: '*',
          element: (
            <AuthProvider port={port} persist={false}>
              <AccountScopedApp storageForScope={source} />
            </AuthProvider>
          ),
        },
      ],
      { initialEntries: [route] },
    );
  });
  return <RouterProvider router={router} />;
}
const meta = {
  title: 'Pantallas/Cuenta y acceso conectados',
  component: AccountDemo,
  parameters: { edgeToEdge: true },
  args: { route: '/cuenta/entrar', scenario: 'ready', onAction: fn() },
} satisfies Meta<typeof AccountDemo>;
export default meta;
type Story = StoryObj<typeof meta>;
async function credentials(
  canvas: ReturnType<typeof within>,
  userEvent: { type: (element: Element, text: string) => Promise<void> },
  email = 'ana@example.com',
) {
  await userEvent.type(await canvas.findByLabelText('Correo electrónico'), email);
  await userEvent.type(canvas.getByLabelText('Contraseña', { exact: true }), 'password-example');
}
export const Login: Story = {
  name: 'Iniciar sesión',
  play: async ({ canvas, userEvent }) => {
    await credentials(canvas, userEvent);
    await userEvent.click(canvas.getByRole('button', { name: 'Iniciar sesión' }));
    await expect(await canvas.findByRole('heading', { name: 'Hola, Ana' })).toBeVisible();
  },
};
export const PendingConnection: Story = {
  name: 'Conexión pendiente · sin sesión ficticia',
  args: { scenario: 'unconfigured' },
  play: async ({ canvas, args }) => {
    await expect(await canvas.findByText('Acceso a cuentas pendiente')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Iniciar sesión' })).toBeDisabled();
    await expect(
      canvas.queryByRole('button', { name: 'Continuar sin cuenta' }),
    ).not.toBeInTheDocument();
    await expect(args.onAction).not.toHaveBeenCalled();
  },
};
export const FirstLaunch: Story = {
  name: 'Primera apertura · onboarding antes de crear cuenta',
  args: { route: '/' },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('heading', { name: 'Tu constancia tiene una nueva compañera' }),
    ).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Ya tengo cuenta' })).toBeVisible();
    await expect(
      canvas.queryByRole('button', { name: 'Continuar sin cuenta' }),
    ).not.toBeInTheDocument();
  },
};
export const AlreadyHaveAccount: Story = {
  name: 'Ya tengo cuenta abre el acceso, sin iniciar prueba local',
  args: { route: '/onboarding/bienvenida' },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Ya tengo cuenta' }));
    await expect(await canvas.findByRole('form', { name: 'Iniciar sesión' })).toBeVisible();
    await expect(canvas.queryByRole('heading', { name: /Hola,/ })).not.toBeInTheDocument();
  },
};
export const PasswordVisibility: Story = {
  name: 'Contraseña · mostrar y ocultar',
  play: async ({ canvas, userEvent }) => {
    const input = await canvas.findByLabelText('Contraseña', { exact: true });
    await userEvent.type(input, 'example-password');
    await userEvent.click(canvas.getByRole('button', { name: 'Mostrar contraseña' }));
    await expect(input).toHaveAttribute('type', 'text');
    await userEvent.click(canvas.getByRole('button', { name: 'Ocultar contraseña' }));
    await expect(input).toHaveAttribute('type', 'password');
  },
};
export const InvalidCredentials: Story = {
  name: 'Credenciales incorrectas · permanece fuera de la cuenta',
  args: { scenario: 'invalid' },
  play: async ({ canvas, userEvent }) => {
    await credentials(canvas, userEvent);
    await userEvent.click(canvas.getByRole('button', { name: 'Iniciar sesión' }));
    await expect(
      await canvas.findByText('El correo o la contraseña no son correctos.'),
    ).toBeVisible();
    await expect(canvas.queryByRole('heading', { name: /Hola,/ })).not.toBeInTheDocument();
  },
};
export const Offline: Story = {
  name: 'Fallo de red · reintento sin perder correo',
  args: { scenario: 'offline' },
  play: async ({ canvas, userEvent }) => {
    await credentials(canvas, userEvent);
    await userEvent.click(canvas.getByRole('button', { name: 'Iniciar sesión' }));
    await expect(await canvas.findByText(/No pudimos completar la solicitud/)).toBeVisible();
    await expect(canvas.getByLabelText('Correo electrónico')).toHaveValue('ana@example.com');
  },
};
export const Register: Story = {
  name: 'Registro · confirmación de correo antes de entrar',
  args: { route: registrationEntry() },
  play: async ({ canvas, userEvent, args }) => {
    await expect(await canvas.findByLabelText('Tu nombre')).toHaveValue('Ana');
    await credentials(canvas, userEvent);
    await userEvent.type(canvas.getByLabelText('Confirmar contraseña'), 'password-example');
    await userEvent.click(canvas.getByRole('checkbox'));
    await userEvent.click(canvas.getByRole('button', { name: 'Crear cuenta' }));
    await expect(await canvas.findByRole('heading', { name: 'Revisa tu correo' })).toBeVisible();
    await expect(args.onAction).toHaveBeenCalledWith('sign-up');
    await expect(canvas.getByRole('button', { name: /Reenviar en/ })).toBeDisabled();
    await expect(canvas.queryByRole('heading', { name: /Hola,/ })).not.toBeInTheDocument();
  },
};
export const RegisterValidation: Story = {
  name: 'Registro · valida correo, contraseñas y aceptación',
  args: { route: registrationEntry() },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Crear cuenta' }));
    await expect(await canvas.findByText('Escribe un correo electrónico válido.')).toBeVisible();
    await expect(canvas.getByLabelText('Correo electrónico')).toHaveFocus();
    await expect(args.onAction).not.toHaveBeenCalled();
  },
};
export const PrivacyPreservesForm: Story = {
  name: 'Aviso de privacidad conserva la edición del registro',
  args: { route: registrationEntry() },
  play: async ({ canvas, userEvent }) => {
    await credentials(canvas, userEvent);
    await userEvent.click(canvas.getByRole('button', { name: 'Leer aviso de privacidad' }));
    await expect(await canvas.findByRole('dialog', { name: 'Aviso de privacidad' })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Entendido' }));
    await expect(canvas.getByLabelText('Correo electrónico')).toHaveValue('ana@example.com');
    await expect(canvas.getByLabelText('Contraseña', { exact: true })).toHaveValue(
      'password-example',
    );
  },
};
export const RecoverPassword: Story = {
  name: 'Recuperar contraseña · respuesta sin revelar cuentas',
  args: { route: '/cuenta/recuperar' },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.type(await canvas.findByLabelText('Correo electrónico'), 'ana@example.com');
    await userEvent.click(canvas.getByRole('button', { name: 'Enviar enlace' }));
    await expect(await canvas.findByText(/Si existe una cuenta con ese correo/)).toBeVisible();
    await expect(args.onAction).toHaveBeenCalledWith('reset');
  },
};
export const ExpiredCallback: Story = {
  name: 'Enlace vencido · no abre la cuenta',
  args: { route: '/cuenta/callback?code=expired' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/El enlace venció/)).toBeVisible();
    await expect(canvas.queryByRole('heading', { name: /Hola,/ })).not.toBeInTheDocument();
  },
};
export const ResetPassword: Story = {
  name: 'Recuperación · guardar nueva contraseña y volver al acceso',
  args: {
    route: '/cuenta/callback?code=valid&flow=recovery&sb_flow_id=recovery_flow_1234',
  },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.type(await canvas.findByLabelText('Nueva contraseña'), 'a-new-password');
    await userEvent.type(canvas.getByLabelText('Confirmar contraseña'), 'a-new-password');
    await userEvent.click(canvas.getByRole('button', { name: 'Guardar contraseña' }));
    await expect(
      await canvas.findByText('Contraseña actualizada. Ya puedes iniciar sesión.'),
    ).toBeVisible();
    await expect(args.onAction).toHaveBeenCalledWith('password-updated');
    await expect(args.onAction).toHaveBeenCalledWith('exchange:recovery_flow_1234');
  },
};
export const ConfirmedAccountKeepsSetup: Story = {
  name: 'Confirmación · conserva onboarding y entra directo a Inicio',
  args: { route: '/cuenta/callback?code=valid', scenario: 'new-account' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { name: 'Hola, Ana' })).toBeVisible();
    await expect(
      canvas.queryByRole('heading', { name: 'Tu constancia tiene una nueva compañera' }),
    ).not.toBeInTheDocument();
    await expect(window.localStorage.getItem(PENDING_ACCOUNT_SETUP_KEY)).toBeNull();
  },
};
export const RestoredSession: Story = {
  name: 'Sesión restaurada · perfil de su cuenta',
  args: { route: '/perfil', scenario: 'restored' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('ana@example.com')).toBeVisible();
    await expect(canvas.getByRole('heading', { name: 'Ana' })).toBeVisible();
  },
};
export const SignOutFailure: Story = {
  name: 'Fallo al cerrar sesión conserva la cuenta visible',
  args: { route: '/perfil', scenario: 'signout-error' },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Cerrar sesión' }));
    await expect(await canvas.findByText(/No pudimos cerrar la sesión/)).toBeVisible();
    await expect(canvas.getByText('ana@example.com')).toBeVisible();
  },
};
export const SeparateAccounts: Story = {
  name: 'Cambiar de cuenta conserva datos separados de Ana y Beto',
  args: { route: '/perfil', scenario: 'restored' },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Cerrar sesión' }));
    await expect(await canvas.findByRole('form', { name: 'Iniciar sesión' })).toBeVisible();
    await credentials(canvas, userEvent, 'beto@example.com');
    await userEvent.click(canvas.getByRole('button', { name: 'Iniciar sesión' }));
    await expect(await canvas.findByRole('heading', { name: 'Hola, Beto' })).toBeVisible();
    await expect(canvas.getByText('0 mL', { exact: true })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Perfil' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Cerrar sesión' }));
    await expect(await canvas.findByRole('form', { name: 'Iniciar sesión' })).toBeVisible();
    await credentials(canvas, userEvent);
    await userEvent.click(canvas.getByRole('button', { name: 'Iniciar sesión' }));
    await expect(await canvas.findByRole('heading', { name: 'Hola, Ana' })).toBeVisible();
    await expect(canvas.getByText('500 mL', { exact: true })).toBeVisible();
  },
};
export const SessionReadFailure: Story = {
  name: 'Error al recuperar sesión permite reintentar',
  args: { scenario: 'restore-error' },
  play: async ({ canvas, userEvent }) => {
    await expect(await canvas.findByText(/No pudimos recuperar tu sesión/)).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Reintentar conexión' }));
    await waitFor(() =>
      expect(canvas.queryByText(/No pudimos recuperar tu sesión/)).not.toBeInTheDocument(),
    );
  },
};
