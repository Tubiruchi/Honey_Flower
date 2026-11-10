import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import { RecordEditor } from './RecordEditor';
import { figmaParameters } from '../../stories/figma';
const meta = {
  title: 'Registros/RecordEditor',
  component: RecordEditor,
  parameters: figmaParameters('226:3064', 370),
  args: { value: '400', onChange: fn(), onSave: fn(), onCancel: fn() },
} satisfies Meta<typeof RecordEditor>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Normal: Story = {};
export const Error: Story = { args: { value: '0', state: 'error' } };
export const Saving: Story = { args: { state: 'saving' } };
function EditableAmount({ onSave }: { onSave: (value: number) => void }) {
  const [value, setValue] = useState('400');
  return (
    <RecordEditor
      value={value}
      onChange={setValue}
      onSave={onSave}
      onCancel={() => setValue('400')}
    />
  );
}
export const Validation: Story = {
  render: (args) => <EditableAmount onSave={args.onSave} />,
  play: async ({ canvas, args, userEvent }) => {
    const field = canvas.getByRole('textbox', { name: 'Cantidad de agua (mL)' });
    await userEvent.clear(field);
    await userEvent.type(field, '0');
    await expect(canvas.getByRole('button', { name: 'Guardar' })).toBeDisabled();
    await userEvent.clear(field);
    await userEvent.type(field, '10001');
    await expect(canvas.getByRole('button', { name: 'Guardar' })).toBeDisabled();
    await userEvent.clear(field);
    await userEvent.type(field, '2.5');
    await expect(canvas.getByRole('button', { name: 'Guardar' })).toBeDisabled();
    await userEvent.clear(field);
    await userEvent.type(field, '10000');
    await userEvent.click(canvas.getByRole('button', { name: 'Guardar' }));
    await expect(args.onSave).toHaveBeenCalledWith(10000);
    await userEvent.click(canvas.getByRole('button', { name: 'Cancelar' }));
    await expect(field).toHaveValue('400');
  },
};
