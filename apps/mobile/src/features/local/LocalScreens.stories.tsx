import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { MemoryRouter } from 'react-router-dom';
import { BottomNavigation } from '../../shared/components';
import { createOnboardingDraft } from '../onboarding/model';
import { LocalProvider } from './LocalProvider';
import { HomeScreen } from './HomeScreen';
import { AnalysisScreen } from './AnalysisScreen';
import { ProfileScreen } from './ProfileScreen';
import { createLocalState, DAY_MS, recordEvent } from './model';
import './local.css';

const start = Date.UTC(2026, 9, 16, 17);
const now = start + 2 * DAY_MS + 1000;
const empty = () =>
  createLocalState(now, { ...createOnboardingDraft('America/Cancun'), preferredName: 'Alex' });
function referenceState() {
  let state = createLocalState(start, {
    ...createOnboardingDraft('America/Cancun'),
    preferredName: 'Alex',
  });
  for (let day = 0; day < 3; day++) {
    const at = start + day * DAY_MS + 1000;
    state = recordEvent(
      state,
      { id: `w${day}`, kind: 'water', amount: day === 2 ? 1000 : 2000, at },
      at,
    );
    for (let i = 0; i < (day === 2 ? 1 : 3); i++)
      state = recordEvent(state, { id: `s${day}-${i}`, kind: 'sunscreen', amount: 1, at }, at);
  }
  return state;
}
function Screen({
  screen = 'home',
  fresh = false,
}: {
  screen?: 'home' | 'analysis' | 'profile';
  fresh?: boolean;
}) {
  return (
    <MemoryRouter>
      <LocalProvider
        initialState={fresh ? empty() : referenceState()}
        persist={false}
        referenceNow={now}
      >
        <div className="local-shell local-story">
          <div className="local-reference-status" aria-hidden="true">
            12:00
          </div>
          <main className="local-scroll">
            {screen === 'home' ? (
              <HomeScreen />
            ) : screen === 'analysis' ? (
              <AnalysisScreen />
            ) : (
              <ProfileScreen />
            )}
          </main>
          <footer className="local-navigation">
            <BottomNavigation
              gardenLabel="Análisis"
              active={screen === 'home' ? 'home' : screen === 'analysis' ? 'garden' : 'profile'}
              onNavigate={() => {}}
            />
          </footer>
        </div>
      </LocalProvider>
    </MemoryRouter>
  );
}
const meta = {
  title: 'Pantallas/Prueba local',
  component: Screen,
  parameters: { edgeToEdge: true },
  args: { screen: 'home', fresh: false },
} satisfies Meta<typeof Screen>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Home: Story = { name: 'Inicio' };
export const Analysis: Story = { name: 'Análisis', args: { screen: 'analysis' } };
export const Profile: Story = { name: 'Perfil', args: { screen: 'profile' } };
export const Empty: Story = { name: 'Primera entrada sin registros', args: { fresh: true } };
export const Register: Story = {
  name: 'Registrar y deshacer',
  args: { fresh: true },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: '+250 mL' }));
    await expect(canvas.getByText('250 mL', { exact: true })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Deshacer' }));
    await expect(canvas.getByText('0 mL', { exact: true })).toBeVisible();
  },
};
export const EditName: Story = {
  name: 'Editar el nombre',
  args: { screen: 'profile' },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Editar perfil/ }));
    const input = canvas.getByRole('textbox', { name: 'Tu nombre preferido' });
    await userEvent.clear(input);
    await userEvent.type(input, 'Noemí');
    await userEvent.click(canvas.getByRole('button', { name: 'Guardar cambios' }));
    await expect(canvas.getByRole('heading', { name: 'Noemí' })).toBeVisible();
  },
};
