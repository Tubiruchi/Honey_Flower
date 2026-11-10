import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import { AsyncContentState } from './AsyncContentState';
import { figmaParameters } from '../../stories/figma';
const meta = {
  title: 'Base/AsyncContentState',
  component: AsyncContentState,
  parameters: figmaParameters('343:4576'),
  args: { state: 'loading' },
} satisfies Meta<typeof AsyncContentState>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Loading: Story = {};
export const Error: Story = { args: { state: 'error' } };
export const Empty: Story = { args: { state: 'empty' } };
export const Retry: Story = {
  args: { state: 'error', onRetry: fn() },
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Reintentar' }));
    await expect(args.onRetry).toHaveBeenCalledOnce();
  },
};
