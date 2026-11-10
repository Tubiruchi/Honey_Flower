import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { PreferencesDemo } from './PreferencesDemo';
import { figmaParameters } from './figma';
const meta = {
  title: 'Pantallas/Perfil objetivo',
  component: PreferencesDemo,
  parameters: {
    ...figmaParameters(
      '347:7494',
      402,
      'Preferencias de la versión objetivo con permisos y guardado simulados. No envía notificaciones ni cambia el Perfil local.',
    ),
    edgeToEdge: true,
  },
  args: {},
} satisfies Meta<typeof PreferencesDemo>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Notifications: Story = {};
export const Off: Story = { args: { initialReminders: false } };
export const PermissionDenied: Story = { args: { initialPermission: 'denied' } };
export const Sound: Story = { args: { initialSound: true } };
export const Flash: Story = { args: { initialFlash: true } };
export const Both: Story = { args: { initialSound: true, initialFlash: true } };
export const Calm: Story = { args: { initialPage: 'calm' } };
export const InvalidCalm: Story = {
  args: { initialPage: 'calm', invalidCalm: true },
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByRole('button', { name: 'Guardar' })).toBeDisabled();
    await userEvent.click(canvas.getByRole('button', { name: 'Usar 22:00–07:00' }));
    await expect(canvas.getByRole('button', { name: 'Guardar horas de calma' })).toBeEnabled();
  },
};
export const Schedule: Story = { args: { initialPage: 'schedule' } };
export const DailyLimit: Story = { args: { initialPage: 'limit' } };
export const Sources: Story = {
  args: { initialPage: 'sources' },
  parameters: figmaParameters('347:8288', 402),
};
export const Privacy: Story = {
  args: { initialPage: 'privacy' },
  parameters: figmaParameters('347:8346', 402),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-privacy-legal-ready]')).toHaveAttribute(
      'data-privacy-legal-ready',
      'false',
    );
  },
};
export const IndependentSignals: Story = {
  play: async ({ canvas, userEvent }) => {
    const sound = canvas.getByRole('switch', { name: 'Sonido reforzado' });
    const flash = canvas.getByRole('switch', { name: 'Señal breve de linterna' });
    await userEvent.click(sound);
    await expect(sound).toBeChecked();
    await expect(flash).not.toBeChecked();
    await userEvent.click(flash);
    await expect(sound).toBeChecked();
    await expect(flash).toBeChecked();
    await userEvent.click(sound);
    await expect(sound).not.toBeChecked();
    await expect(flash).toBeChecked();
    await userEvent.click(canvas.getByRole('switch', { name: 'Recibir recordatorios' }));
    await expect(
      canvas.queryByRole('switch', { name: 'Señal breve de linterna' }),
    ).not.toBeInTheDocument();
  },
};
