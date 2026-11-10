import type { Meta, StoryObj } from '@storybook/react-vite';
import { DetectionApprovalStamp } from './DetectionApprovalStamp';
import { figmaParameters } from '../../stories/figma';
const meta = {
  title: 'Cámara/DetectionApprovalStamp',
  component: DetectionApprovalStamp,
  parameters: figmaParameters('265:3551', 140),
  args: {},
} satisfies Meta<typeof DetectionApprovalStamp>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Photo: Story = {};
export const Surface: Story = { args: { background: 'surface' } };
