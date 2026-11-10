import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AppRoutes } from '../../app/App';
import { LocalProvider } from '../local/LocalProvider';
import { createSnapshot, LOCAL_SNAPSHOT_KEY } from '../../shared/data/localSnapshot';
import { memoryStorage } from '../../shared/data/localRepository';
import { analysisFixture } from '../../stories/fixtures/analysis';
import { GardenScene } from './GardenScene';
import { GardenCollectionList } from './GardenCollectionList';
import { collectionDate, gardenPlants, monthBounds } from './model';

function AnalysisRoutes() {
  const [router] = useState(() =>
    createMemoryRouter([{ path: '*', element: <AppRoutes persistOnboardingDraft={false} /> }], {
      initialEntries: ['/analisis'],
    }),
  );
  return <RouterProvider router={router} />;
}
function AnalysisApp({
  count = 4,
  archived = false,
  scenario = 'ready',
  variableGoals = false,
}: {
  count?: number;
  archived?: boolean;
  scenario?: 'ready' | 'loading' | 'read-error';
  variableGoals?: boolean;
}) {
  const [{ state, now, storage }] = useState(() => {
    const fixture = analysisFixture(count, archived ? [1] : []);
    if (variableGoals) fixture.state.goals.push({ day: count * 7 + 1, water: 1000, sunscreen: 2 });
    const source = memoryStorage({
      [LOCAL_SNAPSHOT_KEY]: JSON.stringify(createSnapshot(fixture.state)),
    });
    let fail = scenario === 'read-error';
    return {
      ...fixture,
      storage: {
        ...source,
        getItem(key: string) {
          if (scenario === 'loading') return new Promise<string | null>(() => {});
          if (fail) {
            fail = false;
            throw new Error('Lectura de prueba');
          }
          return source.getItem(key);
        },
      },
    };
  });
  return (
    <LocalProvider
      initialState={state}
      referenceNow={now}
      persist={scenario !== 'ready'}
      storage={storage}
    >
      <AnalysisRoutes />
    </LocalProvider>
  );
}
const meta = {
  title: 'Pantallas/Análisis conectado',
  component: AnalysisApp,
  parameters: { edgeToEdge: true },
  args: { count: 4, archived: false, scenario: 'ready' },
} satisfies Meta<typeof AnalysisApp>;
export default meta;
type Story = StoryObj<typeof meta>;
const scene = (count: number) => new RegExp(`Jardín de .*: ${count} planta`);
function checkCount(count: number): Story['play'] {
  return async ({ canvas }) => {
    const garden = await canvas.findByRole('group', { name: scene(count) });
    await expect(within(garden).queryAllByRole('button')).toHaveLength(count);
    const image = garden.querySelector('img')!;
    await waitFor(() => expect(image.naturalWidth).toBeGreaterThan(0));
    if (count)
      await expect(
        canvas.getByRole('region', { name: 'Plantas ganadas' }).querySelectorAll('button'),
      ).toHaveLength(count);
  };
}
export const Empty: Story = {
  name: 'Instalación nueva · jardín sin plantas',
  args: { count: 0 },
  play: async (context) => {
    await checkCount(0)!(context);
    await expect(context.canvas.getByRole('button', { name: 'Mes anterior' })).toBeDisabled();
    await expect(context.canvas.getByRole('button', { name: 'Mes siguiente' })).toBeDisabled();
    await expect(
      context.canvas.queryByRole('button', { name: 'Ver último ciclo cerrado' }),
    ).not.toBeInTheDocument();
  },
};
export const One: Story = { name: 'Una planta', args: { count: 1 }, play: checkCount(1) };
export const Two: Story = { name: 'Dos plantas', args: { count: 2 }, play: checkCount(2) };
export const Four: Story = { name: 'Cuatro plantas', play: checkCount(4) };
export const Five: Story = { name: 'Cinco plantas', args: { count: 5 }, play: checkCount(5) };
export const RealProgress: Story = {
  name: '88.1 % cerrado · 34.5 % en curso',
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Ver progreso de mi ciclo' }));
    const panel = within(canvas.getByRole('region', { name: 'Progreso de tu ciclo' }));
    await expect(panel.getByText('88.1 %', { exact: true })).toBeVisible();
    await userEvent.click(panel.getByRole('button', { name: 'Ver ciclo en curso' }));
    await expect(panel.getByText('34.5 %', { exact: true })).toBeVisible();
    await expect(panel.getAllByLabelText(/pendiente, día futuro/)).toHaveLength(8);
    await expect(panel.getAllByLabelText(/en curso · meta/)).toHaveLength(2);
  },
};
export const IndependentSelections: Story = {
  name: 'Mes independiente · planta abre su ciclo · retorno',
  play: async ({ canvas, userEvent }) => {
    const patio = await canvas.findByRole('group', { name: scene(4) });
    await userEvent.click(
      within(patio).getByRole('button', { name: 'Ver progreso de Brote, ciclo 1' }),
    );
    await waitFor(() => expect(canvas.getByLabelText('Progreso del ciclo 1')).toHaveFocus());
    await userEvent.click(canvas.getByRole('button', { name: 'Mes anterior' }));
    await expect(canvas.getByText('Agosto de 2026')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Mes anterior' })).toBeDisabled();
    await userEvent.click(canvas.getByRole('button', { name: 'Ver progreso de mi ciclo' }));
    await waitFor(() => expect(canvas.getByLabelText('Progreso del ciclo 1')).toHaveFocus());
    await userEvent.click(canvas.getByRole('button', { name: 'Ver ciclo en curso' }));
    await expect(canvas.getByText('Agosto de 2026')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Mes siguiente' }));
    await expect(canvas.getByRole('button', { name: 'Mes siguiente' })).toBeDisabled();
    await expect(
      canvas.getByLabelText('Progreso del ciclo 5').querySelector('.hf-cycle-summary'),
    ).toHaveTextContent('34.5 %');
  },
};
export const Archive: Story = {
  name: 'Marchitas fuera del patio · ciclo correcto',
  args: { archived: true },
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole('group', { name: scene(3) });
    await userEvent.click(canvas.getByRole('radio', { name: 'Marchitas' }));
    await expect(canvas.queryByRole('group', { name: /Jardín de/ })).not.toBeInTheDocument();
    const list = within(canvas.getByRole('region', { name: 'Plantas archivadas' }));
    await userEvent.click(list.getByRole('button', { name: /Cactus · Ciclo 2/ }));
    await waitFor(() => expect(canvas.getByLabelText('Progreso del ciclo 2')).toHaveFocus());
    await expect(canvas.getByText('0.0 %', { exact: true })).toBeVisible();
    await expect(canvas.getByRole('radio', { name: 'Marchitas' })).toBeChecked();
    await userEvent.click(canvas.getByRole('radio', { name: 'Vivas' }));
    const garden = canvas.getByRole('group', { name: scene(3) });
    await expect(
      [...garden.querySelectorAll('[data-slot]')].map((node) => node.getAttribute('data-slot')),
    ).toEqual(['0', '2', '3']);
  },
};
export const Loading: Story = {
  name: 'Lectura pendiente · sin métricas inventadas',
  args: { scenario: 'loading' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Cargando tus datos')).toBeVisible();
    await expect(canvas.queryByRole('group', { name: /Jardín de/ })).not.toBeInTheDocument();
  },
};
export const ReadRecovery: Story = {
  name: 'Fallo de lectura y recuperación de la colección',
  args: { scenario: 'read-error' },
  play: async ({ canvas, userEvent }) => {
    await expect(await canvas.findByText('No pudimos recuperar tus datos')).toBeVisible();
    await expect(canvas.queryByText('Tu jardín está por florecer')).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Reintentar' }));
    await canvas.findByRole('group', { name: scene(4) });
  },
};

export const HistoricalGoals: Story = {
  name: 'Metas históricas distintas en una semana',
  args: { variableGoals: true },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Ver progreso de mi ciclo' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Ver ciclo en curso' }));
    await expect(canvas.getByText(/Metas diarias históricas: 2,000 \/ 1,000 mL/)).toBeVisible();
    await expect(canvas.getAllByLabelText(/meta 1000 mL/)).toHaveLength(6);
    await expect(canvas.getAllByLabelText(/meta 2 aplicaciones/)).toHaveLength(6);
    await expect(
      canvas
        .getByRole('region', { name: 'Progreso de tu ciclo' })
        .querySelectorAll('.hf-cycle-chart__goal'),
    ).toHaveLength(14);
  },
};

