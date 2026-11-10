import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, waitFor } from 'storybook/test';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AppRoutes } from '../../app/App';
import { LocalProvider } from '../local/LocalProvider';
import { createLocalState, DAY_MS } from '../local/model';
import { createSnapshot, LOCAL_SNAPSHOT_KEY } from '../../shared/data/localSnapshot';
import { memoryStorage } from '../../shared/data/localRepository';
import { WaterServicesProvider } from './WaterServices';
import { phase2Assets } from '../../assets/figma/components/phase2';
const start = Date.UTC(2026, 10, 8, 17),
  now = start + DAY_MS + 1000;
type Scenario =
  'personal' | 'denied' | 'cancelled' | 'rejected' | 'analysis-error' | 'write-error' | 'approved';
function WaterPreview({
  scenario = 'personal',
  preview = false,
  onWrite = () => {},
  onRelease = () => {},
}: {
  scenario?: Scenario;
  preview?: boolean;
  onWrite?: (key: string) => void;
  onRelease?: () => void;
}) {
  const [storage] = useState(() => {
    const base = memoryStorage({
      [LOCAL_SNAPSHOT_KEY]: JSON.stringify(createSnapshot(createLocalState(start))),
    });
    let fail = scenario === 'write-error';
    return {
      getItem: base.getItem,
      setItem: (key: string, value: string) => {
        onWrite(key);
        if (key === LOCAL_SNAPSHOT_KEY && fail) {
          fail = false;
          throw Error('guardado de prueba');
        }
        return base.setItem(key, value);
      },
    };
  });
  const [router] = useState(() =>
    createMemoryRouter([{ path: '*', element: <AppRoutes persistOnboardingDraft={false} /> }], {
      initialEntries: [preview ? '/perfil' : '/inicio/agua'],
    }),
  );
  return (
    <WaterServicesProvider
      camera={{
        open: async () => {
          if (scenario === 'denied')
            throw Error(
              'La cámara no tiene permiso. Autorízala en los ajustes y vuelve a intentar.',
            );
          return {
            source: 'android',
            stop: () => {},
            capture: async (id) => {
              if (scenario === 'cancelled')
                throw Error(
                  'Se canceló la fotografía. Puedes volver a tomarla o salir sin registrar.',
                );
              return {
                id,
                url: phase2Assets.photo,
                capturedAt: now,
                source: 'android',
                dispose: async () => {
                  onRelease();
                },
              };
            },
          };
        },
      }}
      analyzer={{
        analyze: async () => {
          if (scenario === 'analysis-error') throw Error('analizador de prueba');
          if (scenario === 'rejected')
            return {
              status: 'rejected',
              message: 'El recipiente no se ve con claridad. Vuelve a tomar la foto.',
            };
          if (scenario === 'approved')
            return {
              status: 'approved',
              analyzer: 'storybook-fixture',
              message: 'Resultado aprobado de demostración. No representa un detector instalado.',
            };
          return {
            status: 'uncertain',
            message: 'Revisión personal: confirma que esta es tu foto y la cantidad que bebiste.',
          };
        },
      }}
    >
      <LocalProvider storage={storage} referenceNow={now}>
        <RouterProvider router={router} />
      </LocalProvider>
    </WaterServicesProvider>
  );
}
const meta = {
  title: 'Pantallas/Agua conectada',
  component: WaterPreview,
  parameters: {
    edgeToEdge: true,
    docs: {
      description: {
        component:
          'Recorrido conectado con puertos aislados. Solo estas historias usan una imagen de demostración; la aplicación utiliza la cámara real. El resultado predeterminado es revisión personal, sin sello de aprobación.',
      },
    },
  },
  args: { scenario: 'personal' },
} satisfies Meta<typeof WaterPreview>;
export default meta;
type Story = StoryObj<typeof meta>;
export const TemporaryCameraPreview: Story = {
  name: 'Temporal · Perfil abre la cámara sin guardar',
  args: { preview: true, onWrite: fn(), onRelease: fn() },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(await canvas.findByRole('button', { name: /Probar cámara · temporal/ }));
    await expect(canvas.getByRole('note')).toHaveTextContent('No guarda registros');
    await expect(canvas.queryByRole('button', { name: 'Tomar foto' })).not.toBeInTheDocument();
    await userEvent.click(await canvas.findByRole('button', { name: 'Activar cámara' }));
    await userEvent.click(await canvas.findByRole('button', { name: 'Tomar foto' }));
    await canvas.findByRole('button', { name: 'Terminar prueba' });
    await expect(
      canvas.queryByRole('button', { name: 'Confirmar y guardar' }),
    ).not.toBeInTheDocument();
    const amount = canvas.getByRole('textbox', { name: '¿Cuánta agua tomaste?' });
    await userEvent.clear(amount);
    await userEvent.type(amount, '425');
    await userEvent.click(canvas.getByRole('button', { name: 'Volver a tomar' }));
    await userEvent.click(await canvas.findByRole('button', { name: 'Tomar foto' }));
    await expect(await canvas.findByRole('textbox', { name: '¿Cuánta agua tomaste?' })).toHaveValue(
      '425',
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Terminar prueba' }));
    await canvas.findByRole('heading', { name: 'Perfil' });
    await expect(args.onWrite).not.toHaveBeenCalled();
    await expect(args.onRelease).toHaveBeenCalledTimes(2);
  },
};
export const TemporaryPreviewCancel: Story = {
  name: 'Temporal · salir descarta solo la foto de prueba',
  args: { preview: true, onWrite: fn(), onRelease: fn() },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(await canvas.findByRole('button', { name: /Probar cámara · temporal/ }));
    await userEvent.click(await canvas.findByRole('button', { name: 'Activar cámara' }));
    await userEvent.click(await canvas.findByRole('button', { name: 'Tomar foto' }));
    await canvas.findByRole('button', { name: 'Terminar prueba' });
    await userEvent.click(canvas.getByRole('button', { name: 'Cancelar' }));
    await canvas.findByRole('dialog', { name: '¿Salir de la prueba?' });
    await userEvent.click(canvas.getByRole('button', { name: 'Volver a la cámara' }));
    await expect(canvas.getByRole('button', { name: 'Terminar prueba' })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Cancelar' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Salir de la prueba' }));
    await canvas.findByRole('heading', { name: 'Perfil' });
    await expect(args.onWrite).not.toHaveBeenCalled();
    await expect(args.onRelease).toHaveBeenCalledTimes(1);
  },
};
export const TemporaryPreviewDenied: Story = {
  name: 'Temporal · permiso denegado permite regresar',
  args: { preview: true, scenario: 'denied', onWrite: fn() },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(await canvas.findByRole('button', { name: /Probar cámara · temporal/ }));
    await userEvent.click(await canvas.findByRole('button', { name: 'Activar cámara' }));
    await canvas.findByRole('heading', { name: 'No pudimos continuar' });
    await expect(canvas.queryByRole('button', { name: 'Terminar prueba' })).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Cancelar' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Salir de la prueba' }));
    await canvas.findByRole('heading', { name: 'Perfil' });
    await expect(args.onWrite).not.toHaveBeenCalled();
  },
};
export const Ready: Story = {
  name: 'Solicitud · cámara sin activar',
  play: async ({ canvas }) => {
    await canvas.findByRole('button', { name: 'Activar cámara' });
    await expect(
      canvas.queryByRole('button', { name: 'Confirmar y guardar' }),
    ).not.toBeInTheDocument();
  },
};
export const PersonalReview: Story = {
  name: 'Foto y confirmación personal integrada',
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Activar cámara' }));
    await userEvent.click(await canvas.findByRole('button', { name: 'Tomar foto' }));
    await canvas.findByRole('button', { name: 'Confirmar y guardar' });
    await expect(canvas.queryByText('Foto aprobada')).not.toBeInTheDocument();
  },
};
export const ConfirmOnce: Story = {
  name: 'Confirmar guarda una sola vez',
  play: async (context) => {
    await PersonalReview.play!(context);
    const { canvas, userEvent } = context;
    const input = canvas.getByRole('textbox', { name: '¿Cuánta agua tomaste?' });
    await userEvent.clear(input);
    await userEvent.type(input, '375');
    await userEvent.click(canvas.getByRole('button', { name: 'Confirmar y guardar' }));
    await canvas.findByRole('heading', { name: 'Tu registro está guardado' });
    await userEvent.click(canvas.getByRole('button', { name: 'Volver al inicio' }));
    await expect(await canvas.findByText('375 mL', { exact: true })).toBeVisible();
  },
};
export const Denied: Story = {
  name: 'Permiso denegado · sin salto',
  args: { scenario: 'denied' },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Activar cámara' }));
    await canvas.findByRole('heading', { name: 'No pudimos continuar' });
    await expect(
      canvas.queryByRole('button', { name: 'Confirmar y guardar' }),
    ).not.toBeInTheDocument();
  },
};
export const Cancelled: Story = {
  name: 'Cámara cancelada · conservar cantidad',
  args: { scenario: 'cancelled' },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Activar cámara' }));
    await userEvent.click(await canvas.findByRole('button', { name: 'Tomar foto' }));
    await canvas.findByRole('heading', { name: 'No pudimos continuar' });
    await expect(canvas.getByText('Cantidad del intento: 250 mL')).toBeVisible();
  },
};
export const ExitAndStay: Story = {
  name: 'Salir sin registrar y continuar en la cámara',
  play: async (context) => {
    await PersonalReview.play!(context);
    const { canvas, userEvent } = context;
    await userEvent.click(canvas.getByRole('button', { name: 'Cancelar' }));
    await canvas.findByRole('dialog', { name: '¿Salir sin registrar?' });
    await userEvent.click(canvas.getByRole('button', { name: 'Volver a la cámara' }));
    await expect(canvas.getByRole('button', { name: 'Confirmar y guardar' })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Cancelar' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Salir sin registrar' }));
    await waitFor(() => expect(canvas.getByText('0 mL', { exact: true })).toBeVisible());
  },
};
export const Retake: Story = {
  name: 'Volver a tomar conserva la cantidad',
  play: async (context) => {
    await PersonalReview.play!(context);
    const { canvas, userEvent } = context;
    const input = canvas.getByRole('textbox', { name: '¿Cuánta agua tomaste?' });
    await userEvent.clear(input);
    await userEvent.type(input, '500');
    await userEvent.click(canvas.getByRole('button', { name: 'Volver a tomar' }));
    await userEvent.click(await canvas.findByRole('button', { name: 'Tomar foto' }));
    await expect(await canvas.findByRole('textbox', { name: '¿Cuánta agua tomaste?' })).toHaveValue(
      '500',
    );
  },
};
export const Rejected: Story = {
  name: 'Captura rechazada · repetir o salir',
  args: { scenario: 'rejected' },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Activar cámara' }));
    await userEvent.click(await canvas.findByRole('button', { name: 'Tomar foto' }));
    await canvas.findByRole('heading', { name: 'Vuelve a tomar la foto' });
    await expect(
      canvas.queryByRole('button', { name: 'Confirmar y guardar' }),
    ).not.toBeInTheDocument();
  },
};
export const AnalysisError: Story = {
  name: 'Error posterior a foto · revisión personal',
  args: { scenario: 'analysis-error' },
  play: PersonalReview.play,
};
export const SaveRetry: Story = {
  name: 'Error de guardado · reintento estable',
  args: { scenario: 'write-error' },
  play: async (context) => {
    await PersonalReview.play!(context);
    const { canvas, userEvent } = context;
    await userEvent.click(canvas.getByRole('button', { name: 'Confirmar y guardar' }));
    await waitFor(() =>
      expect(canvas.getByRole('textbox', { name: '¿Cuánta agua tomaste?' })).toBeDisabled(),
    );
    await expect(canvas.getByRole('button', { name: 'Volver a tomar' })).toBeDisabled();
    await userEvent.click(await canvas.findByRole('button', { name: 'Reintentar guardado' }));
    await canvas.findByRole('heading', { name: 'Tu registro está guardado' });
  },
};
export const ApprovedFixture: Story = {
  name: 'Aprobación · solo ejemplo de analizador',
  args: { scenario: 'approved' },
  parameters: {
    docs: {
      description: {
        story:
          'Estado visual para un futuro analizador verificable. La aplicación no devuelve esta aprobación automáticamente.',
      },
    },
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Activar cámara' }));
    await userEvent.click(await canvas.findByRole('button', { name: 'Tomar foto' }));
    await canvas.findByRole('button', { name: 'Confirmar y guardar' });
  },
};
