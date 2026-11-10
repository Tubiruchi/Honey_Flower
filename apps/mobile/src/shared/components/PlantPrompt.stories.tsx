import type { Meta, StoryObj } from '@storybook/react-vite';
import { PlantPrompt } from './CameraPrimitives';
import { figmaParameters } from '../../stories/figma';
const meta = {
  title: 'Cámara/Prototipo/PlantPrompt',
  component: PlantPrompt,
  parameters: figmaParameters('247:4906'),
} satisfies Meta<typeof PlantPrompt>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Prompt: Story = {};
