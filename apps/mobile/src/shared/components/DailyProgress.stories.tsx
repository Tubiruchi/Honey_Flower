import type { Meta, StoryObj } from '@storybook/react-vite';
import { DailyProgress } from './DailyProgress';

const meta = {
  title: 'Hábitos/DailyProgress',
  component: DailyProgress,
  args: { value: 37.5 },
} satisfies Meta<typeof DailyProgress>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = { args: { value: 0 } };
export const Partial: Story = {};
export const Complete: Story = { args: { value: 100 } };
export const Provisional: Story = { args: { provisional: true } };
