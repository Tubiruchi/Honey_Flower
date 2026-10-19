import type { Meta, StoryObj } from '@storybook/react-vite';
import { CalendarDay } from './CalendarDay';

const meta = {
  title: 'Hábitos/CalendarDay',
  component: CalendarDay,
  parameters: {
    designWidth: 48,
    docs: {
      description: {
        component:
          'Referencia: [HF / CalendarDay](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=118-1943). Medidas, colores y recursos originales de Figma.',
      },
    },
  },
  args: { day: 'Dom', date: '18', state: 'complete' },
} satisfies Meta<typeof CalendarDay>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Complete: Story = { args: { state: 'complete', selected: false } };
export const CompleteSelected: Story = { args: { state: 'complete', selected: true } };
export const Partial: Story = { args: { state: 'partial', selected: false } };
export const PartialSelected: Story = { args: { state: 'partial', selected: true } };
export const Missed: Story = { args: { state: 'missed', selected: false } };
export const MissedSelected: Story = { args: { state: 'missed', selected: true } };
export const Future: Story = { args: { state: 'future', selected: false } };
export const FutureSelected: Story = { args: { state: 'future', selected: true } };
export const Today: Story = { args: { today: true, selected: true } };
