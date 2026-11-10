import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../../app/App';
import { createSnapshot, LOCAL_SNAPSHOT_KEY } from '../../shared/data/localSnapshot';
import type { LocalStoragePort } from '../../shared/data/localRepository';
import { createOnboardingDraft } from '../onboarding/model';
import { LocalProvider } from './LocalProvider';
import { createLocalState, LOCAL_STORAGE_KEY } from './model';

const now = Date.UTC(2026, 10, 8, 17, 30);
function RecoveryDemo({
  scenario = 'write',
  route = '/inicio',
}: {
  scenario?: 'write' | 'read' | 'migration' | 'start';
  route?: string;
}) {
  const [storage] = useState<LocalStoragePort>(() => {
    const state = createLocalState(now, {
      ...createOnboardingDraft('America/Cancun'),
      preferredName: 'Alex',
    });
    const values = new Map<string, string>(
      scenario === 'start'
        ? []
        : [
            [
              scenario === 'migration' ? LOCAL_STORAGE_KEY : LOCAL_SNAPSHOT_KEY,
              JSON.stringify(scenario === 'migration' ? state : createSnapshot(state)),
            ],
          ],
    );
    let failRead = scenario === 'read';
    let failWrite = scenario === 'write' || scenario === 'start';
    return {
      getItem(key) {
        if (failRead) {
          failRead = false;
          throw new Error('Lectura de prueba');
        }
        return values.get(key) ?? null;
      },
      setItem(key, value) {
        if (failWrite) {
          failWrite = false;
          throw new Error('Escritura de prueba');
        }
        values.set(key, value);
      },
    };
  });
  return (
    <MemoryRouter
      initialEntries={[
        scenario === 'start'
          ? {
              pathname: '/onboarding/resumen',
              state: {
                draft: {
                  ...createOnboardingDraft('America/Cancun'),
                  preferredName: 'Invitado',
                },
              },
            }
          : route,
      ]}
    >
      <LocalProvider storage={storage} referenceNow={now}>
        <AppRoutes persistOnboardingDraft={false} />
      </LocalProvider>
    </MemoryRouter>
  );
}
const meta = {
  title: 'Pantallas/Persistencia local',
  component: RecoveryDemo,
  parameters: { edgeToEdge: true },
  args: { scenario: 'write', route: '/inicio' },
} satisfies Meta<typeof RecoveryDemo>;
export default meta;
type Story = StoryObj<typeof meta>;

