import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ConfirmationAmountField } from './ConfirmationAmountField';
import { figmaParameters } from '../../stories/figma';
const meta = {
  title: 'Cámara/ConfirmationAmountField',
  component: ConfirmationAmountField,
  parameters: figmaParameters('290:4037', 330),
  args: { value: '250', onChange: fn() },
} satisfies Meta<typeof ConfirmationAmountField>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Normal: Story = {};
export const Error: Story = { args: { state: 'error', value: '0' } };
export const Disabled: Story = { args: { state: 'disabled' } };
