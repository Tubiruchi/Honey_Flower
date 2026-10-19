import type { Meta, StoryObj } from '@storybook/react-vite';
import { StreakBadge } from './StreakBadge';

const meta = {
  title: 'Hábitos/StreakBadge',
  component: StreakBadge,
  parameters: {
    designWidth: 144,
    docs: {
      description: {
        component:
          'Referencia: [HF / StreakBadge](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=67-959). Medidas, colores y recursos originales de Figma.',
      },
    },
  },
  args: { days: 2 },
} satisfies Meta<typeof StreakBadge>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
