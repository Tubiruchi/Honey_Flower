import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import { CameraShutter } from './CameraPrimitives';
import { figmaParameters } from '../../stories/figma';
const meta = {
  title: 'Cámara/Prototipo/CameraShutter',
  component: CameraShutter,
  parameters: figmaParameters('247:4916', 96),
  args: { onCapture: fn() },
} satisfies Meta<typeof CameraShutter>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Shutter: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Tomar foto' }));
    await expect(args.onCapture).toHaveBeenCalledOnce();
  },
};
