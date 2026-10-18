import type { Meta, StoryObj } from '@storybook/react-vite';
import { demoWeek } from '../../stories/fixtures';
import { WeeklyGrid } from './WeeklyGrid';

const meta = {
  title: 'Hábitos/WeeklyGrid',
  component: WeeklyGrid,
  args: { days: demoWeek },
} satisfies Meta<typeof WeeklyGrid>;
export default meta;
type Story = StoryObj<typeof meta>;

export const InProgress: Story = {};
export const FirstDay: Story = {
  args: { days: demoWeek.map((day) => ({ ...day, state: day.day === 1 ? 'current' : 'future' })) },
};
export const ClosedWeek: Story = {
  args: { days: demoWeek.map((day) => ({ ...day, state: day.day === 2 ? 'missed' : 'complete' })) },
};
