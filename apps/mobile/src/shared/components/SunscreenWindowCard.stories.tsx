import type { Meta, StoryObj } from '@storybook/react-vite';
import { SunscreenWindowCard } from './SunscreenWindowCard';
import { figmaParameters } from '../../stories/figma';
const meta = {
  title: 'Hábitos/SunscreenWindowCard',
  component: SunscreenWindowCard,
  parameters: figmaParameters('326:4026', 370),
  args: {
    state: 'in-window',
    window: '11:00–11:30',
    application: 'Aplicación de las 11:00',
    closingTime: '11:30',
    registeredAt: 'Guardada a las 11:11',
    nextWindow: '14:00–14:30',
  },
} satisfies Meta<typeof SunscreenWindowCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const InWindow: Story = {};
export const Context: Story = { args: { state: 'context' } };
export const Registered: Story = { args: { state: 'registered' } };
export const Closed: Story = { args: { state: 'closed' } };
export const Upcoming: Story = { args: { state: 'upcoming' } };
