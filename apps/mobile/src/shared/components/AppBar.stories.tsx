import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { AppBar } from './AppBar';
import { IconButton } from './IconButton';

const meta = {
  title: 'Base/AppBar',
  component: AppBar,
  parameters: {
    designWidth: 354,
    docs: {
      description: {
        component:
          'Referencia: [HF / AppBar](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=67-1087). Medidas, colores y recursos originales de Figma.',
      },
    },
  },
  args: { title: 'HONEYFLOWER', onBack: fn() },
} satisfies Meta<typeof AppBar>;
export default meta;
type Story = StoryObj<typeof meta>;
export const WithBack: Story = {};
export const WithoutBack: Story = { args: { onBack: undefined } };
export const WithAction: Story = {
  args: { action: <IconButton label="Ajustes" icon="settings" /> },
};
