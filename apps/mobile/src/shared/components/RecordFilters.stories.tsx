import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import { RecordFilters } from './RecordFilters';
import { figmaParameters } from '../../stories/figma';
const meta = {
  title: 'Registros/RecordFilters',
  component: RecordFilters,
  parameters: figmaParameters('225:2892', 370),
  args: { value: 'all', onChange: fn() },
} satisfies Meta<typeof RecordFilters>;
export default meta;
type Story = StoryObj<typeof meta>;
export const All: Story = {};
export const Water: Story = { args: { value: 'water' } };
export const Sunscreen: Story = { args: { value: 'sunscreen' } };
function InteractiveFilters() {
  const [value, setValue] = useState<'all' | 'water' | 'sunscreen'>('all');
  return <RecordFilters value={value} onChange={setValue} />;
}
export const Interactive: Story = {
  render: () => <InteractiveFilters />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('radio', { name: 'Agua' }));
    await expect(canvas.getByRole('radio', { name: 'Agua' })).toBeChecked();
    await expect(canvas.getByRole('radio', { name: 'Todos' })).not.toBeChecked();
  },
};
