import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import { RecordDelete } from './RecordDelete';
import { figmaParameters } from '../../stories/figma';
const meta = {
  title: 'Registros/RecordDelete',
  component: RecordDelete,
  parameters: figmaParameters('226:3097', 370),
  args: { onCancel: fn(), onDelete: fn() },
} satisfies Meta<typeof RecordDelete>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Confirmation: Story = {};
export const Deleting: Story = { args: { state: 'deleting' } };
export const LockedWhileDeleting: Story = {
  args: { state: 'deleting' },
  play: async ({ canvas, args, userEvent }) => {
    await expect(canvas.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    await userEvent.click(canvas.getByRole('button', { name: 'Cargando…' }));
    await expect(args.onDelete).not.toHaveBeenCalled();
  },
};
