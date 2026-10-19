import type { Meta, StoryObj } from '@storybook/react-vite';
import { Plant } from './Plant';

const meta = {
  title: 'Planta/Plant',
  component: Plant,
  parameters: {
    designWidth: 320,
    docs: {
      description: {
        component:
          'Referencia: [HF / Plant](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=65-794). Medidas, colores y recursos originales de Figma.',
      },
    },
  },
  args: { eyes: 'open' },
} satisfies Meta<typeof Plant>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Open: Story = {};
export const Closed: Story = { args: { eyes: 'closed' } };