export const RetryQuickRecord: Story = {
  name: 'Registro rápido · fallo y reintento',
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: '+250 mL' }));
    await expect(await canvas.findByText('Guardado sin confirmar')).toBeVisible();
    await expect(canvas.getByText('0 mL', { exact: true })).toBeVisible();
    await expect(canvas.queryByText('250 mL registrados.')).not.toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: '+250 mL' })).toBeDisabled();
    await userEvent.click(canvas.getByRole('button', { name: 'Reintentar guardado' }));
    await expect(await canvas.findByText('250 mL registrados.')).toBeVisible();
    await userEvent.click(canvas.getByRole('link', { name: 'Ver todos los registros' }));
    const history = within(await canvas.findByRole('main', { name: 'Mis registros' }));
    await expect(history.getAllByRole('group', { name: '250 mL de agua' })).toHaveLength(1);
    await userEvent.click(history.getByRole('button', { name: 'Volver' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Deshacer' }));
    await expect(await canvas.findByText('0 mL', { exact: true })).toBeVisible();
  },
};
export const RetryManualEntry: Story = {
  name: 'Cantidad manual · recuperación del formulario',
  args: { route: '/inicio/agua' },
  play: async ({ canvas, userEvent }) => {
    const form = within(await canvas.findByRole('main', { name: 'Registro manual de agua' }));
    const input = form.getByRole('textbox', { name: 'Cantidad en mL' });
    await userEvent.clear(input);
    await userEvent.type(input, '375');
    await userEvent.click(form.getByRole('button', { name: 'Confirmar registro' }));
    await expect(await canvas.findByText('Guardado sin confirmar')).toBeVisible();
    await expect(input).toHaveValue('375');
    await expect(input).toBeDisabled();
    await expect(form.getByRole('button', { name: 'Volver' })).toBeDisabled();
    await userEvent.click(canvas.getByRole('button', { name: 'Reintentar guardado' }));
    await expect(await form.findByText('Registro guardado')).toBeVisible();
    await expect(form.getByText('375 mL', { exact: true })).toBeVisible();
    await userEvent.click(form.getByRole('button', { name: 'Ver mis registros' }));
    const history = within(await canvas.findByRole('main', { name: 'Mis registros' }));
    await expect(history.getAllByRole('group', { name: '375 mL de agua' })).toHaveLength(1);
  },
};
export const DiscardManualEntry: Story = {
  name: 'Cerrar intento · conserva la cantidad escrita',
  args: { route: '/inicio/agua' },
  play: async ({ canvas, userEvent }) => {
    const form = within(await canvas.findByRole('main', { name: 'Registro manual de agua' }));
    const input = form.getByRole('textbox', { name: 'Cantidad en mL' });
    await userEvent.clear(input);
    await userEvent.type(input, '375');
    await userEvent.click(form.getByRole('button', { name: 'Confirmar registro' }));
    await userEvent.click(await canvas.findByRole('button', { name: 'Cerrar intento' }));
    await waitFor(() => expect(input).toBeEnabled());
    await expect(input).toHaveValue('375');
    await expect(form.getByText('0 mL', { exact: true })).toBeVisible();
  },
};
export const ReadRecovery: Story = {
  name: 'Error de lectura · protege el perfil',
  args: { scenario: 'read', route: '/' },
  play: async ({ canvas, userEvent }) => {
    await expect(
      await canvas.findByRole('heading', { name: 'No pudimos recuperar tus datos' }),
    ).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'Ya tengo cuenta' })).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Reintentar' }));
    await expect(await canvas.findByRole('heading', { name: 'Hola, Alex' })).toBeVisible();
  },
};
export const MigrationEntry: Story = {
  name: 'Perfil anterior · entra sin otra activación',
  args: { scenario: 'migration', route: '/' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { name: 'Hola, Alex' })).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'Ya tengo cuenta' })).not.toBeInTheDocument();
  },
};
export const DoubleTap: Story = {
  name: 'Doble toque · un solo registro',
  args: { scenario: 'migration' },
  play: async ({ canvas, userEvent }) => {
    await userEvent.dblClick(await canvas.findByRole('button', { name: '+250 mL' }));
    await expect(await canvas.findByText('250 mL registrados.')).toBeVisible();
    await userEvent.click(canvas.getByRole('link', { name: 'Ver todos los registros' }));
    const history = within(await canvas.findByRole('main', { name: 'Mis registros' }));
    await expect(history.getAllByRole('group', { name: '250 mL de agua' })).toHaveLength(1);
    await userEvent.click(history.getByRole('button', { name: 'Volver' }));
    await expect(canvas.getByText('250 mL', { exact: true })).toBeVisible();
  },
};
export const ProfileRecovery: Story = {
  name: 'Perfil · confirma el nombre después de guardar',
  args: { route: '/perfil' },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: /Editar perfil/ }));
    const dialog = within(canvas.getByRole('dialog'));
    const input = dialog.getByRole('textbox', { name: 'Tu nombre preferido' });
    await userEvent.clear(input);
    await userEvent.type(input, 'Noemí');
    await userEvent.click(dialog.getByRole('button', { name: 'Guardar cambios' }));
    await expect(await dialog.findByText('Guardado sin confirmar')).toBeVisible();
    await expect(canvas.getByRole('heading', { name: 'Alex' })).toBeInTheDocument();
    await expect(input).toHaveValue('Noemí');
    await userEvent.click(dialog.getByRole('button', { name: 'Reintentar guardado' }));
    await expect(await canvas.findByRole('heading', { name: 'Noemí' })).toBeVisible();
  },
};
export const SkipWaitsForStorage: Story = {
  name: 'Sin cuenta · entra tras confirmar el guardado',
  args: { scenario: 'start', route: '/onboarding/resumen' },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Continuar sin cuenta' }));
    await expect(await canvas.findByText('Guardado sin confirmar')).toBeVisible();
    await expect(canvas.queryByRole('heading', { name: /Hola,/ })).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole('button', { name: 'Continuar sin cuenta' }),
    ).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Reintentar guardado' }));
    await expect(await canvas.findByRole('heading', { name: 'Hola, Invitado' })).toBeVisible();
    await expect(canvas.getByText('0 mL', { exact: true })).toBeVisible();
  },
};
