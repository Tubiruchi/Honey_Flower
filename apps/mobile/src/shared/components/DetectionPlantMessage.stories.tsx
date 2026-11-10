import type { Meta, StoryObj } from '@storybook/react-vite';
import { DetectionPlantMessage } from './DetectionPlantMessage';
import { figmaParameters } from '../../stories/figma';
const meta = {
  title: 'Cámara/DetectionPlantMessage',
  component: DetectionPlantMessage,
  parameters: figmaParameters('265:3538', 370),
  args: {},
} satisfies Meta<typeof DetectionPlantMessage>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Approved: Story = {};
