import type { Meta, StoryObj } from '@storybook/react-vite';
import { Icon, iconSources } from './Icon';
const meta = {
  title: 'Base/Icon',
  component: Icon,
  args: { name: 'leaf' },
  parameters: { designWidth: 354 },
} satisfies Meta<typeof Icon>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Library: Story = {
  render: () => (
    <div className="hf-icon-library">
      {(Object.keys(iconSources) as Array<keyof typeof iconSources>).map((name) => (
        <div key={name}>
          <Icon name={name} />
          <span>{name}</span>
        </div>
      ))}
    </div>
  ),
};
