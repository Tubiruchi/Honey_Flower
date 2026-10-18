import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { HomeDemo } from '../features/home/HomeDemo';

const meta = {
  title: 'Pantallas/Inicio de demostración',
  component: HomeDemo,
  parameters: {
    docs: {
      description: {
        component:
          'Composición de los componentes reales con fixtures locales. No persiste registros, sincroniza ni modifica ciclos reales.',
      },
    },
  },
} satisfies Meta<typeof HomeDemo>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const RegisterWater: Story = {
  play: async ({ canvas, userEvent }) => {
    const progress = canvas.getByRole('progressbar', { name: 'Progreso del día' });
    await expect(progress).toHaveValue(12.5);
    await userEvent.click(canvas.getByRole('button', { name: 'Registrar +250 mL' }));
    await expect(canvas.getByText('750 / 2,000 mL')).toBeVisible();
    await expect(progress).toHaveValue(18.75);
    await expect(canvas.getByText('Saludable')).toBeVisible();
  },
};
