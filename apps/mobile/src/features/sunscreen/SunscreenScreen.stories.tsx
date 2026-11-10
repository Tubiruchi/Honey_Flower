import { useEffect, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AppRoutes } from '../../app/App';
import { LocalProvider } from '../local/LocalProvider';
import { createLocalState, DAY_MS } from '../local/model';
import { createOnboardingDraft } from '../onboarding/model';
import { createSnapshot, LOCAL_SNAPSHOT_KEY } from '../../shared/data/localSnapshot';
import { sunscreenWindows } from './model';
const H = 3_600_000,
  M = 60_000,
  start = Date.UTC(2026, 10, 8);
type Scenario =
  | 'ordinary'
  | 'context'
  | 'closed'
  | 'upcoming'
  | 'initial-only'
  | 'write-error'
  | 'expired-retry'
  | 'read-error'
  | 'legacy'
  | 'long-agenda';
function fixture(scenario: Scenario) {
  const times =
    scenario === 'initial-only'
      ? ['11:00']
      : scenario === 'long-agenda'
        ? Array.from({ length: 13 }, (_, i) => `${String(i).padStart(2, '0')}:00`)
        : ['08:00', '11:00', '14:00'];
  const state = createLocalState(start, {
    ...createOnboardingDraft('UTC'),
    preferredName: 'Alex',
    sunscreenTimes: times,
    sunscreenReapplications: times.length - 1,
  });
  const windows = sunscreenWindows(state, 0);
  if (!['initial-only', 'upcoming'].includes(scenario))
    state.events.push({
      id: 'sun-morning',
      kind: 'sunscreen',
      amount: 1,
      at: start + 8 * H + 7 * M,
      ...(scenario === 'legacy'
        ? {}
        : { appointment: windows.find((w) => w.time === '08:00')!.appointment }),
    });
  if (scenario === 'closed')
    state.events.push({
      id: 'sun-noon',
      kind: 'sunscreen',
      amount: 1,
      at: start + 11 * H + 11 * M,
      appointment: windows.find((w) => w.time === '11:00')!.appointment,
    });
  const values = new Map([[LOCAL_SNAPSHOT_KEY, JSON.stringify(createSnapshot(state))]]);
  let now =
    start +
    (scenario === 'context'
      ? 11 * H + 40 * M
      : scenario === 'closed'
        ? 18 * H + 10 * M
        : scenario === 'upcoming'
          ? 7 * H + 45 * M
          : 11 * H + 10 * M);
  let failWrite = scenario === 'write-error' || scenario === 'expired-retry',
    failRead = scenario === 'read-error';
  return {
    clock: { now: () => now },
    setNow: (at: number) => {
      now = at;
      window.dispatchEvent(new Event('focus'));
    },
    read: () => JSON.parse(values.get(LOCAL_SNAPSHOT_KEY)!),
    storage: {
      getItem: (key: string) => {
        if (failRead) {
          failRead = false;
          throw Error('lectura de prueba');
        }
        return values.get(key) ?? null;
      },
      setItem: (key: string, value: string) => {
        if (key === LOCAL_SNAPSHOT_KEY && failWrite) {
          failWrite = false;
          if (scenario === 'expired-retry') now = start + 12 * H;
          throw Error('escritura de prueba');
        }
        values.set(key, value);
      },
    },
  };
}
const fixtures = new WeakMap<Element, ReturnType<typeof fixture>>();
function SunscreenPreview({ scenario = 'ordinary' }: { scenario?: Scenario }) {
  const [source] = useState(() => fixture(scenario));
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current!;
    fixtures.set(root, source);
    return () => {
      fixtures.delete(root);
    };
  }, [source]);
  const [router] = useState(() =>
    createMemoryRouter([{ path: '*', element: <AppRoutes persistOnboardingDraft={false} /> }], {
      initialEntries: ['/inicio/protector'],
    }),
  );
  return (
    <div ref={ref} data-testid="sunscreen-preview">
      <LocalProvider storage={source.storage} clock={source.clock}>
        <RouterProvider router={router} />
      </LocalProvider>
    </div>
  );
}
const meta = {
  title: 'Pantallas/Protector conectado',
  component: SunscreenPreview,
  parameters: {
    edgeToEdge: true,
    docs: {
      description: {
        component:
          'Pantallas reales con datos locales aislados. Política acordada: 60 minutos desde cada hora, recorte en la siguiente cita o cierre del día y contexto a mitad de la ventana efectiva. El reloj de pruebas se puede mover sin modificar el del dispositivo. No usa cámara ni envía notificaciones.',
      },
    },
  },
  args: { scenario: 'ordinary' },
} satisfies Meta<typeof SunscreenPreview>;
export default meta;
type Story = StoryObj<typeof meta>;
async function dialog(context: Parameters<NonNullable<Story['play']>>[0]) {
  const { canvas, userEvent } = context;
  await userEvent.tab();
  const button = await canvas.findByRole('button', { name: 'Registrar aplicación' });
  await waitFor(() => expect(button).toBeEnabled());
  await userEvent.click(button);
  return within(await canvas.findByRole('dialog', { name: '¿Te aplicaste protector?' }));
}
const driver = (canvasElement: HTMLElement) =>
  fixtures.get(canvasElement.querySelector('[data-testid="sunscreen-preview"]')!)!;
