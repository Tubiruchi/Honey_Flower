import type { Meta, StoryObj } from '@storybook/react-vite';
import { CycleProgressSummary } from './CycleProgressSummary';
import { closedCycle, currentCycle } from '../../stories/fixtures/phase2';
import { figmaParameters } from '../../stories/figma';
const meta = {
  title: 'Análisis/CycleProgressSummary',
  component: CycleProgressSummary,
  parameters: figmaParameters('343:4387'),
  args: { ...closedCycle.summary, state: 'closed' },
} satisfies Meta<typeof CycleProgressSummary>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Closed: Story = {};
export const InProgress: Story = { args: { ...currentCycle.summary, state: 'in-progress' } };
