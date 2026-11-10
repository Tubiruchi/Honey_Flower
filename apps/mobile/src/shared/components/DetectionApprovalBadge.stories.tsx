import type { Meta, StoryObj } from '@storybook/react-vite';
import { DetectionApprovalBadge } from './DetectionApprovalBadge';
import { figmaParameters } from '../../stories/figma';
const meta = {
  title: 'Cámara/DetectionApprovalBadge',
  component: DetectionApprovalBadge,
  parameters: figmaParameters('265:3558', 44),
  args: {},
} satisfies Meta<typeof DetectionApprovalBadge>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Photo: Story = {};
export const Surface: Story = { args: { background: 'surface' } };
