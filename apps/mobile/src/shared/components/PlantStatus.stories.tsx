import type { Meta, StoryObj } from '@storybook/react-vite';
import { demoPlant } from '../../stories/fixtures';
import { PlantStatus } from './PlantStatus';

const meta = {
  title: 'Planta/PlantStatus',
  component: PlantStatus,
  args: demoPlant,
  parameters: {
    docs: {
      description: {
        component:
          'Estado recibido del dominio a partir de días cerrados. El icono es una representación provisional; no sustituye la ilustración final de Figma.',
      },
    },
  },
} satisfies Meta<typeof PlantStatus>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Healthy: Story = {};
export const Neglected: Story = {
  args: { health: 'neglected', message: 'Un poco de cuidado nos vendría bien.' },
};
export const Withered: Story = {
  args: { health: 'withered', message: 'Todavía podemos retomar nuestros cuidados.' },
};
export const Provisional: Story = { args: { provisional: true } };
export const LongName: Story = {
  args: {
    name: 'María de las Flores del Jardín',
    message: 'El nombre puede crecer tanto como tus hojas.',
  },
};