export const Ordinary: Story = {
  name: 'En horario · confirmación personal',
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('region', { name: 'En horario' })).toBeVisible();
    await expect(canvas.getByText('11:00–12:00', { exact: true })).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'Tomar foto' })).not.toBeInTheDocument();
  },
};
export const Context: Story = {
  name: 'Contexto · mitad de ventana',
  args: { scenario: 'context' },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('region', { name: 'Todavía estás a tiempo' }),
    ).toBeVisible();
    await expect(canvas.getByText('Aún puedes registrarla hasta las 12:00.')).toBeVisible();
  },
};
export const Registered: Story = {
  name: 'Confirmado · 2 de 3 y Deshacer',
  play: async (context) => {
    const confirm = await dialog(context);
    await context.userEvent.click(confirm.getByRole('button', { name: 'Confirmar aplicación' }));
    await expect(await context.canvas.findByText('2 de 3 aplicaciones registradas')).toBeVisible();
    await expect(context.canvas.getByText('Registro guardado')).toBeVisible();
    await expect(context.canvas.getByRole('button', { name: 'Deshacer' })).toBeVisible();
  },
};
export const ConfirmAndUndo: Story = {
  name: 'Deshacer no modifica las otras citas',
  play: async (context) => {
    await Registered.play!(context);
    await context.userEvent.click(context.canvas.getByRole('button', { name: 'Deshacer' }));
    await expect(await context.canvas.findByText('1 de 3 aplicaciones registradas')).toBeVisible();
    await expect(context.canvas.getByText('Registro deshecho.')).toBeVisible();
    await expect(
      context.canvas.getByRole('button', { name: 'Registrar aplicación' }),
    ).toBeEnabled();
  },
};
export const Cancel: Story = {
  name: 'Cancelar confirmación conserva el total',
  play: async (context) => {
    const confirm = await dialog(context);
    await context.userEvent.click(confirm.getByRole('button', { name: 'Cancelar' }));
    await expect(context.canvas.getByText('1 de 3 aplicaciones registradas')).toBeVisible();
    await expect(context.canvas.queryByText('Registro guardado')).not.toBeInTheDocument();
  },
};
export const Closed: Story = {
  name: 'Horario terminado · meta incompleta',
  args: { scenario: 'closed' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('region', { name: 'Horario terminado' })).toBeVisible();
    await expect(canvas.getByText('2 de 3 aplicaciones registradas')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Registro no disponible' })).toBeDisabled();
    await expect(canvas.getByText('Cerrada · Sin registro')).toBeVisible();
  },
};
export const Upcoming: Story = {
  name: 'Antes de apertura',
  args: { scenario: 'upcoming' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('region', { name: 'Próximo horario' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Registro no disponible' })).toBeDisabled();
    await expect(canvas.getByText('0 de 3 aplicaciones registradas')).toBeVisible();
  },
};
export const InitialOnly: Story = {
  name: 'Sin reaplicaciones · meta 1 de 1',
  args: { scenario: 'initial-only' },
  play: async (context) => {
    const confirm = await dialog(context);
    await context.userEvent.click(confirm.getByRole('button', { name: 'Confirmar aplicación' }));
    await expect(await context.canvas.findByText('1 de 1 aplicaciones registradas')).toBeVisible();
    await expect(
      context.canvas.queryByRole('button', { name: 'Registrar aplicación' }),
    ).not.toBeInTheDocument();
  },
};
export const WriteRetry: Story = {
  name: 'Reintentar guarda el mismo intento una vez',
  args: { scenario: 'write-error' },
  play: async (context) => {
    const confirm = await dialog(context);
    await context.userEvent.click(confirm.getByRole('button', { name: 'Confirmar aplicación' }));
    await confirm.findByText('Guardado sin confirmar');
    await expect(confirm.getByRole('button', { name: 'Confirmar aplicación' })).toBeDisabled();
    await context.userEvent.click(confirm.getByRole('button', { name: 'Reintentar guardado' }));
    await expect(await context.canvas.findByText('2 de 3 aplicaciones registradas')).toBeVisible();
  },
};
export const RetryExpired: Story = {
  name: 'El reintento vencido no salta de cita',
  args: { scenario: 'expired-retry' },
  play: async (context) => {
    const confirm = await dialog(context);
    await context.userEvent.click(confirm.getByRole('button', { name: 'Confirmar aplicación' }));
    await context.userEvent.click(
      await confirm.findByRole('button', { name: 'Reintentar guardado' }),
    );
    await expect(
      await confirm.findByText(
        'Este horario de protector terminó o cambió. Revisa la agenda antes de registrar.',
      ),
    ).toBeVisible();
    await expect(confirm.getByRole('button', { name: 'Confirmar aplicación' })).toBeDisabled();
    await expect(context.canvas.getByText('1 de 3 aplicaciones registradas')).toBeVisible();
  },
};
export const ClosedDuringConfirmation: Story = {
  name: 'Cierre mientras confirmas',
  play: async (context) => {
    const confirm = await dialog(context);
    driver(context.canvasElement).setNow(start + 12 * H);
    await waitFor(() =>
      expect(confirm.getByRole('button', { name: 'Confirmar aplicación' })).toBeDisabled(),
    );
    await expect(confirm.getByText(/Este horario ya terminó/)).toBeVisible();
    await context.userEvent.click(confirm.getByRole('button', { name: 'Cancelar' }));
    await expect(context.canvas.getByText('1 de 3 aplicaciones registradas')).toBeVisible();
  },
};
export const NewPlantDay: Story = {
  name: 'Cambio de día durante confirmación',
  play: async (context) => {
    const confirm = await dialog(context);
    driver(context.canvasElement).setNow(start + DAY_MS + 11 * H + 10 * M);
    await waitFor(() =>
      expect(confirm.getByRole('button', { name: 'Confirmar aplicación' })).toBeDisabled(),
    );
    await context.userEvent.click(confirm.getByRole('button', { name: 'Cancelar' }));
    await expect(context.canvas.getByText('0 de 3 aplicaciones registradas')).toBeVisible();
  },
};
export const ReadRecovery: Story = {
  name: 'Error de lectura · recuperar agenda',
  args: { scenario: 'read-error' },
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole('heading', { name: 'No pudimos recuperar tus datos' });
    await userEvent.click(canvas.getByRole('button', { name: 'Reintentar' }));
    await expect(await canvas.findByText('1 de 3 aplicaciones registradas')).toBeVisible();
  },
};
export const Legacy: Story = {
  name: 'Registro anterior · sin cita inventada',
  args: { scenario: 'legacy' },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText('1 registro anterior sin cita asociada. Se conserva en el total.'),
    ).toBeVisible();
    await expect(canvas.getByText('1 de 3 aplicaciones registradas')).toBeVisible();
  },
};
export const ProfileSchedule: Story = {
  name: 'Horario terminado · revisar Perfil',
  args: { scenario: 'closed' },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Revisar horarios en Perfil' }),
    );
    const modal = within(await canvas.findByRole('dialog', { name: 'Horarios de hábitos' }));
    await expect(modal.getByLabelText('Horario de protector 1')).toHaveValue('08:00');
    await expect(
      modal.getByText(
        'Los horarios nuevos comienzan el siguiente día de planta. Los registros y las ventanas de este día se conservan.',
      ),
    ).toBeVisible();
    await userEvent.click(modal.getByRole('button', { name: 'Cerrar' }));
    await expect(canvas.queryByRole('dialog')).not.toBeInTheDocument();
  },
};
export const RecordsNavigation: Story = {
  name: 'Historial filtrado y retorno a la agenda',
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Mis registros en Perfil' }));
    const history = within(await canvas.findByRole('main', { name: 'Mis registros' }));
    await expect(history.getByRole('group', { name: 'Aplicación inicial' })).toBeVisible();
    await userEvent.click(history.getByRole('button', { name: 'Volver' }));
    await expect(await canvas.findByRole('heading', { name: 'Protector solar' })).toBeVisible();
  },
};
export const LongAgenda: Story = {
  name: 'Trece citas · contenido desplazable',
  args: { scenario: 'long-agenda' },
  play: async ({ canvas }) => {
    await canvas.findByText('1 de 13 aplicaciones registradas');
    await expect(canvas.getByRole('button', { name: 'Registrar aplicación' })).toBeVisible();
  },
};
