import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import { RegistrationConfirmation } from './RegistrationConfirmation';
import { figmaParameters } from '../../stories/figma';
const meta = {
  title: 'Cámara/RegistrationConfirmation',
  component: RegistrationConfirmation,
  parameters: figmaParameters('290:4135', 370),
  args: { value: '250', onChange: fn(), onConfirm: fn(), onRetrySave: fn(), onRetake: fn() },
} satisfies Meta<typeof RegistrationConfirmation>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Normal: Story = {};
export const Saving: Story = { args: { state: 'saving' } };
export const AmountError: Story = { args: { state: 'amount-error', value: '0' } };
export const SaveError: Story = { args: { state: 'save-error' } };
export const RetryPreservesAmount: Story = {
  args: { state: 'save-error', value: '250' },
  play: async ({ canvas, args, userEvent }) => {
    await expect(canvas.getByRole('textbox', { name: '¿Cuánta agua tomaste?' })).toBeDisabled();
    await expect(canvas.getByRole('textbox')).toHaveValue('250');
    await userEvent.click(canvas.getByRole('button', { name: 'Reintentar guardado' }));
    await expect(args.onRetrySave).toHaveBeenCalledOnce();
    await expect(args.onConfirm).not.toHaveBeenCalled();
  },
};
export const SavingLocked: Story = {
  args: { state: 'saving' },
  play: async ({ canvas, args, userEvent }) => {
    await expect(canvas.getByRole('button', { name: 'Volver a tomar' })).toBeDisabled();
    await expect(canvas.getByRole('textbox')).toBeDisabled();
    await userEvent.click(canvas.getByRole('button', { name: 'Cargando…' }));
    await expect(args.onConfirm).not.toHaveBeenCalled();
  },
};
