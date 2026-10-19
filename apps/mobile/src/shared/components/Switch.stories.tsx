import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Switch } from './Switch';
import { useState } from 'react';
import { expect } from 'storybook/test';
import type { SwitchProps } from './Switch';
function SwitchExample(args: SwitchProps) {
  const [checked, setChecked] = useState(args.checked);
  return (
    <Switch
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
  title: 'Base/Switch',
  component: Switch,
  parameters: {
    designWidth: 48,
    docs: {
      description: {
        component:
          'Referencia: [HF / Switch](https://www.figma.com/design/VL7t5V9yd9nt1mkr0DpKJj/Joyner?node-id=66-1036). Medidas, colores y recursos originales de Figma.',
      },
    },
  },
  args: { 'aria-label': 'Recordatorios', checked: true, onChange: fn() },
} satisfies Meta<typeof Switch>;
export default meta;
type Story = StoryObj<typeof meta>;
export const On: Story = {};
export const Off: Story = { args: { checked: false } };
export const FocusedOn: Story = { parameters: { referenceState: 'focused' } };
export const FocusedOff: Story = {
  args: { checked: false },
  parameters: { referenceState: 'focused' },
};
export const DisabledOn: Story = { args: { disabled: true } };
export const DisabledOff: Story = { args: { checked: false, disabled: true } };
export const Interactive: Story = {
  render: (args) => <SwitchExample {...args} />,
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole('switch'));
    await expect(canvas.getByRole('switch')).not.toBeChecked();
    await expect(args.onChange).toHaveBeenCalledWith(false);
  },
};
