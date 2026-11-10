import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { RecordFeedback } from './RecordFeedback';
import { figmaParameters } from '../../stories/figma';
const meta = {
  title: 'Registros/RecordFeedback',
  component: RecordFeedback,
  parameters: figmaParameters('226:3154', 370),
  args: { onAction: fn() },
} satisfies Meta<typeof RecordFeedback>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Updated: Story = {};
export const Deleted: Story = { args: { state: 'deleted' } };
export const Undone: Story = { args: { state: 'undone' } };
export const TemporaryError: Story = { args: { state: 'temporary-error' } };
