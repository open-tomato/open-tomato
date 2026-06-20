import type { Meta, StoryObj } from '@storybook/react';

import { AspectRatio } from './AspectRatio';

const meta: Meta<typeof AspectRatio> = {
  title: 'Atoms/AspectRatio',
  component: AspectRatio,
  tags: ['autodocs'],
  argTypes: {
    ratio: {
      control: 'select',
      options: ['square', 'video', 'portrait'],
    },
  },
  args: { ratio: 'video' },
};
export default meta;

type Story = StoryObj<typeof AspectRatio>;

const Placeholder = ({ label }: { label: string }) => (
  <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
    {label}
  </div>
);

export const Default: Story = {
  render: (args) => (
    <div className="w-80">
      <AspectRatio {...args}>
        <Placeholder label={args.ratio ?? 'video'} />
      </AspectRatio>
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      {(['square', 'video', 'portrait'] as const).map((r) => (
        <div key={r} className="w-60">
          <AspectRatio ratio={r}>
            <Placeholder label={r} />
          </AspectRatio>
        </div>
      ))}
    </div>
  ),
};