function OverflowGarden() {
  const { state, now } = analysisFixture(5);
  const plants = gardenPlants(state, now, monthBounds(state, now).last);
  // Presentation stress case: valid weekly cycles currently produce at most five closures/month.
  const entries = [...plants, { ...plants[0]!, id: 'overflow-fixture', index: 5, slot: 5 }];
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <div className="local-screen analysis-screen" style={{ maxWidth: 402 }}>
      <h1 className="hf-type-heading-md">Desbordamiento de la colección</h1>
      <GardenScene
        plants={entries}
        month="septiembre de prueba"
        onOpen={setSelected}
        onMove={() => {}}
      />
      <GardenCollectionList
        plants={entries}
        collection="alive"
        title="Todas las entradas de prueba"
        formatDate={(at) => collectionDate(at, state)}
        onOpen={setSelected}
      />
      {selected !== null && <p role="status">Ciclo seleccionado: {selected + 1}</p>}
    </div>
  );
}
export const Overflow: Story = {
  name: 'Desbordamiento · todas las entradas siguen accesibles',
  render: () => <OverflowGarden />,
  play: async ({ canvas, userEvent }) => {
    const patio = canvas.getByRole('group', { name: /Jardín de/ });
    const list = canvas.getByRole('region', { name: 'Plantas ganadas' });
    await expect(within(patio).getAllByRole('button')).toHaveLength(5);
    await expect(within(list).getAllByRole('button')).toHaveLength(6);
    await userEvent.click(within(list).getByRole('button', { name: /Brote · Ciclo 6/ }));
    await expect(canvas.getByRole('status')).toHaveTextContent('Ciclo seleccionado: 6');
  },
};
