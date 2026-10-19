import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { MonthNavigator } from './GardenPrimitives';

const meta = {
  title: 'Jardín/MonthNavigator',
  component: MonthNavigator,
  parameters: {
    designWidth: 370,
    docs: {
      description: {
        component:
          'Referencia: [HF / MonthNavigator](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=142-2266). Medidas, colores y recursos originales de Figma.',
      },
    },
  },
  args: { onPrevious: fn(), onNext: fn() },
} satisfies Meta<typeof MonthNavigator>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Available: Story = {};
export const NextDisabled: Story = { args: { nextDisabled: true } };
