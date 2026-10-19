import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import { SettingRow } from './SettingRow';
import type { SettingRowProps } from './SettingRow';

function InteractiveSetting(args: SettingRowProps) {
  const [checked, setChecked] = useState(args.checked);
  return (
    <SettingRow
      {...args}
      checked={checked}
      onChange={(value) => {
        setChecked(value);
        args.onChange(value);
      }}
    />
  );
}

const meta = {
  title: 'Base/SettingRow',
  component: SettingRow,
  parameters: { designWidth: 354 },
  args: {
    label: 'Recibir notificaciones',
    description: 'Puedes usar la app con los avisos apagados.',
    checked: false,
    onChange: fn(),
  },
} satisfies Meta<typeof SettingRow>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {};
export const On: Story = { args: { checked: true } };
export const Disabled: Story = { args: { disabled: true } };
export const Toggle: Story = {
  render: (args) => <InteractiveSetting {...args} />,
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole('switch', { name: 'Recibir notificaciones' }));
    await expect(canvas.getByRole('switch')).toBeChecked();
    await expect(args.onChange).toHaveBeenCalledWith(true);
  },
};
