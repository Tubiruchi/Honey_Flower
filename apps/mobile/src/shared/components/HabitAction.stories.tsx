import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import { HabitAction } from './HabitAction';
import type { HabitActionProps } from './HabitAction';

function RegisterDemo(args: HabitActionProps) {
  const [completed, setCompleted] = useState(false);
  return (
    <HabitAction
      {...args}
      summary={completed ? '2,000 / 2,000 mL' : '1,750 / 2,000 mL'}
      completed={completed}
      onRegister={() => {
        setCompleted(true);
        args.onRegister();
      }}
    />
  );
}

const meta = {
  title: 'Hábitos/HabitAction',
  component: HabitAction,
  args: {
    kind: 'water',
    summary: '500 / 2,000 mL',
    actionLabel: 'Registrar +250 mL',
    onRegister: fn(),
  },
  parameters: {
    docs: {
      description: {
        component:
          'Acción declarada por el usuario. El componente emite el registro; la persistencia y escalada a cámara pertenecen al caso de uso.',
      },
    },
  },
} satisfies Meta<typeof HabitAction>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WaterPending: Story = {};
export const SunscreenPending: Story = {
  args: { kind: 'sunscreen', summary: '1 / 2 aplicaciones', actionLabel: 'Registrar reaplicación' },
};
export const Completed: Story = { args: { completed: true, summary: '2,000 / 2,000 mL' } };
export const Loading: Story = { args: { loading: true } };
export const Disabled: Story = { args: { disabled: true } };
export const RegisterAndComplete: Story = {
  render: (args) => <RegisterDemo {...args} />,
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Registrar +250 mL' }));
    await expect(canvas.getByText('2,000 / 2,000 mL')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Completado' })).toBeDisabled();
    await expect(args.onRegister).toHaveBeenCalledTimes(1);
  },
};
