import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { TimeRow } from './TimeRow';

const meta = {
  title: 'Base/TimeRow',
  component: TimeRow,
  parameters: {
    designWidth: 354,
    docs: {
      description: {
        component:
          'Referencia: [HF / TimeRow](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=67-839). Medidas, colores y recursos originales de Figma.',
      },
    },
  },
  args: { label: 'Recordatorio', value: '08:00', onChange: fn() },
} satisfies Meta<typeof TimeRow>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Normal: Story = {};
export const Focused: Story = { parameters: { referenceState: 'focused' } };
export const Disabled: Story = { args: { disabled: true } };
