import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, fn, waitFor, within } from 'storybook/test';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AppRoutes } from '../../app/App';
import { LocalProvider } from '../local/LocalProvider';
import { analysisFixture } from '../../stories/fixtures/analysis';
import { createSnapshot, LOCAL_SNAPSHOT_KEY } from '../../shared/data/localSnapshot';
import { memoryStorage } from '../../shared/data/localRepository';
import type { ReminderDevice, NoticePermission } from '../../shared/native/reminders';
import type { Reminder } from '../reminders/model';

type ToastElement = HTMLElement & { message: string; presented: boolean };

async function findToast(root: HTMLElement, message: string) {
  let toast: ToastElement | null = null;
  await waitFor(() => {
    toast = root.ownerDocument.querySelector<ToastElement>('ion-toast.hf-toast');
    expect(toast).toBeInTheDocument();
    expect(toast?.message).toBe(message);
  });
  return toast!;
}

function ProfileRoutes({
  route,
  device,
  noProfile,
}: {
  route: string;
  device: ReminderDevice;
  noProfile: boolean;
}) {
  const [router] = useState(() =>
    createMemoryRouter(
      [
        {
          path: '*',
          element: <AppRoutes persistOnboardingDraft={false} reminderDevice={device} />,
        },
      ],
      {
        initialEntries: [
          {
            pathname: route,
            state: noProfile ? { draft: analysisFixture(0).state.preferences } : undefined,
          },
        ],
      },
    ),
  );
  return <RouterProvider router={router} />;
}
function PreferencesApp({
  route = '/perfil',
  permission = 'granted',
  notifications = true,
  sound = false,
  flash = false,
  noProfile = false,
  fresh = false,
  cactus = false,
  scenario = 'ready',
  incoming,
  onPulse = () => {},
  onRequest = () => {},
}: {
  route?: string;
  permission?: NoticePermission;
  notifications?: boolean;
  sound?: boolean;
  flash?: boolean;
  noProfile?: boolean;
  fresh?: boolean;
  cactus?: boolean;
  scenario?: 'ready' | 'write-error' | 'agenda-error';
  incoming?: 'normal' | 'reinforced' | 'open-sunscreen';
  onPulse?: () => void;
  onRequest?: () => void;
}) {
  const [bundle] = useState(() => {
    const { state, now } = analysisFixture(fresh ? 0 : 4);
    if (cactus) state.firstSpecies = 'cactus';
    Object.assign(state.preferences, {
      notifications,
      reinforcedSound: sound,
      foregroundFlash: flash,
    });
    const source = memoryStorage(
      noProfile ? {} : { [LOCAL_SNAPSHOT_KEY]: JSON.stringify(createSnapshot(state)) },
    );
    let failWrite = scenario === 'write-error',
      failAgenda = scenario === 'agenda-error',
      sent = false;
    let display = permission;
    const device: ReminderDevice = {
      supported: permission !== 'unsupported',
      permission: async () => display,
      requestPermission: async () => {
        onRequest();
        if (display === 'prompt') display = 'granted';
        return display;
      },
      replace: async (reminders, _preferences, enabled) => {
        if (enabled && failAgenda) {
          failAgenda = false;
          throw new Error('Agenda de prueba');
        }
        return enabled ? reminders.length : 0;
      },
      flashStatus: async () => ({ available: permission !== 'unsupported', granted: true }),
      authorizeFlash: async () => ({ available: permission !== 'unsupported', granted: true }),
      pulse: async () => {
        onPulse();
      },
      stopFlash: async () => {},
      listen: async (received, opened) => {
        if (incoming && !sent) {
          sent = true;
          queueMicrotask(() =>
            incoming === 'open-sunscreen'
              ? opened('/inicio/protector')
              : received({
                  kind: 'water',
                  level: incoming,
                  body: 'Tu cita de prueba sigue pendiente de revisión.',
                } as Reminder),
          );
        }
        return () => {};
      },
    };
    return {
      state,
      now,
      device,
      storage: {
        ...source,
        setItem(key: string, value: string) {
          if (key === LOCAL_SNAPSHOT_KEY && failWrite) {
            failWrite = false;
            throw new Error('Guardado de prueba');
          }
          return source.setItem(key, value);
        },
      },
    };
  });
  return (
    <LocalProvider
      initialState={noProfile ? undefined : bundle.state}
      referenceNow={bundle.now}
      persist={scenario === 'write-error' || scenario === 'agenda-error'}
      storage={bundle.storage}
    >
      <ProfileRoutes route={route} device={bundle.device} noProfile={noProfile} />
    </LocalProvider>
  );
}
const meta = {
  title: 'Pantallas/Perfil y preferencias conectados',
  component: PreferencesApp,
  parameters: { edgeToEdge: true },
  args: {
    route: '/perfil',
    permission: 'granted',
    sound: false,
    flash: false,
    onPulse: fn(),
    onRequest: fn(),
  },
} satisfies Meta<typeof PreferencesApp>;
export default meta;
type Story = StoryObj<typeof meta>;
const settings = '/perfil/notificaciones';

