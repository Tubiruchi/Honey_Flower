import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import {
  Button,
  Feedback,
  SunscreenScheduleAgenda,
  SunscreenWindowCard,
} from '../shared/components';
import { sunscreenAgenda } from './fixtures/phase2';
import { figmaParameters } from './figma';
function SunscreenDemo({
  context = false,
  closed = false,
}: {
  context?: boolean;
  closed?: boolean;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [registered, setRegistered] = useState(false);
  return (
    <main className="hf-story-content">
      <h1 className="hf-type-heading-lg">Protector solar</h1>
      <SunscreenWindowCard
        state={closed ? 'closed' : registered ? 'registered' : context ? 'context' : 'in-window'}
        window="11:00–11:30"
        application="Aplicación de las 11:00"
        closingTime="11:30"
        registeredAt="Guardada a las 11:11"
        nextWindow="14:00–14:30"
      />
      <SunscreenScheduleAgenda
        {...sunscreenAgenda(closed ? 'closed' : registered ? 'registered' : 'active')}
      />
      {!closed && !registered && (
        <>
          <Button
            variant="secondary"
            onClick={() => setConfirmed(!confirmed)}
            aria-pressed={confirmed}
          >
            Confirmo que me apliqué protector
          </Button>
          <Button variant="sunscreen" disabled={!confirmed} onClick={() => setRegistered(true)}>
            Registrar aplicación
          </Button>
        </>
      )}
      {registered && (
        <Feedback variant="success" title="Aplicación registrada">
          La siguiente aplicación se habilitará en su horario.
        </Feedback>
      )}
    </main>
  );
}
const meta = {
  title: 'Pantallas/Protector por horarios',
  component: SunscreenDemo,
  parameters: figmaParameters(
    '326:3994',
    370,
    'Confirmación personal con datos de prueba. No usa cámara. Horas y margen ilustrativos, sin política temporal incorporada.',
  ),
  args: {},
} satisfies Meta<typeof SunscreenDemo>;
export default meta;
type Story = StoryObj<typeof meta>;
export const InWindow: Story = {};
export const Context: Story = { args: { context: true } };
export const Closed: Story = { args: { closed: true } };
export const PersonalConfirmation: Story = {
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByRole('button', { name: 'Registrar aplicación' })).toBeDisabled();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Confirmo que me apliqué protector' }),
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Registrar aplicación' }));
    await expect(canvas.getByText('Guardada a las 11:11')).toBeVisible();
    await expect(
      canvas.queryByRole('button', { name: 'Registrar aplicación' }),
    ).not.toBeInTheDocument();
    await expect(canvas.queryByRole('button', { name: 'Tomar foto' })).not.toBeInTheDocument();
  },
};
