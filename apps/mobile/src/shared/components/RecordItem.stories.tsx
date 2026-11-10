import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { RecordItem } from './RecordItem';
import { figmaParameters } from '../../stories/figma';
const meta = {
  title: 'Registros/RecordItem',
  component: RecordItem,
  parameters: figmaParameters('226:2935', 370),
  args: { kind: 'water', onActionsChange: fn(), onEdit: fn(), onDelete: fn() },
} satisfies Meta<typeof RecordItem>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Water: Story = {};
export const WaterActions: Story = { args: { state: 'actions' } };
export const WaterReadonly: Story = { args: { state: 'readonly' } };
export const Sunscreen: Story = { args: { kind: 'sunscreen' } };
export const SunscreenActions: Story = { args: { kind: 'sunscreen', state: 'actions' } };
export const SunscreenReadonly: Story = { args: { kind: 'sunscreen', state: 'readonly' } };