export const Profile: Story = {
  name: 'Perfil · estadísticas reales',
  play: async ({ canvas }) => {
    await canvas.findByRole('heading', { name: 'Perfil' });
    await expect(canvas.getByText('4', { exact: true })).toBeVisible();
    await expect(canvas.getByRole('button', { name: /Ver mis registros/ })).toBeVisible();
    await expect(canvas.queryByText('Tu constancia y tus preferencias')).not.toBeInTheDocument();
  },
};
export const NewProfile: Story = {
  name: 'Perfil nuevo · cero plantas y racha',
  args: { fresh: true },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('0 días', { exact: true })).toBeVisible();
    await expect(
      within(canvas.getByRole('group', { name: 'Estadísticas de Perfil' })).getAllByText('0', {
        exact: true,
      }),
    ).toHaveLength(2);
  },
};
export const CactusProfile: Story = {
  name: 'Perfil · Cactus del ciclo actual',
  args: { cactus: true },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('img', { name: 'Cactus saludable' })).toBeVisible();
  },
};
export const Normal: Story = {
  name: 'Avisos · sonido y linterna apagados',
  args: { route: settings },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('switch', { name: 'Recibir recordatorios' }),
    ).toBeChecked();
    await expect(canvas.getByRole('switch', { name: 'Sonido reforzado' })).not.toBeChecked();
    await expect(canvas.getByRole('switch', { name: 'Señal breve de linterna' })).not.toBeChecked();
    await expect(
      canvas.queryByRole('button', { name: /^Horarios de hábitos/ }),
    ).not.toBeInTheDocument();
  },
};
export const SoundOnly: Story = {
  name: 'Avisos · solo sonido',
  args: { route: settings, sound: true },
};
export const FlashOnly: Story = {
  name: 'Avisos · solo linterna',
  args: { route: settings, flash: true },
};
export const Both: Story = {
  name: 'Avisos · sonido y linterna',
  args: { route: settings, sound: true, flash: true },
};
export const OffKeepsSignals: Story = {
  name: 'Apagar y reabrir conserva las dos elecciones',
  args: { route: settings, sound: true, flash: true },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(await canvas.findByRole('switch', { name: 'Recibir recordatorios' }));
    await expect(
      canvas.queryByRole('switch', { name: 'Sonido reforzado' }),
    ).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Guardar preferencias' }));
    await findToast(canvasElement, 'Preferencias guardadas');
    await userEvent.click(canvas.getByRole('button', { name: 'Volver' }));
    await userEvent.click(canvas.getByRole('button', { name: /Notificaciones y horarios/ }));
    await expect(canvas.getByRole('switch', { name: 'Recibir recordatorios' })).not.toBeChecked();
    await userEvent.click(canvas.getByRole('switch', { name: 'Recibir recordatorios' }));
    await expect(canvas.getByRole('switch', { name: 'Sonido reforzado' })).toBeChecked();
    await expect(canvas.getByRole('switch', { name: 'Señal breve de linterna' })).toBeChecked();
  },
};
export const Cancel: Story = {
  name: 'Cancelar conserva las preferencias guardadas',
  args: { route: settings },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('switch', { name: 'Sonido reforzado' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Volver' }));
    await userEvent.click(canvas.getByRole('button', { name: /Notificaciones y horarios/ }));
    await expect(canvas.getByRole('switch', { name: 'Sonido reforzado' })).not.toBeChecked();
  },
};
export const Calm: Story = {
  name: 'Calma · guardar franja que cruza medianoche',
  args: { route: `${settings}/calma` },
  play: async ({ canvas, canvasElement, userEvent }) => {
    const input = await canvas.findByLabelText('Desde, franja 1');
    fireEvent.change(input, { target: { value: '21:00' } });
    await userEvent.click(canvas.getByRole('button', { name: 'Guardar horas de calma' }));
    await findToast(canvasElement, 'Preferencias guardadas');
    await userEvent.click(await canvas.findByRole('button', { name: /Horas de calma/ }));
    await expect(canvas.getByLabelText('Desde, franja 1')).toHaveValue('21:00');
  },
};
export const InvalidCalm: Story = {
  name: 'Calma incompatible · corregir antes de guardar',
  args: { route: `${settings}/calma` },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Usar 07:00–22:00' }));
    await expect(canvas.getByRole('button', { name: 'Guardar horas de calma' })).toBeDisabled();
    await expect(canvas.getByLabelText('Desde, franja 1')).toHaveAttribute('aria-invalid', 'true');
    await userEvent.click(canvas.getByRole('button', { name: 'Usar 22:00–07:00' }));
    await expect(canvas.getByRole('button', { name: 'Guardar horas de calma' })).toBeEnabled();
  },
};
export const Schedule: Story = {
  name: 'Horarios · guardar y consultar valores reales',
  args: { route: `${settings}/horarios` },
  play: async ({ canvas, canvasElement, userEvent }) => {
    fireEvent.change(await canvas.findByLabelText('Horario de protector 1'), {
      target: { value: '06:30' },
    });
    await userEvent.click(canvas.getByRole('button', { name: 'Guardar cambios' }));
    await findToast(canvasElement, 'Horarios guardados. Las próximas citas ya están actualizadas.');
    await userEvent.click(await canvas.findByRole('button', { name: /Horarios de hábitos/ }));
    await expect(canvas.getByLabelText('Horario de protector 1')).toHaveValue('06:30');
  },
};
export const NoticeExpires: Story = {
  name: 'Perfil · aviso superior se retira automáticamente',
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: /Editar perfil/ }));
    const dialog = within(canvas.getByRole('dialog'));
    await userEvent.click(dialog.getByRole('button', { name: 'Guardar cambios' }));
    const notice = await findToast(canvasElement, 'Cambios guardados en este dispositivo.');
    await waitFor(() => expect(notice.presented).toBe(true));
    await expect(notice.getBoundingClientRect().top).toBeGreaterThanOrEqual(0);
    await expect(notice.getBoundingClientRect().top).toBeLessThan(48);
    await waitFor(() => expect(notice.presented).toBe(false), { timeout: 8500 });
  },
};
export const Maximum: Story = {
  name: 'Máximo compartido · admite más de seis',
  args: { route: `${settings}/limite` },
  play: async ({ canvas, canvasElement, userEvent }) => {
    const input = await canvas.findByRole('textbox', { name: 'Máximo diario' });
    await userEvent.clear(input);
    await userEvent.type(input, '12');
    await userEvent.click(canvas.getByRole('button', { name: 'Guardar máximo' }));
    await findToast(canvasElement, 'Preferencias guardadas');
    await expect(await canvas.findByRole('button', { name: /Hasta 12 avisos/ })).toBeVisible();
  },
};
export const PermissionDenied: Story = {
  name: 'Permiso denegado · continuar y registrar',
  args: { route: settings, permission: 'denied', fresh: true },
  play: async ({ canvas, userEvent, args }) => {
    await canvas.findByText('Sin permiso del sistema');
    await expect(args.onRequest).not.toHaveBeenCalled();
    await userEvent.click(canvas.getByRole('button', { name: 'Revisar permiso' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Continuar' }));
    await expect(await canvas.findByText('Sin permiso del sistema')).toBeVisible();
    await expect(args.onRequest).toHaveBeenCalledTimes(1);
    await userEvent.click(canvas.getByRole('button', { name: 'Volver' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Inicio' }));
    await userEvent.click(canvas.getByRole('button', { name: '+250 mL' }));
    await expect(await canvas.findByText('250 mL', { exact: true })).toBeVisible();
  },
};
export const ExplicitPermission: Story = {
  name: 'El permiso solo se pide al continuar',
  args: { route: `${settings}/permiso`, permission: 'prompt' },
  play: async ({ canvas, userEvent, args }) => {
    await canvas.findByRole('heading', { name: 'Activar recordatorios' });
    await expect(args.onRequest).not.toHaveBeenCalled();
    await userEvent.click(canvas.getByRole('button', { name: 'Continuar' }));
    await expect(args.onRequest).toHaveBeenCalledTimes(1);
    await expect(await canvas.findByRole('heading', { name: 'Notificaciones' })).toBeVisible();
  },
};
export const FlashConsent: Story = {
  name: 'Linterna · aceptar o dejar apagada',
  args: { route: settings },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('switch', { name: 'Señal breve de linterna' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Ahora no' }));
    await expect(canvas.getByRole('switch', { name: 'Señal breve de linterna' })).not.toBeChecked();
    await userEvent.click(canvas.getByRole('switch', { name: 'Señal breve de linterna' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Aceptar señal de linterna' }));
    await expect(canvas.getByRole('switch', { name: 'Señal breve de linterna' })).toBeChecked();
  },
};
export const ForegroundFlash: Story = {
  name: 'Aviso reforzado visible · señal aceptada',
  args: { route: settings, flash: true, incoming: 'reinforced' },
  play: async ({ canvas, args }) => {
    await expect(await canvas.findByRole('status', { name: 'Recordatorio' })).toBeVisible();
    await waitFor(() => expect(args.onPulse).toHaveBeenCalledTimes(1));
  },
};
export const NormalDoesNotFlash: Story = {
  name: 'El contexto normal no activa linterna',
  args: { route: settings, flash: true, incoming: 'normal' },
  play: async ({ canvas, args }) => {
    await canvas.findByRole('status', { name: 'Recordatorio' });
    await expect(args.onPulse).not.toHaveBeenCalled();
  },
};
export const NoticeOpensOnly: Story = {
  name: 'Abrir un aviso no registra el hábito',
  args: { incoming: 'open-sunscreen' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { name: 'Protector solar' })).toBeVisible();
    await expect(canvas.queryByRole('dialog')).not.toBeInTheDocument();
  },
};
export const WebCapabilities: Story = {
  name: 'Navegador · preferencias sin capacidades inventadas',
  args: { route: settings, permission: 'unsupported', flash: true },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText('Avisos del teléfono disponibles en Android'),
    ).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'Revisar permiso' })).not.toBeInTheDocument();
  },
};
export const WriteRecovery: Story = {
  name: 'Fallo de guardado y reintento sin perder selección',
  args: { route: settings, scenario: 'write-error' },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(await canvas.findByRole('switch', { name: 'Sonido reforzado' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Guardar preferencias' }));
    await expect(await canvas.findByText('Guardado sin confirmar')).toBeVisible();
    await expect(canvas.getByRole('switch', { name: 'Sonido reforzado' })).toBeChecked();
    await userEvent.click(canvas.getByRole('button', { name: 'Reintentar guardado' }));
    await findToast(canvasElement, 'Preferencias guardadas');
  },
};
export const AgendaRecovery: Story = {
  name: 'La agenda nativa falla y puede reintentarse',
  args: { route: settings, scenario: 'agenda-error' },
  play: async ({ canvas, userEvent }) => {
    await expect(await canvas.findByText('Agenda sin confirmar')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Reintentar agenda' }));
    await waitFor(() => expect(canvas.queryByText('Agenda sin confirmar')).not.toBeInTheDocument());
  },
};
export const SourcesBeforeProfile: Story = {
  name: 'Fuentes públicas · antes del perfil',
  args: { route: '/fuentes', noProfile: true },
  play: async ({ canvas, userEvent }) => {
    const link = await canvas.findByRole('link', { name: 'Leer en CDC · cdc.gov' });
    await expect(link).toHaveAttribute(
      'href',
      'https://www.cdc.gov/healthy-weight-growth/water-healthy-drinks/',
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Entendido' }));
    await expect(await canvas.findByRole('button', { name: 'Ya tengo cuenta' })).toBeVisible();
  },
};
export const PrivacyBeforeProfile: Story = {
  name: 'Privacidad pública · borrador informativo',
  args: { route: '/privacidad', noProfile: true },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { name: 'Aviso de privacidad' })).toBeVisible();
    await expect(canvas.getByText(/Borrador informativo/)).toBeVisible();
    await expect(canvas.getByRole('heading', { name: 'Versión con cuenta' })).toBeVisible();
  },
};
export const ContentReturn: Story = {
  name: 'Fuentes y privacidad vuelven al Perfil de origen',
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: /Consultar fuentes/ }));
    await userEvent.click(canvas.getByRole('button', { name: 'Entendido' }));
    await expect(await canvas.findByRole('button', { name: /Consultar fuentes/ })).toHaveFocus();
    await userEvent.click(canvas.getByRole('button', { name: /Privacidad y uso de datos/ }));
    await userEvent.click(canvas.getByRole('button', { name: 'Volver' }));
    await expect(await canvas.findByRole('heading', { name: 'Perfil' })).toBeVisible();
  },
};
export const OnboardingContentReturn: Story = {
  name: 'Información desde onboarding conserva el resumen',
  args: { route: '/onboarding/resumen', noProfile: true },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Privacidad y uso de datos' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Entendido' }));
    await expect(await canvas.findByRole('form', { name: 'Configuración inicial' })).toBeVisible();
    await expect(canvas.getByText('Alex', { exact: true })).toBeVisible();
  },
};
