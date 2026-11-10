import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { AnalysisDemo } from './AnalysisDemo';
import { figmaParameters } from './figma';
const meta = {
  title: 'Pantallas/Análisis actualizado',
  component: AnalysisDemo,
  parameters: {
    ...figmaParameters(
      '144:3075',
      402,
      'Mes y ciclo independientes. Densidades de referencia; sin definir un algoritmo de distribución.',
    ),
    edgeToEdge: true,
  },
  args: { count: 4 },
} satisfies Meta<typeof AnalysisDemo>;
export default meta;
type Story = StoryObj<typeof meta>;
export const FourPlants: Story = {};
export const Empty: Story = { args: { count: 0 } };
export const OnePlant: Story = { args: { count: 1 } };
export const TwoPlants: Story = { args: { count: 2 } };
export const FivePlants: Story = { args: { count: 5 } };
export const Loading: Story = { args: { initialRead: 'loading' } };
export const ReadingError: Story = {
  args: { initialRead: 'error' },
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.queryByText('88.1 %')).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Reintentar' }));
    await expect(canvas.getByRole('img', { name: 'Jardín con 4 plantas vivas' })).toBeVisible();
  },
};
export const IndependentSelections: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Mes anterior' }));
    await expect(canvas.getByText('Agosto 2026')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Mes siguiente' }));
    await expect(canvas.getByText('Septiembre 2026')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Mes siguiente' }));
    await expect(canvas.getByText('Octubre 2026')).toBeVisible();
    await expect(canvas.getByText('88.1 %')).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Ver ciclo en curso' }));
    await expect(canvas.getByText('34.5 %')).toBeVisible();
    await expect(canvas.getByText('Octubre 2026')).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Mes anterior' }));
    await expect(canvas.getByText('Septiembre 2026')).toBeVisible();
    await expect(canvas.getByText('34.5 %')).toBeInTheDocument();
  },
};
