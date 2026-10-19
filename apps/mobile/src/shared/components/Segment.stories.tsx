import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Segment } from './ToneSelector';

const meta = {
  title: 'Base/Building Blocks/Segment',
  component: Segment,
  parameters: {
    designWidth: 110,
    docs: {
      description: {
        component:
          'Referencia: [HF / Segment](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=66-1043). Medidas, colores y recursos originales de Figma.',
      },
    },
  },
  args: { label: 'Medio', checked: false, onChange: fn() },
} satisfies Meta<typeof Segment>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Normal: Story = {};
export const Selected: Story = { args: { checked: true } };
export const Disabled: Story = { args: { disabled: true } };
