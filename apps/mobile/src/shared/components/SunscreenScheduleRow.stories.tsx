import type { Meta, StoryObj } from '@storybook/react-vite';
import { SunscreenScheduleRow } from './SunscreenScheduleRow';
import { figmaParameters } from '../../stories/figma';
const meta = {
  title: 'Hábitos/SunscreenScheduleRow',
  component: SunscreenScheduleRow,
  parameters: figmaParameters('326:4001', 370),
  args: { state: 'registered', time: '11:00', detail: 'Registrada a las 11:11' },
} satisfies Meta<typeof SunscreenScheduleRow>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Registered: Story = {};
export const Available: Story = { args: { state: 'available', detail: 'Ventana abierta' } };
export const Upcoming: Story = {
  args: { state: 'upcoming', time: '14:00', detail: 'Todavía no disponible' },
};
export const Closed: Story = { args: { state: 'closed', detail: 'Ventana cerrada' } };
