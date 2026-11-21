import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import { SyncStatus } from './SyncStatus';

const meta = {
  title: 'Sincronización/SyncStatus',
  component: SyncStatus,
  args: { state: 'synced', onRetry: fn() },
  parameters: {
    docs: {
      description: {
        component:
          'Estado real de la outbox local y su confirmación con Supabase. Los cambios permanecen en SQLite hasta recibir respuesta.',
      },
    },
  },
} satisfies Meta<typeof SyncStatus>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Synced: Story = {};
export const Pending: Story = { args: { state: 'pending', pendingCount: 2 } };
export const Offline: Story = { args: { state: 'offline', pendingCount: 3 } };
export const ErrorAndRetry: Story = {
  args: { state: 'error', pendingCount: 1 },
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Reintentar sincronización' }));
    await expect(args.onRetry).toHaveBeenCalledTimes(1);
  },
};
