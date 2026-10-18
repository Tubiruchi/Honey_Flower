import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import { CameraResult } from './CameraResult';

const meta = {
  title: 'Cámara/CameraResult',
  component: CameraResult,
  args: {
    outcome: 'identified',
    objectLabel: 'Envase de agua identificado',
    onConfirm: fn(),
    onRetry: fn(),
    onManual: fn(),
  },
  parameters: {
    docs: {
      description: {
        component:
          'Resultado visual simulado. No llama cámara, permisos, Roboflow ni YOLO. Identificar un envase nunca prueba la acción física.',
      },
    },
  },
} satisfies Meta<typeof CameraResult>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Identified: Story = {};
export const Uncertain: Story = { args: { outcome: 'uncertain' } };
export const NotFound: Story = { args: { outcome: 'not-found' } };
export const PermissionDenied: Story = {
  args: { outcome: 'permission-denied' },
  play: async ({ canvas, userEvent, args }) => {
    await expect(
      canvas.queryByRole('button', { name: 'Confirmo que realicé el hábito' }),
    ).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Registrar manualmente' }));
    await expect(args.onManual).toHaveBeenCalledTimes(1);
    await expect(args.onConfirm).not.toHaveBeenCalled();
  },
};
export const ConfirmDeclaration: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await expect(args.onConfirm).not.toHaveBeenCalled();
    await userEvent.click(canvas.getByRole('button', { name: 'Confirmo que realicé el hábito' }));
    await expect(args.onConfirm).toHaveBeenCalledTimes(1);
  },
};
