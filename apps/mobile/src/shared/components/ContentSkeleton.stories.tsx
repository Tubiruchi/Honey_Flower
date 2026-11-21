import type { Meta, StoryObj } from '@storybook/react-vite';
import { ContentSkeleton } from './ContentSkeleton';

const meta = {
  title: 'Base/ContentSkeleton',
  component: ContentSkeleton,
  parameters: { designWidth: 362 },
  args: { lines: 3, label: 'Cargando contenido' },
} satisfies Meta<typeof ContentSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Compact: Story = { args: { lines: 2 } };
