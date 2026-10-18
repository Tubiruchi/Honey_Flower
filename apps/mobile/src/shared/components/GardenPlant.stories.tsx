import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { GardenPlant } from './GardenPlant';

const meta = {
  title: 'Jardín/GardenPlant',
  component: GardenPlant,
  args: {
    name: 'Margarita',
    species: 'Margarita',
    cycleLabel: 'Ciclo de ejemplo',
    result: 'survived',
    onOpen: fn(),
  },
} satisfies Meta<typeof GardenPlant>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Alive: Story = {};
export const WitheredHistory: Story = { args: { result: 'withered' } };
