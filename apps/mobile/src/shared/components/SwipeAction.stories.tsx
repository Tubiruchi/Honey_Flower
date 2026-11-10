import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { SwipeAction } from './SwipeAction';
import { figmaParameters } from '../../stories/figma';
const meta = {
  title: 'Registros/SwipeAction',
  component: SwipeAction,
  parameters: figmaParameters('225:2870', 80),
  args: { action: 'edit', onClick: fn() },
} satisfies Meta<typeof SwipeAction>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Edit: Story = {};
export const EditPressed: Story = { parameters: { referenceState: 'pressed' } };
export const EditDisabled: Story = { args: { disabled: true } };
export const Delete: Story = { args: { action: 'delete' } };
export const DeletePressed: Story = {
  args: { action: 'delete' },
  parameters: { referenceState: 'pressed' },
};
export const DeleteDisabled: Story = { args: { action: 'delete', disabled: true } };
