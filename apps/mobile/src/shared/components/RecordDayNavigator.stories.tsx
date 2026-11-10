import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { RecordDayNavigator } from './RecordDayNavigator';
import { figmaParameters } from '../../stories/figma';
const meta = {
  title: 'Registros/RecordDayNavigator',
  component: RecordDayNavigator,
  parameters: figmaParameters('225:2917', 370),
  args: { onPrevious: fn(), onNext: fn() },
} satisfies Meta<typeof RecordDayNavigator>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Current: Story = {};
export const Closed: Story = { args: { state: 'closed', date: 'Lun, 26 oct' } };
