import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import { AlertLevel } from './AlertLevel';
import type { AlertLevelProps } from './AlertLevel';

function ToneDemo(args: AlertLevelProps) {
  const [value, setValue] = useState(args.value);
  return (
    <AlertLevel
      {...args}
      value={value}
      onChange={(next) => {
        setValue(next);
        args.onChange(next);
      }}
    />
  );
}

const meta = {
  title: 'Recordatorios/AlertLevel',
  component: AlertLevel,
  args: { value: 'gentle', onChange: fn() },
} satisfies Meta<typeof AlertLevel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Gentle: Story = {};
export const Medium: Story = { args: { value: 'medium' } };
export const Intense: Story = { args: { value: 'intense' } };
export const Disabled: Story = { args: { disabled: true } };
export const ChangeTone: Story = {
  render: (args) => <ToneDemo {...args} />,
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('radio', { name: 'Intenso' }));
    await expect(canvas.getByRole('radio', { name: 'Intenso' })).toBeChecked();
    await expect(canvas.getByRole('radio', { name: 'Suave' })).not.toBeChecked();
    await expect(args.onChange).toHaveBeenCalledWith('intense');
  },
};
