import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Stepper } from './Stepper';

const meta = {
  title: 'Base/Stepper',
  component: Stepper,
  parameters: {
    designWidth: 354,
    docs: {
      description: {
        component:
          'Referencia: [HF / Stepper](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=67-817). Medidas, colores y recursos originales de Figma.',
      },
    },
  },
  args: {
    label: 'Reaplicaciones',
    value: 2,
    unit: 'reaplicaciones',
    min: 0,
    max: 6,
    onChange: fn(),
  },
} satisfies Meta<typeof Stepper>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Normal: Story = {};
export const Minimum: Story = { args: { value: 0 } };
export const Disabled: Story = { args: { disabled: true } };
export const Water: Story = {
  args: {
    variant: 'water',
    label: 'Meta diaria',
    value: 2000,
    unit: 'mL',
    step: 250,
    min: 250,
    max: 6000,
  },
};
