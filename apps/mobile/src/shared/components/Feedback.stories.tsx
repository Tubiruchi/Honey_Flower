import type { Meta, StoryObj } from '@storybook/react-vite';
import { Feedback } from './Feedback';

const meta = {
  title: 'Base/Feedback',
  component: Feedback,
  parameters: {
    designWidth: 354,
    docs: {
      description: {
        component:
          'Referencia: [HF / Feedback](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=67-877). Medidas, colores y recursos originales de Figma.',
      },
    },
  },
  args: {
    variant: 'info',
    title: 'Revisa tu correo',
    children: <p>Te enviaremos instrucciones para recuperar el acceso.</p>,
  },
} satisfies Meta<typeof Feedback>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Info: Story = {};
export const Success: Story = {
  args: {
    variant: 'success',
    title: 'Cambios guardados',
    children: <p>Tu configuración está lista.</p>,
  },
};
export const Warning: Story = {
  args: {
    variant: 'warning',
    title: 'Aún falta un paso',
    children: <p>Completa tu configuración.</p>,
  },
};
export const Error: Story = {
  args: {
    variant: 'error',
    title: 'No pudimos continuar',
    children: <p>Revisa los datos e inténtalo de nuevo.</p>,
  },
};
export const Neutral: Story = { args: { variant: 'neutral', title: 'Tú eliges el ritmo' } };
export const WithoutTitle: Story = { args: { variant: 'neutral', title: undefined } };
