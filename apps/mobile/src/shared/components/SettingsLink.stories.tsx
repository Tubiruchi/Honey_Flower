import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { SettingsLink } from './ProfilePrimitives';

const meta = {
  title: 'Base/SettingsLink',
  component: SettingsLink,
  parameters: {
    designWidth: 370,
    docs: {
      description: {
        component:
          'Referencia: [HF / SettingsLink](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=153-2286). Medidas, colores y recursos originales de Figma.',
      },
    },
  },
  args: { onClick: fn() },
} satisfies Meta<typeof SettingsLink>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Normal: Story = {};
export const Caution: Story = { args: { caution: true } };
