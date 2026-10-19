import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProfileStat } from './ProfilePrimitives';

const meta = {
  title: 'Base/ProfileStat',
  component: ProfileStat,
  parameters: {
    designWidth: 118,
    docs: {
      description: {
        component:
          'Referencia: [HF / ProfileStat](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=153-2267). Medidas, colores y recursos originales de Figma.',
      },
    },
  },
  args: {},
} satisfies Meta<typeof ProfileStat>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
