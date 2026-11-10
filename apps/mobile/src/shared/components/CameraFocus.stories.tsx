import type { Meta, StoryObj } from '@storybook/react-vite';
import { CameraFocus } from './CameraPrimitives';
import { figmaParameters } from '../../stories/figma';
const meta = {
  title: 'Cámara/Prototipo/CameraFocus',
  component: CameraFocus,
  parameters: figmaParameters('247:4913', 224),
} satisfies Meta<typeof CameraFocus>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Focus: Story = {};
