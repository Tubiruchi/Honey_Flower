import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import { Button } from './Button';

const meta = {
  title: 'Base/Button',
  component: Button,
  parameters: { designWidth: 362 },
  args: { children: 'Continuar', onClick: fn() },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const PrimaryPressed: Story = { parameters: { referenceState: 'pressed' } };
export const PrimaryFocused: Story = { parameters: { referenceState: 'focused' } };
export const Secondary: Story = { args: { variant: 'secondary' } };
export const SecondaryPressed: Story = {
  args: { variant: 'secondary' },
  parameters: { referenceState: 'pressed' },
};
export const SecondaryFocused: Story = {
  args: { variant: 'secondary' },
  parameters: { referenceState: 'focused' },
};
export const SecondaryLoading: Story = { args: { variant: 'secondary', loading: true } };
export const SecondaryDisabled: Story = { args: { variant: 'secondary', disabled: true } };
export const Text: Story = { args: { variant: 'text' } };
export const TextPressed: Story = {
  args: { variant: 'text' },
  parameters: { referenceState: 'pressed' },
};
export const TextFocused: Story = {
  args: { variant: 'text' },
  parameters: { referenceState: 'focused' },
};
export const TextLoading: Story = { args: { variant: 'text', loading: true } };
export const TextDisabled: Story = { args: { variant: 'text', disabled: true } };
export const SunscreenPressed: Story = {
  args: { variant: 'sunscreen' },
  parameters: { referenceState: 'pressed' },
};
export const SunscreenFocused: Story = {
  args: { variant: 'sunscreen' },
  parameters: { referenceState: 'focused' },
};
export const SunscreenLoading: Story = { args: { variant: 'sunscreen', loading: true } };
export const SunscreenDisabled: Story = { args: { variant: 'sunscreen', disabled: true } };
export const Sunscreen: Story = {
  args: { variant: 'sunscreen', children: 'Registrar aplicación' },
};
export const Loading: Story = {
  args: { loading: true },
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Cargando…' }));
    await expect(args.onClick).not.toHaveBeenCalled();
    await expect(canvas.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  },
};
export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('button'));
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};
