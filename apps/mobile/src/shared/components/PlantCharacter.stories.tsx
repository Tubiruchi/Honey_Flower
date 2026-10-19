import type { Meta, StoryObj } from '@storybook/react-vite';
import { PlantCharacter } from './PlantCharacter';

const meta = {
  title: 'Planta/PlantCharacter',
  component: PlantCharacter,
  parameters: {
    designWidth: 320,
    docs: {
      description: {
        component:
          'Referencia: [HF / PlantCharacter](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=118-1864). Medidas, colores y recursos originales de Figma.',
      },
    },
  },
  args: { species: 'sprout', view: 'full' },
} satisfies Meta<typeof PlantCharacter>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Sprout: Story = {};
export const SproutFace: Story = { args: { view: 'face' } };
export const Cactus: Story = { args: { species: 'cactus' } };
export const CactusFace: Story = { args: { species: 'cactus', view: 'face' } };
