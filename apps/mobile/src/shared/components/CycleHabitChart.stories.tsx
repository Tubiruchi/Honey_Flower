import type { Meta, StoryObj } from '@storybook/react-vite';
import { CycleHabitChart } from './CycleHabitChart';
import { closedCycle, currentCycle } from '../../stories/fixtures/phase2';
import { figmaParameters } from '../../stories/figma';
const meta = {
  title: 'Análisis/CycleHabitChart',
  component: CycleHabitChart,
  parameters: figmaParameters('343:4240'),
  args: { ...closedCycle.water, kind: 'water', period: 'closed' },
} satisfies Meta<typeof CycleHabitChart>;
export default meta;
type Story = StoryObj<typeof meta>;
export const WaterClosed: Story = {};
export const WaterInProgress: Story = { args: { ...currentCycle.water, period: 'in-progress' } };
export const SunscreenClosed: Story = { args: { ...closedCycle.sunscreen, kind: 'sunscreen' } };
export const SunscreenInProgress: Story = {
  args: { ...currentCycle.sunscreen, kind: 'sunscreen', period: 'in-progress' },
};
