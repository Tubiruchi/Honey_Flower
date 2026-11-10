import type { Meta, StoryObj } from '@storybook/react-vite';
import { CameraPhoto } from './CameraPrimitives';
import { figmaParameters } from '../../stories/figma';
const meta = {
  title: 'Cámara/Prototipo/CameraPhoto',
  component: CameraPhoto,
  parameters: {
    ...figmaParameters(
      '247:4905',
      402,
      'Contenido estático del prototipo; no captura ni verifica hábitos.',
    ),
    edgeToEdge: true,
  },
  args: { state: 'focused' },
} satisfies Meta<typeof CameraPhoto>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Focused: Story = {};
export const Blurred: Story = { args: { state: 'blurred' } };
