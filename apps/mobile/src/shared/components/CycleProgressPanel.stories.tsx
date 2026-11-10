import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import { CycleProgressPanel } from './CycleProgressPanel';
import { closedCycle, currentCycle } from '../../stories/fixtures/phase2';
import { figmaParameters } from '../../stories/figma';
const meta = {
  title: 'Análisis/CycleProgressPanel',
  component: CycleProgressPanel,
  parameters: figmaParameters('343:4396'),
  args: { ...closedCycle, onChangeCycle: fn() },
} satisfies Meta<typeof CycleProgressPanel>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Closed: Story = {};
export const InProgress: Story = { args: currentCycle };
function SwitchCycle() {
  const [current, setCurrent] = useState(false);
  return (
    <CycleProgressPanel
      {...(current ? currentCycle : closedCycle)}
      onChangeCycle={() => setCurrent(!current)}
    />
  );
}
export const ChangeCycle: Story = {
  render: () => <SwitchCycle />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Ver ciclo en curso' }));
    await expect(canvas.getByText('34.5 %')).toBeVisible();
    await expect(canvas.getAllByLabelText(/pendiente, día futuro/)).toHaveLength(8);
    await userEvent.click(canvas.getByRole('button', { name: 'Ver último ciclo cerrado' }));
    await expect(canvas.getByText('88.1 %')).toBeVisible();
  },
};
