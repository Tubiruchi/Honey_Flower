import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Input } from './Input';

const meta = {
  title: 'Base/Input',
  component: Input,
  args: { label: '¿Cómo quieres que te llame tu planta?', placeholder: 'Tu nombre' },
} satisfies Meta<typeof Input>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const Filled: Story = { args: { defaultValue: 'María José' } };
export const Error: Story = { args: { error: 'Escribe tu nombre para continuar.' } };
export const Disabled: Story = { args: { disabled: true, defaultValue: 'Alex' } };
export const PasswordVisibility: Story = {
  args: {
    label: 'Contraseña',
    type: 'password',
    defaultValue: 'ejemplo-local',
    autoComplete: 'new-password',
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Mostrar contraseña' }));
    await expect(canvas.getByLabelText('Contraseña', { exact: true })).toHaveAttribute(
      'type',
      'text',
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Ocultar contraseña' }));
    await expect(canvas.getByLabelText('Contraseña', { exact: true })).toHaveAttribute(
      'type',
      'password',
    );
  },
};
