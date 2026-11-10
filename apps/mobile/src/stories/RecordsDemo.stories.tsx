import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';
import { RecordsDemo } from './RecordsDemo';
import { figmaParameters } from './figma';
const meta = {
  title: 'Pantallas/Registros',
  component: RecordsDemo,
  parameters: figmaParameters(
    '346:6677',
    370,
    'Operaciones aisladas con confirmaciones simuladas; no modifica datos de la app.',
  ),
  args: {},
} satisfies Meta<typeof RecordsDemo>;
export default meta;
type Story = StoryObj<typeof meta>;
export const List: Story = {};
export const Loading: Story = { args: { initialRead: 'loading' } };
export const EmptyClosedDay: Story = { args: { initialRead: 'empty', initialClosed: true } };
export const Readonly: Story = {
  args: { initialClosed: true },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('button', { name: /Opciones/ })).not.toBeInTheDocument();
  },
};
export const ReadingError: Story = {
  args: { initialRead: 'error' },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Reintentar' }));
    await expect((await canvas.findAllByText('Total: 1,250 de 2,000 mL'))[0]).toBeVisible();
  },
};
export const EditAndUndo: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Opciones de 250 mL de agua' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Editar' }));
    const field = canvas.getByRole('textbox', { name: 'Cantidad de agua (mL)' });
    await userEvent.clear(field);
    await userEvent.type(field, '400');
    await userEvent.click(canvas.getByRole('button', { name: 'Guardar' }));
    await expect(await canvas.findByText('Agua actualizada')).toBeVisible();
    await expect((await canvas.findAllByText('Total: 1,400 de 2,000 mL'))[0]).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Deshacer' }));
    await expect(await canvas.findByText('Cambio deshecho')).toBeVisible();
    await expect((await canvas.findAllByText('Total: 1,250 de 2,000 mL'))[0]).toBeVisible();
  },
};
export const DeleteAndUndo: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Opciones de 250 mL de agua' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Eliminar' }));
    await expect(await canvas.findByText('El total quedará en 1,000 mL.')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Eliminar' }));
    await expect(await canvas.findByText('Registro eliminado')).toBeVisible();
    await expect((await canvas.findAllByText('Total: 1,000 de 2,000 mL'))[0]).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Deshacer' }));
    await expect(await canvas.findByText('Cambio deshecho')).toBeVisible();
  },
};
export const RetrySameOperation: Story = {
  args: { failOnce: true },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Opciones de 250 mL de agua' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Eliminar' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Eliminar' }));
    await expect(await canvas.findByText('No se guardó en el dispositivo')).toBeVisible();
    await expect((await canvas.findAllByText('Total: 1,250 de 2,000 mL'))[0]).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Reintentar' }));
    await expect(await canvas.findByText('Registro eliminado')).toBeVisible();
    await expect((await canvas.findAllByText('Total: 1,000 de 2,000 mL'))[0]).toBeVisible();
  },
};
export const DayClosesWhileSaving: Story = {
  args: { closeDuringSave: true },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Opciones de 250 mL de agua' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Eliminar' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Eliminar' }));
    await expect(await canvas.findByText(/El día se cerró/)).toBeVisible();
    await expect(canvas.queryByRole('button', { name: /Opciones/ })).not.toBeInTheDocument();
    await expect(canvas.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
  },
};
export const OneOpenRowAndCancel: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Opciones de 250 mL de agua' }));
    await expect(canvas.getByRole('button', { name: 'Editar' })).toHaveFocus();
    await userEvent.click(canvas.getByRole('button', { name: 'Opciones de Aplicación inicial' }));
    await expect(canvas.getAllByRole('button', { name: 'Eliminar' })).toHaveLength(1);
    await expect(canvas.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Eliminar' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: 'Opciones de Aplicación inicial' })).toHaveFocus(),
    );
    const row = canvas.getByRole('group', { name: '250 mL de agua' });
    await expect(within(row).getByText('250 mL de agua')).toBeVisible();
  },
};
