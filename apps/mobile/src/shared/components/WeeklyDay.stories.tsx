import type { Meta, StoryObj } from '@storybook/react-vite';
import { WeeklyDay } from './WeeklyDay';

const meta = {
  title: 'Hábitos/WeeklyDay',
  component: WeeklyDay,
  parameters: {
    designWidth: 48,
    docs: {
      description: {
        component:
          'Referencia: [HF / WeeklyDay](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=67-977). Medidas, colores y recursos originales de Figma.',
      },
    },
  },
  args: { day: 3, state: 'current' },
} satisfies Meta<typeof WeeklyDay>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Current: Story = {};
export const Complete: Story = { args: { day: 2, state: 'complete' } };
export const Future: Story = { args: { day: 4, state: 'future' } };
