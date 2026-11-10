import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within, waitFor } from 'storybook/test';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AppRoutes } from '../../app/App';
import { LocalProvider } from '../local/LocalProvider';
import { createLocalState, DAY_MS } from '../local/model';
import { createOnboardingDraft } from '../onboarding/model';
import { createSnapshot, LOCAL_SNAPSHOT_KEY } from '../../shared/data/localSnapshot';
import type { LocalStoragePort } from '../../shared/data/localRepository';

const start = Date.UTC(2026, 9, 26, 17);
const now = start + DAY_MS + 6 * 3_600_000;
function RecordsApp({
  route = '/perfil/registros',
  scenario = 'ready',
}: {
  route?: string;
  scenario?: 'ready' | 'empty' | 'write-error' | 'read-error' | 'loading' | 'sunscreen';
}) {
  const [storage] = useState<LocalStoragePort>(() => {
    const state = createLocalState(start, {
      ...createOnboardingDraft('America/Cancun'),
      preferredName: 'Alex',
    });
    state.events =
      scenario === 'empty'
        ? []
        : [
            { id: 'old', kind: 'water', amount: 2000, at: start + 1000 },
            { id: 'water-1', kind: 'water', amount: 500, at: start + DAY_MS + 90 * 60_000 },
            { id: 'water-2', kind: 'water', amount: 500, at: start + DAY_MS + 190 * 60_000 },
            { id: 'water-3', kind: 'water', amount: 250, at: start + DAY_MS + 330 * 60_000 },
            { id: 'sun-1', kind: 'sunscreen', amount: 1, at: start + DAY_MS + 30 * 60_000 },
            ...(scenario === 'sunscreen'
              ? [
                  {
                    id: 'sun-2',
                    kind: 'sunscreen' as const,
                    amount: 1,
                    at: start + DAY_MS + 120 * 60_000,
                  },
                ]
              : []),
          ];
    const values = new Map([[LOCAL_SNAPSHOT_KEY, JSON.stringify(createSnapshot(state))]]);
    let failWrite = scenario === 'write-error';
    let failRead = scenario === 'read-error';
    let loading = scenario === 'loading';
    return {
      async getItem(key) {
        if (loading) {
          loading = false;
          await new Promise((resolve) => setTimeout(resolve, 700));
        }
        if (failRead) {
          failRead = false;
          throw Error('lectura');
        }
        return values.get(key) ?? null;
      },
      setItem(key, value) {
        if (failWrite) {
          failWrite = false;
          throw Error('guardado');
        }
        values.set(key, value);
      },
    };
  });
  const [router] = useState(() =>
    createMemoryRouter([{ path: '*', element: <AppRoutes persistOnboardingDraft={false} /> }], {
      initialEntries: [route],
    }),
  );
  return (
    <LocalProvider storage={storage} referenceNow={now}>
      <RouterProvider router={router} />
    </LocalProvider>
  );
}
const meta = {
  title: 'Pantallas/Registros conectados',
  component: RecordsApp,
  parameters: { edgeToEdge: true },
  args: { route: '/perfil/registros', scenario: 'ready' },
} satisfies Meta<typeof RecordsApp>;
export default meta;
type Story = StoryObj<typeof meta>;
async function records(canvas: ReturnType<typeof within>) {
  return within(await canvas.findByRole('main', { name: 'Mis registros' }));
}
export const List: Story = {
  name: 'Lista con datos locales',
  play: async ({ canvas }) => {
    const view = await records(canvas);
    await expect(view.getByText('1,250 mL', { exact: true })).toBeVisible();
    await expect(
      canvas.queryByRole('navigation', { name: 'Navegación principal' }),
    ).not.toBeInTheDocument();
  },
};
export const EditAndUndo: Story = {
  name: 'Editar 1,250 → 1,400 y deshacer',
  play: async ({ canvas, userEvent }) => {
    const view = await records(canvas);
    await userEvent.click(view.getByRole('button', { name: 'Opciones de 250 mL de agua' }));
    await userEvent.click(view.getByRole('button', { name: 'Editar' }));
    const input = view.getByRole('textbox', { name: 'Cantidad de agua (mL)' });
    await expect(input).toHaveFocus();
    await userEvent.clear(input);
    await userEvent.type(input, '400');
    await expect(view.getByText('1,250 mL', { exact: true })).toBeVisible();
    await userEvent.click(view.getByRole('button', { name: 'Guardar' }));
    await expect(await view.findByText('1,400 mL', { exact: true })).toBeVisible();
    await userEvent.click(view.getByRole('button', { name: 'Deshacer' }));
    await expect(await view.findByText('1,250 mL', { exact: true })).toBeVisible();
  },
};
export const DeleteAndUndo: Story = {
  name: 'Eliminar 1,250 → 1,000 → 1,250',
  play: async ({ canvas, userEvent }) => {
    const view = await records(canvas);
    const open = async () => {
      await userEvent.click(view.getByRole('button', { name: 'Opciones de 250 mL de agua' }));
      await userEvent.click(view.getByRole('button', { name: 'Eliminar' }));
    };
    await open();
    await expect(view.getByText('1,250 mL', { exact: true })).toBeVisible();
    await userEvent.click(view.getByRole('button', { name: 'Cancelar' }));
    await expect(view.getByText('1,250 mL', { exact: true })).toBeVisible();
    await open();
    await userEvent.click(view.getByRole('button', { name: 'Eliminar' }));
    await expect(await view.findByText('1,000 mL', { exact: true })).toBeVisible();
    await userEvent.click(view.getByRole('button', { name: 'Deshacer' }));
    await expect(await view.findByText('1,250 mL', { exact: true })).toBeVisible();
  },
};
export const Filters: Story = {
  name: 'Filtros y una fila abierta',
  play: async ({ canvas, userEvent }) => {
    const view = await records(canvas);
    await userEvent.click(view.getByRole('radio', { name: 'Protector' }));
    await expect(view.getByRole('group', { name: 'Aplicación inicial' })).toBeVisible();
    await expect(view.queryByRole('group', { name: '250 mL de agua' })).not.toBeInTheDocument();
    await userEvent.click(view.getByRole('button', { name: 'Opciones de Aplicación inicial' }));
    await expect(view.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
    await userEvent.click(view.getByRole('radio', { name: 'Agua' }));
    await userEvent.click(view.getByRole('button', { name: 'Opciones de 250 mL de agua' }));
    await userEvent.click(view.getAllByRole('button', { name: 'Opciones de 500 mL de agua' })[0]!);
    await expect(view.getAllByRole('button', { name: 'Editar' })).toHaveLength(1);
  },
};
export const InvalidAmount: Story = {
  name: 'Cantidad inválida y cancelar',
  play: async ({ canvas, userEvent }) => {
    const view = await records(canvas);
    await userEvent.click(view.getByRole('button', { name: 'Opciones de 250 mL de agua' }));
    await userEvent.click(view.getByRole('button', { name: 'Editar' }));
    const input = view.getByRole('textbox', { name: 'Cantidad de agua (mL)' });
    await userEvent.clear(input);
    await userEvent.type(input, '0');
    await expect(view.getByRole('button', { name: 'Guardar' })).toBeDisabled();
    await userEvent.click(view.getByRole('button', { name: 'Cancelar' }));
    await expect(view.getByText('1,250 mL', { exact: true })).toBeVisible();
  },
};
export const ClosedDay: Story = {
  name: 'Día cerrado · consulta y límites',
  args: { route: '/perfil/registros?dia=0' },
  play: async ({ canvas, userEvent }) => {
    const view = await records(canvas);
    await expect(view.getByText('Día cerrado · solo lectura')).toBeVisible();
    await expect(view.queryByRole('button', { name: /Opciones de/ })).not.toBeInTheDocument();
    await expect(view.getByRole('button', { name: 'Día anterior' })).toBeDisabled();
    await userEvent.click(view.getByRole('button', { name: 'Día siguiente' }));
    await expect(await view.findByText('1,250 mL', { exact: true })).toBeVisible();
    await expect(view.getByRole('button', { name: 'Día siguiente' })).toBeDisabled();
  },
};
export const SaveRecovery: Story = {
  name: 'Fallo al guardar · reintentar el mismo cambio',
  args: { scenario: 'write-error' },
  play: async ({ canvas, userEvent }) => {
    const view = await records(canvas);
    await userEvent.click(view.getByRole('button', { name: 'Opciones de 250 mL de agua' }));
    await userEvent.click(view.getByRole('button', { name: 'Editar' }));
    const input = view.getByRole('textbox', { name: 'Cantidad de agua (mL)' });
    await userEvent.clear(input);
    await userEvent.type(input, '400');
    await userEvent.click(view.getByRole('button', { name: 'Guardar' }));
    await expect(await view.findByText('Guardado sin confirmar')).toBeVisible();
    await expect(input).toHaveValue('400');
    await expect(input).toBeDisabled();
    await expect(view.getByText('1,250 mL', { exact: true })).toBeVisible();
    await expect(view.getByRole('button', { name: 'Volver' })).toBeDisabled();
    await userEvent.click(view.getByRole('button', { name: 'Reintentar' }));
    await expect(await view.findByText('1,400 mL', { exact: true })).toBeVisible();
    await expect(view.getAllByRole('group', { name: '400 mL de agua' })).toHaveLength(1);
  },
};
export const DiscardPending: Story = {
  name: 'Cerrar intento conserva el borrador',
  args: { scenario: 'write-error' },
  play: async ({ canvas, userEvent }) => {
    const view = await records(canvas);
    await userEvent.click(view.getByRole('button', { name: 'Opciones de 250 mL de agua' }));
    await userEvent.click(view.getByRole('button', { name: 'Editar' }));
    const input = view.getByRole('textbox', { name: 'Cantidad de agua (mL)' });
    await userEvent.clear(input);
    await userEvent.type(input, '400');
    await userEvent.click(view.getByRole('button', { name: 'Guardar' }));
    await userEvent.click(await view.findByRole('button', { name: 'Cerrar intento' }));
    await waitFor(() => expect(input).toBeEnabled());
    await expect(input).toHaveValue('400');
    await expect(view.getByText('1,250 mL', { exact: true })).toBeVisible();
  },
};
export const HomeReturn: Story = {
  name: 'Inicio → Registros → cancelar → volver',
  args: { route: '/inicio' },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('link', { name: 'Ver todos los registros' }));
    const view = await records(canvas);
    await userEvent.click(view.getByRole('button', { name: 'Opciones de 250 mL de agua' }));
    await userEvent.click(view.getByRole('button', { name: 'Editar' }));
    await userEvent.click(view.getByRole('button', { name: 'Volver' }));
    await expect(view.queryByRole('textbox')).not.toBeInTheDocument();
    await userEvent.click(view.getByRole('button', { name: 'Volver' }));
    await expect(await canvas.findByRole('heading', { name: 'Hola, Alex' })).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'Ver todos los registros' })).toHaveFocus();
  },
};
export const ProfileReturn: Story = {
  name: 'Perfil → Registros → Perfil',
  args: { route: '/perfil' },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: /Ver mis registros/ }));
    const view = await records(canvas);
    await userEvent.click(view.getByRole('button', { name: 'Volver' }));
    await expect(await canvas.findByRole('heading', { name: 'Perfil' })).toBeVisible();
  },
};
export const DirectReturn: Story = {
  name: 'Entrada directa · volver a Perfil',
  play: async ({ canvas, userEvent }) => {
    const view = await records(canvas);
    await userEvent.click(view.getByRole('button', { name: 'Volver' }));
    await expect(await canvas.findByRole('heading', { name: 'Perfil' })).toBeVisible();
  },
};
export const SunscreenClassification: Story = {
  name: 'Eliminar inicial reclasifica; deshacer restaura',
  args: { scenario: 'sunscreen' },
  play: async ({ canvas, userEvent }) => {
    const view = await records(canvas);
    await userEvent.click(view.getByRole('radio', { name: 'Protector' }));
    await userEvent.click(view.getByRole('button', { name: 'Opciones de Aplicación inicial' }));
    await userEvent.click(view.getByRole('button', { name: 'Eliminar' }));
    await userEvent.click(view.getByRole('button', { name: 'Eliminar' }));
    await expect(await view.findByText('1 de 3', { exact: true })).toBeVisible();
    await expect(view.getByRole('group', { name: 'Aplicación inicial' })).toBeVisible();
    await expect(
      view.queryByRole('group', { name: 'Reaplicación de protector' }),
    ).not.toBeInTheDocument();
    await userEvent.click(view.getByRole('button', { name: 'Deshacer' }));
    await expect(
      await view.findByRole('group', { name: 'Reaplicación de protector' }),
    ).toBeVisible();
    await expect(view.getByText('2 de 3', { exact: true })).toBeVisible();
  },
};
export const Empty: Story = {
  name: 'Sin registros',
  args: { scenario: 'empty' },
  play: async ({ canvas }) => {
    const view = await records(canvas);
    await expect(view.getByRole('heading', { name: 'Todavía no hay registros' })).toBeVisible();
  },
};
export const ReadRecovery: Story = {
  name: 'Error de lectura y recuperación',
  args: { scenario: 'read-error' },
  play: async ({ canvas, userEvent }) => {
    await expect(
      await canvas.findByRole('heading', { name: 'No pudimos recuperar tus datos' }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Reintentar' }));
    await expect(await canvas.findByRole('heading', { name: 'Mis registros' })).toBeVisible();
  },
};
export const Loading: Story = {
  name: 'Lectura asíncrona',
  args: { scenario: 'loading' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { name: 'Cargando tus datos' })).toBeVisible();
    await expect(await canvas.findByRole('heading', { name: 'Mis registros' })).toBeVisible();
  },
};
export const ManualWaterRoute: Story = {
  name: 'Ruta de agua · entrada manual funcional',
  args: { route: '/inicio/agua' },
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole('heading', { name: 'Registrar agua' });
    const input = canvas.getByRole('textbox', { name: 'Cantidad en mL' });
    await userEvent.clear(input);
    await userEvent.type(input, '375');
    await userEvent.click(canvas.getByRole('button', { name: 'Confirmar registro' }));
    await expect(await canvas.findByText('Registro guardado')).toBeVisible();
    await expect(
      within(canvas.getByRole('main', { name: 'Registro manual de agua' })).getByText('1,625 mL', {
        exact: true,
      }),
    ).toBeVisible();
  },
};
