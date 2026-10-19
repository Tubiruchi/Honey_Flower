import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ToneSelector } from './ToneSelector';

const meta = {
  title: 'Base/ToneSelector',
  component: ToneSelector,
  parameters: {
    designWidth: 354,
    docs: {
      description: {
        component:
          'Referencia: [HF / ToneSelector](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=66-1065). Medidas, colores y recursos originales de Figma.',
      },
    },
  },
  args: { value: 'gentle', onChange: fn() },
} satisfies Meta<typeof ToneSelector>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Gentle: Story = {};
export const Medium: Story = { args: { value: 'medium' } };
export const Intense: Story = { args: { value: 'intense' } };
