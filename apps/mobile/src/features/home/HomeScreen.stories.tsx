import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AppRoutes } from '../../app/App';
import { LocalProvider } from '../local/LocalProvider';
import { createLocalState, DAY_MS } from '../local/model';
import { createOnboardingDraft } from '../onboarding/model';
import type { PlantHealth } from '@honeyflower/contracts';

function HomeRoutes() {
  const [router] = useState(() =>
    createMemoryRouter([{ path: '*', element: <AppRoutes persistOnboardingDraft={false} /> }], {
      initialEntries: ['/inicio'],
    }),
  );
  return <RouterProvider router={router} />;
}
function HomeApp({
  species = 'sprout',
  care = 'healthy',
  fresh = false,
  name = 'Alex',
  water = 1000,
}: {
  species?: 'sprout' | 'cactus';
  care?: PlantHealth;
  fresh?: boolean;
  name?: string;
  water?: number;
}) {
  const start = care === 'healthy' ? Date.UTC(2026, 9, 16, 17) : Date.UTC(2026, 10, 2, 17);
  const now = start + (fresh ? 0 : 2 * DAY_MS) + 1000;
  const state = createLocalState(
    fresh ? now : start,
    { ...createOnboardingDraft('America/Cancun'), preferredName: name },
    species,
  );
  if (!fresh) {
    for (let day = 0; day < 3; day++) {
      state.events.push({
        id: `w${day}`,
        kind: 'water',
        amount: day === 2 ? water : care === 'withered' ? 1000 : 2000,
        at: start + day * DAY_MS + 1000,
      });
      for (let i = 0; i < (day === 2 ? 1 : care === 'healthy' ? 3 : 0); i++)
        state.events.push({
          id: `s${day}-${i}`,
          kind: 'sunscreen',
          amount: 1,
          at: start + day * DAY_MS + 1000,
        });
    }
  }
  return (
    <LocalProvider
      key={`${species}-${care}-${fresh}-${name}-${water}`}
      initialState={state}
      referenceNow={now}
      persist={false}
    >
      <HomeRoutes />
    </LocalProvider>
  );
}
const meta = {
  title: 'Pantallas/Inicio conectado',
  component: HomeApp,
  parameters: { edgeToEdge: true },
  args: { species: 'sprout', care: 'healthy', fresh: false, name: 'Alex' },
} satisfies Meta<typeof HomeApp>;
export default meta;
type Story = StoryObj<typeof meta>;
const labels = { healthy: 'saludable', neglected: 'descuidada', withered: 'marchita' };
function checkPlant(species: 'sprout' | 'cactus', care: PlantHealth): Story['play'] {
  return async ({ canvas }) => {
    const body = await canvas.findByRole('img', {
      name: `${species === 'sprout' ? 'Brote' : 'Cactus'} ${labels[care]}`,
    });
    const calendar = within(canvas.getByRole('region', { name: 'Calendario del ciclo' }));
    const selected = calendar
      .getAllByRole('button')
      .find((button) => button.getAttribute('aria-pressed') === 'true')!;
    const face = selected.querySelector('.hf-character--face');
    await expect(face).toHaveClass(`hf-character--${care}`);
    await expect(face?.querySelector('img')?.getAttribute('src')).toEqual(
      body.querySelector('img')?.getAttribute('src'),
    );
  };
}
export const SproutHealthy: Story = {
  name: 'Brote saludable',
  play: checkPlant('sprout', 'healthy'),
};
export const CactusHealthy: Story = {
  name: 'Cactus saludable',
  args: { species: 'cactus' },
  play: checkPlant('cactus', 'healthy'),
};
export const SproutNeglected: Story = {
  name: 'Brote descuidada · 50 % cerrado',
  args: { care: 'neglected' },
  play: checkPlant('sprout', 'neglected'),
};
export const CactusNeglected: Story = {
  name: 'Cactus descuidada · 50 % cerrado',
  args: { species: 'cactus', care: 'neglected' },
  play: checkPlant('cactus', 'neglected'),
};
export const SproutWithered: Story = {
  name: 'Brote marchita · 25 % cerrado',
  args: { care: 'withered' },
  play: checkPlant('sprout', 'withered'),
};
export const CactusWithered: Story = {
  name: 'Cactus marchita · 25 % cerrado',
  args: { species: 'cactus', care: 'withered' },
  play: checkPlant('cactus', 'withered'),
};
export const FirstEntry: Story = {
  name: 'Primera entrada sin registros',
  args: { fresh: true },
  play: async ({ canvas }) => {
    await canvas.findByRole('img', { name: 'Brote saludable' });
    await expect(canvas.getByText('0 mL', { exact: true })).toBeVisible();
    await expect(canvas.getByText('Racha: 0 días')).toBeVisible();
  },
};
export const ConsultClosed: Story = {
  name: 'Día cerrado y retorno desde Registros',
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole('img', { name: 'Brote saludable' });
    const calendar = within(canvas.getByRole('region', { name: 'Calendario del ciclo' }));
    const buttons = calendar.getAllByRole('button');
    await userEvent.click(buttons[0]!);
    await expect(canvas.getByText('2,000 mL', { exact: true })).toBeVisible();
    await expect(canvas.getByRole('button', { name: '+250 mL' })).toBeDisabled();
    await expect(buttons[2]).toHaveAttribute('aria-current', 'date');
    await userEvent.click(canvas.getByRole('link', { name: 'Ver todos los registros' }));
    const records = within(await canvas.findByRole('main', { name: 'Mis registros' }));
    await expect(records.getByText('Día cerrado · solo lectura')).toBeVisible();
    await userEvent.click(records.getByRole('button', { name: 'Volver' }));
    await expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
  },
};
export const ConsultFuture: Story = {
  name: 'Día futuro de consulta',
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole('img', { name: 'Brote saludable' });
    const calendar = within(canvas.getByRole('region', { name: 'Calendario del ciclo' }));
    await userEvent.click(calendar.getAllByRole('button')[3]!);
    await expect(canvas.getByRole('button', { name: '+250 mL' })).toBeDisabled();
    await expect(canvas.getByText('0 mL', { exact: true })).toBeVisible();
    await userEvent.click(
      calendar
        .getAllByRole('button')
        .find((button) => button.getAttribute('aria-current') === 'date')!,
    );
    await expect(canvas.getByText('1,000 mL', { exact: true })).toBeVisible();
  },
};
export const QuickRecordsAndUndo: Story = {
  name: 'Agua y protector · deshacer solo el último registro',
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: '+250 mL' }));
    await expect(canvas.getByText('1,250 mL', { exact: true })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: /Registrar\s*protector/ }));
    await userEvent.click(await canvas.findByRole('button', { name: 'Registrar aplicación' }));
    const confirmation = within(
      await canvas.findByRole('dialog', { name: '¿Te aplicaste protector?' }),
    );
    await userEvent.click(confirmation.getByRole('button', { name: 'Confirmar aplicación' }));
    await userEvent.click(await canvas.findByRole('button', { name: 'Volver a Inicio' }));
    await expect(canvas.getByText('2 de 3', { exact: true })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: '+250 mL' }));
    await expect(canvas.getByText('1,500 mL', { exact: true })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Deshacer' }));
    await expect(canvas.getByText('1,250 mL', { exact: true })).toBeVisible();
    await expect(canvas.getByText('2 de 3', { exact: true })).toBeVisible();
  },
};
export const ExceedGoal: Story = {
  name: 'Volumen real y salud hasta el cierre',
  args: { care: 'neglected', water: 10000 },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: '+250 mL' }));
    await expect(await canvas.findByText('10,250 mL', { exact: true })).toBeVisible();
    await expect(canvas.getByRole('progressbar', { name: 'Meta de agua' })).toHaveAttribute(
      'value',
      '1',
    );
    await expect(canvas.getByRole('img', { name: 'Brote descuidada' })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Deshacer' }));
    await expect(canvas.getByText('10,000 mL', { exact: true })).toBeVisible();
  },
};
export const LongName: Story = {
  name: 'Nombre largo',
  args: { name: 'María Fernanda de los Ángeles Rodríguez Hernández' },
};
