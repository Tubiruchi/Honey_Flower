import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import { WaterCaptureDemo } from './WaterCaptureDemo';
import { figmaParameters } from './figma';
const meta = {
  title: 'Pantallas/Agua con fotografía',
  component: WaterCaptureDemo,
  parameters: figmaParameters(
    '290:4135',
    370,
    'Captura y guardado simulados con una imagen estática. Nunca solicita permisos, usa hardware ni guarda fotos.',
  ),
  args: { onSaveAttempt: fn() },
} satisfies Meta<typeof WaterCaptureDemo>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Capture: Story = {};
export const PermissionDenied: Story = {
  args: { permissionDenied: true },
  play: async ({ canvas, args, userEvent }) => {
    await expect(
      canvas.queryByRole('button', { name: 'Registrar manualmente' }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole('button', { name: 'Revisar cantidad' }),
    ).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Salir sin registrar' }));
    await expect(canvas.getByText('Saliste sin registrar')).toBeVisible();
    await expect(args.onSaveAttempt).not.toHaveBeenCalled();
  },
};
export const InconclusiveAfterCapture: Story = {
  args: { inconclusive: true },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Tomar foto' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Revisar cantidad' }));
    await expect(canvas.getByRole('textbox')).toHaveValue('250');
  },
};
export const RetryDoesNotDuplicate: Story = {
  args: { failOnce: true },
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Tomar foto' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Revisar registro' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Confirmar y guardar' }));
    await expect(await canvas.findByRole('button', { name: 'Reintentar guardado' })).toBeVisible();
    await expect(canvas.getByRole('textbox')).toBeDisabled();
    await expect(canvas.getByRole('textbox')).toHaveValue('250');
    await userEvent.click(canvas.getByRole('button', { name: 'Reintentar guardado' }));
    await expect(await canvas.findByText('Registro guardado')).toBeVisible();
    await expect(args.onSaveAttempt).toHaveBeenCalledTimes(2);
    await expect(args.onSaveAttempt).toHaveBeenNthCalledWith(1, { id: 'capture-1', amount: 250 });
    await expect(args.onSaveAttempt).toHaveBeenNthCalledWith(2, { id: 'capture-1', amount: 250 });
  },
};
