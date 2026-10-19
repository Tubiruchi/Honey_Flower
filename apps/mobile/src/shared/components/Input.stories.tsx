import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Input } from './Input';

const meta = {
  title: 'Base/Input',
  component: Input,
  parameters: { designWidth: 354 },
  args: { label: 'Nombre', placeholder: 'Tu nombre', help: 'Puedes cambiarlo después.' },
} satisfies Meta<typeof Input>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const Filled: Story = { args: { defaultValue: 'Alex' } };
export const Focused: Story = {
  args: { defaultValue: 'Alex' },
  parameters: { referenceState: 'focused' },
};
export const Email: Story = {
  args: {
    label: 'Correo electrónico',
    type: 'email',
    placeholder: 'tu@correo.com',
    help: 'Puedes cambiarlo después.',
  },
};
export const EmailFilled: Story = {
  args: {
    label: 'Correo electrónico',
    type: 'email',
    defaultValue: 'alex@correo.com',
    help: 'Puedes cambiarlo después.',
  },
};
export const EmailFocused: Story = {
  args: {
    label: 'Correo electrónico',
    type: 'email',
    defaultValue: 'alex@correo.com',
    help: 'Puedes cambiarlo después.',
  },
  parameters: { referenceState: 'focused' },
};
export const EmailError: Story = {
  args: {
    label: 'Correo electrónico',
    type: 'email',
    defaultValue: 'alex@correo',
    error: 'Revisa tu correo electrónico.',
  },
};
export const EmailDisabled: Story = {
  args: {
    label: 'Correo electrónico',
    type: 'email',
    defaultValue: 'alex@correo.com',
    disabled: true,
    help: 'Puedes cambiarlo después.',
  },
};
export const Password: Story = {
  args: {
    label: 'Contraseña',
    type: 'password',
    placeholder: 'Tu contraseña',
    help: 'Al menos 8 caracteres.',
  },
};
export const PasswordFilled: Story = {
  args: {
    label: 'Contraseña',
    type: 'password',
    defaultValue: 'ejemplo-local',
    help: 'Al menos 8 caracteres.',
  },
};
export const PasswordFocused: Story = {
  args: {
    label: 'Contraseña',
    type: 'password',
    defaultValue: 'ejemplo-local',
    help: 'Al menos 8 caracteres.',
  },
  parameters: { referenceState: 'focused' },
};
export const PasswordError: Story = {
  args: {
    label: 'Contraseña',
    type: 'password',
    defaultValue: 'corta',
    error: 'Usa al menos 8 caracteres.',
  },
};
export const PasswordDisabled: Story = {
  args: {
    label: 'Contraseña',
    type: 'password',
    defaultValue: 'ejemplo-local',
    disabled: true,
    help: 'Al menos 8 caracteres.',
  },
};
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
