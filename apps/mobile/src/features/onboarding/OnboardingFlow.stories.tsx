import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import { OnboardingFlow } from './OnboardingFlow';
import { createOnboardingDraft } from './model';

const exampleDraft = { ...createOnboardingDraft('America/Cancun'), preferredName: 'Alex' };
const meta = {
  title: 'Onboarding/Recorrido',
  component: OnboardingFlow,
  parameters: {
    edgeToEdge: true,
    docs: {
      description: {
        component:
          'Ocho pantallas P-O01–P-O08 del onboarding original de Figma. Sin cuenta ni activación. La barra de estado de referencia solo aparece en estas historias. El borrador de estas historias no usa almacenamiento real.',
      },
    },
  },
  args: {
    initialDraft: exampleDraft,
    referenceStatusBar: true,
    onCreateAccount: fn(),
    onSignIn: fn(),
  },
  decorators: [
    (Story) => (
      <div className="onb-story">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof OnboardingFlow>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Welcome: Story = { name: '01 · Bienvenida' };
export const Habits: Story = { name: '02 · Los dos hábitos', args: { initialStep: 'habitos' } };
export const Name: Story = { name: '03 · Tu nombre', args: { initialStep: 'nombre' } };
export const Water: Story = { name: '04 · Meta de agua', args: { initialStep: 'agua' } };
export const Sunscreen: Story = {
  name: '05 · Protector solar',
  args: { initialStep: 'protector' },
};
export const Schedules: Story = { name: '06 · Horarios', args: { initialStep: 'horarios' } };
export const Preferences: Story = { name: '07 · Calma y avisos', args: { initialStep: 'avisos' } };
export const Summary: Story = { name: '08 · Resumen', args: { initialStep: 'resumen' } };

export const CompleteJourney: Story = {
  name: 'Recorrido completo e interacción',
  args: { initialDraft: createOnboardingDraft('America/Cancun') },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Conocer cómo funciona' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Personalizar mis hábitos' }));
    await userEvent.type(canvas.getByRole('textbox', { name: 'Tu nombre preferido' }), 'María');
    await userEvent.click(canvas.getByRole('button', { name: 'Continuar' }));
    const amount = canvas.getByRole('textbox', { name: 'Meta diaria' });
    await userEvent.clear(amount);
    await userEvent.type(amount, '2500');
    await userEvent.click(canvas.getByRole('button', { name: 'Guardar meta' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Reducir reaplicaciones' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Reducir reaplicaciones' }));
    await expect(canvas.getByRole('button', { name: 'Reducir reaplicaciones' })).toBeDisabled();
    await userEvent.click(canvas.getByRole('button', { name: 'Continuar' }));
    await expect(canvas.queryByLabelText('Horario de protector 2')).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Definir horas de calma' }));
    await userEvent.click(canvas.getByRole('radio', { name: 'Suave' }));
    await userEvent.click(canvas.getByRole('switch', { name: 'Recibir notificaciones' }));
    await expect(canvas.getByRole('switch', { name: 'Sonido reforzado' })).toBeDisabled();
    await userEvent.click(canvas.getByRole('button', { name: 'Revisar mis preferencias' }));
    await expect(canvas.getByText('Agua: 2,500 mL')).toBeVisible();
    await expect(canvas.getByText('Protector: 1 inicial + 0 reaplicaciones')).toBeVisible();
    await expect(args.onCreateAccount).not.toHaveBeenCalled();
    await userEvent.click(canvas.getByRole('button', { name: 'Crear cuenta y empezar' }));
    await expect(args.onCreateAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        preferredName: 'María',
        waterGoalMl: 2500,
        sunscreenReapplications: 0,
        notifications: false,
        tone: 'gentle',
        reinforcedSound: false,
        foregroundFlash: false,
      }),
    );
  },
};

export const NameRequired: Story = {
  name: 'Validación · nombre vacío',
  args: { initialStep: 'nombre', initialDraft: createOnboardingDraft('America/Cancun') },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Continuar' }));
    await expect(canvas.getByRole('alert')).toHaveTextContent('Escribe el nombre');
    await expect(canvas.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  },
};

export const DuplicateTimes: Story = {
  name: 'Validación · horarios duplicados',
  args: {
    initialStep: 'horarios',
    initialDraft: { ...exampleDraft, waterTimes: ['08:00', '08:00'] },
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Definir horas de calma' }));
    await expect(canvas.getByRole('alert')).toHaveTextContent('deben ser diferentes');
    await userEvent.click(canvas.getByRole('button', { name: 'Quitar horario de agua 2' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Definir horas de calma' }));
    await expect(canvas.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Tu planta también respeta tus tiempos',
    );
  },
};

export const EditSummary: Story = {
  name: 'Editar y volver al resumen',
  args: { initialStep: 'resumen' },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Editar nombre' }));
    const name = canvas.getByRole('textbox', { name: 'Tu nombre preferido' });
    await userEvent.clear(name);
    await userEvent.type(name, 'Sofía');
    await userEvent.click(canvas.getByRole('button', { name: 'Guardar cambios' }));
    await expect(canvas.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Todo listo para empezar',
    );
    await expect(canvas.getByText('Sofía', { exact: true })).toBeVisible();
    await expect(args.onCreateAccount).not.toHaveBeenCalled();
  },
};

export const StorageUnavailable: Story = {
  name: 'Almacenamiento no disponible',
  args: {
    initialStep: 'nombre',
    persist: true,
    storage: {
      getItem: () => null,
      setItem: () => {
        throw new Error('Storage unavailable');
      },
    },
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByRole('textbox', { name: 'Tu nombre preferido' }), 'a');
    await expect(canvas.getByRole('alert')).toHaveTextContent('No pudimos guardar el borrador');
    await expect(canvas.getByRole('textbox', { name: 'Tu nombre preferido' })).toHaveValue('Alexa');
  },
};

export const ExistingAccount: Story = {
  name: 'Acceso a cuenta existente',
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Ya tengo cuenta' }));
    await expect(args.onSignIn).toHaveBeenCalledTimes(1);
    await expect(args.onCreateAccount).not.toHaveBeenCalled();
  },
};
