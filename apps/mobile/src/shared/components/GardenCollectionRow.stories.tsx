import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { GardenCollectionRow } from './GardenPrimitives';

const meta = {
  title: 'Jardín/GardenCollectionRow',
  component: GardenCollectionRow,
  parameters: {
    designWidth: 346,
    docs: {
      description: {
        component:
          'Referencia: [HF / GardenCollectionRow](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=142-2214). Medidas, colores y recursos originales de Figma.',
      },
    },
  },
  args: { onOpen: fn() },
} satisfies Meta<typeof GardenCollectionRow>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Cactus: Story = {};
export const Sprout: Story = {
  args: { name: 'Brote sarcástico', species: 'sprout', date: '18 oct · Ciclo completado' },
};
