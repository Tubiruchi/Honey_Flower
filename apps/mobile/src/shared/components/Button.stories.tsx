import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import { Button } from './Button';

const meta = {
  title: 'Base/Button',
  component: Button,
  args: { children: 'Cuidar mi planta', onClick: fn() },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Text: Story = { args: { variant: 'text' } };
export const Sunscreen: Story = {
  args: { variant: 'sunscreen', children: 'Registrar aplicación' },
};
export const Loading: Story = { args: { loading: true } };
export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('button'));
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};
