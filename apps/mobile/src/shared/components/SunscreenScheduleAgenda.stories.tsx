import type { Meta, StoryObj } from '@storybook/react-vite';
import { SunscreenScheduleAgenda } from './SunscreenScheduleAgenda';
import { sunscreenAgenda } from '../../stories/fixtures/phase2';
import { figmaParameters } from '../../stories/figma';
const meta = {
  title: 'Hábitos/SunscreenScheduleAgenda',
  component: SunscreenScheduleAgenda,
  parameters: figmaParameters(
    '326:4063',
    370,
    'Horas ilustrativas; la política de ventanas pertenece al controlador.',
  ),
  args: sunscreenAgenda('active'),
} satisfies Meta<typeof SunscreenScheduleAgenda>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Active: Story = {};
export const Registered: Story = { args: sunscreenAgenda('registered') };
export const Closed: Story = { args: sunscreenAgenda('closed') };
export const OneApplication: Story = { args: { rows: sunscreenAgenda('active').rows.slice(0, 1) } };
