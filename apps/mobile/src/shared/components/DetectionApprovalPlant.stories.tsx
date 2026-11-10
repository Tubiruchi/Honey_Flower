import type { Meta, StoryObj } from '@storybook/react-vite';
import { DetectionApprovalPlant } from './DetectionApprovalPlant';
import { figmaParameters } from '../../stories/figma';
const meta = {
  title: 'Cámara/DetectionApprovalPlant',
  component: DetectionApprovalPlant,
  parameters: figmaParameters('265:3536', 114),
  args: {},
} satisfies Meta<typeof DetectionApprovalPlant>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Approved: Story = {};
