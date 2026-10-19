import type { Meta, StoryObj } from '@storybook/react-vite';
import { GreenhouseScene } from './GardenPrimitives';

const meta = {
  title: 'Jardín/GreenhouseScene',
  component: GreenhouseScene,
  parameters: {
    designWidth: 338,
    docs: {
      description: {
        component:
          'Referencia: [HF / GreenhouseScene](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=131-2175). Medidas, colores y recursos originales de Figma.',
      },
    },
  },
  args: {},
} satisfies Meta<typeof GreenhouseScene>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
