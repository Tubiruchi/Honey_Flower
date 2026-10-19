import type { Meta, StoryObj } from '@storybook/react-vite';
import { OnboardingProgress } from './OnboardingProgress';

const meta = {
  title: 'Base/OnboardingProgress',
  component: OnboardingProgress,
  parameters: {
    designWidth: 354,
    docs: {
      description: {
        component:
          'Referencia: [HF / OnboardingProgress](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=67-958). Medidas, colores y recursos originales de Figma.',
      },
    },
  },
  args: { step: 1 },
} satisfies Meta<typeof OnboardingProgress>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Step1: Story = { args: { step: 1 } };
export const Step2: Story = { args: { step: 2 } };
export const Step3: Story = { args: { step: 3 } };
export const Step4: Story = { args: { step: 4 } };
export const Step5: Story = { args: { step: 5 } };
export const Step6: Story = { args: { step: 6 } };
