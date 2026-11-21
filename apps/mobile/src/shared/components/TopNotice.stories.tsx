import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Button } from './Button';
import { TopNotice } from './TopNotice';

const meta = {
  title: 'Base/TopNotice',
  component: TopNotice,
  parameters: { designWidth: 402 },
  args: {
    message: 'Tus preferencias se guardaron correctamente.',
    onDismiss: fn(),
    autoDismiss: false,
  },
} satisfies Meta<typeof TopNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SuccessToast: Story = {};
export const WarningToast: Story = {
  args: { variant: 'warning', message: 'La sincronización continuará al recuperar internet.' },
};
export const ErrorAlert: Story = {
  args: { variant: 'error', message: 'No pudimos confirmar el guardado.' },
};
export const ActionRequired: Story = {
  args: {
    variant: 'warning',
    message: 'Revisa los cambios ajustados antes de continuar.',
    children: <Button variant="text">Revisar ahora</Button>,
  },
};
