import type { Meta, StoryObj } from '@storybook/react-vite';
import { GardenBackdrop } from './GardenPrimitives';

const meta = {
  title: 'Jardín/GardenBackdrop',
  component: GardenBackdrop,
  parameters: {
    designWidth: 370,
    docs: {
      description: {
        component:
          'Referencia: [HF / GardenBackdrop](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=142-2206). Medidas, colores y recursos originales de Figma.',
      },
    },
  },
  args: {},
} satisfies Meta<typeof GardenBackdrop>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
