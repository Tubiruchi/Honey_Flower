import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { NavigationItem } from './BottomNavigation';

const meta = {
  title: 'Base/Building Blocks/NavigationItem',
  component: NavigationItem,
  parameters: {
    designWidth: 110,
    docs: {
      description: {
        component:
          'Referencia: [HF / NavigationItem](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=67-990). Medidas, colores y recursos originales de Figma.',
      },
    },
  },
  args: { label: 'Inicio', icon: 'home', onClick: fn() },
} satisfies Meta<typeof NavigationItem>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Active: Story = { args: { active: true } };
export const Inactive: Story = {};
