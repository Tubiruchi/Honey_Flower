import type { Meta, StoryObj } from '@storybook/react-vite';
import { InfoCard } from './InfoCard';
import { Icon } from './Icon';

const meta = {
  title: 'Base/InfoCard',
  component: InfoCard,
  parameters: {
    designWidth: 354,
    docs: {
      description: {
        component:
          'Referencia: [HF / InfoCard](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=67-902). Medidas, colores y recursos originales de Figma.',
      },
    },
  },
  args: {
    title: 'Registra, cuida y colecciona',
    icon: <Icon name="leaf" inheritColor />,
    children: <p>Dos hábitos, siete días y una planta para tu jardín.</p>,
  },
} satisfies Meta<typeof InfoCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Water: Story = {
  args: {
    variant: 'water',
    title: 'Agua',
    icon: <Icon name="drop" inheritColor />,
    children: <p>Lleva un registro de tu consumo de agua.</p>,
  },
};
export const Sunscreen: Story = {
  args: {
    variant: 'sunscreen',
    title: 'Protector solar',
    icon: <Icon name="sun" inheritColor />,
    children: <p>Registra la aplicación inicial y tus reaplicaciones.</p>,
  },
};
export const Plant: Story = {
  args: {
    variant: 'plant',
    title: 'Un jardín que cuenta tu historia',
    children: <p>Alcanza la meta del ciclo para que tu planta se quede en el jardín.</p>,
  },
};
