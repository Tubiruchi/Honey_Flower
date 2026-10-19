import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { BottomNavigation } from './BottomNavigation';

const meta = {
  title: 'Base/BottomNavigation',
  component: BottomNavigation,
  parameters: {
    designWidth: 354,
    docs: {
      description: {
        component:
          'Referencia: [HF / BottomNavigation](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=67-1066). Medidas, colores y recursos originales de Figma.',
      },
    },
  },
  args: { active: 'home', onNavigate: fn() },
} satisfies Meta<typeof BottomNavigation>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Home: Story = {};
export const Garden: Story = { args: { active: 'garden' } };
export const Profile: Story = { args: { active: 'profile' } };
