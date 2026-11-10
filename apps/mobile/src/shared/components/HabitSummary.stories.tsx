import type { Meta, StoryObj } from '@storybook/react-vite';
import { HabitSummary } from './HabitSummary';

const meta = {
  title: 'Hábitos/HabitSummary',
  component: HabitSummary,
  parameters: {
    designWidth: 354,
    docs: {
      description: {
        component:
          'Referencia: [HF / HabitSummary](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=67-915). Medidas, colores y recursos originales de Figma.',
      },
    },
  },
  args: { kind: 'water', value: '1,000 / 2,000 mL' },
} satisfies Meta<typeof HabitSummary>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Water: Story = {};
export const Sunscreen: Story = { args: { kind: 'sunscreen', value: '1 / 3 aplicaciones' } };
export const WaterMetric: Story = {
  name: 'Métrica de Inicio · Agua',
  args: {
    layout: 'metric',
    value: '1,000 mL',
    progress: 0.5,
    children: <p className="hf-type-caption">Meta: 2,000 mL</p>,
  },
};
export const SunscreenMetric: Story = {
  name: 'Métrica de Inicio · Protector',
  args: {
    kind: 'sunscreen',
    label: 'Protector',
    layout: 'metric',
    value: '1 de 3',
    progress: 1 / 3,
    children: <p className="hf-type-caption">1 inicial + 2 reaplic.</p>,
  },
};
