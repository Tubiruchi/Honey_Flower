import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import { DetectionResultActions } from './DetectionResultActions';
import { figmaParameters } from '../../stories/figma';
const meta = {
  title: 'Cámara/DetectionResultActions',
  component: DetectionResultActions,
  parameters: figmaParameters('265:3621', 370),
  args: { onReview: fn(), onRetake: fn() },
} satisfies Meta<typeof DetectionResultActions>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Normal: Story = {};
export const Loading: Story = { args: { state: 'loading' } };
export const Disabled: Story = { args: { state: 'disabled' } };
export const LoadingLocked: Story = {
  args: { state: 'loading' },
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Cargando…' }));
    await expect(args.onReview).not.toHaveBeenCalled();
    await expect(canvas.getByRole('button', { name: 'Volver a tomar' })).toBeDisabled();
  },
};
