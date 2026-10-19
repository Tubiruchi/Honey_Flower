import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { IconButton } from './IconButton';

const meta = {
  title: 'Base/IconButton',
  component: IconButton,
  parameters: {
    designWidth: 354,
    docs: {
      description: {
        component:
          'Referencia: [HF / IconButton](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=66-811). Medidas, colores y recursos originales de Figma.',
      },
    },
  },
  args: { label: 'Volver', onClick: fn() },
} satisfies Meta<typeof IconButton>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Normal: Story = {};
export const Pressed: Story = { parameters: { referenceState: 'pressed' } };
export const Focused: Story = { parameters: { referenceState: 'focused' } };
export const Disabled: Story = { args: { disabled: true } };
