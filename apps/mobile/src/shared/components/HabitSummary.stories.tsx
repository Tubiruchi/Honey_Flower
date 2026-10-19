import type { Meta, StoryObj } from '@storybook/react-vite';
import { HabitSummary } from './HabitSummary';

const meta = {
  title: 'Hábitos/HabitSummary',
  component: HabitSummary,
  parameters: {
    designWidth: 354,
    docs: {
      description: {
        component:
          'Referencia: [HF / HabitSummary](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=67-915). Medidas, colores y recursos originales de Figma.',
      },
    },
  },
  args: { kind: 'water', value: '1,000 / 2,000 mL' },
} satisfies Meta<typeof HabitSummary>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Water: Story = {};
export const Sunscreen: Story = { args: { kind: 'sunscreen', value: '1 / 3 aplicaciones' } };
