import type { Meta, StoryObj } from '@storybook/react';

import * as React from 'react';

import { Button } from '@/atoms/Button';

import { Sonner, toast } from './index';

const meta: Meta<typeof Sonner> = {
  title: 'Organisms/Sonner',
  component: Sonner,
  tags: ['autodocs'],
  argTypes: {
    position: {
      control: 'inline-radio',
      options: [
        'top-left',
        'top-center',
        'top-right',
        'bottom-left',
        'bottom-center',
        'bottom-right',
      ],
    },
    richColors: { control: 'boolean' },
    expand: { control: 'boolean' },
    closeButton: { control: 'boolean' },
  },
  args: {
    position: 'bottom-right',
    richColors: false,
    expand: false,
    closeButton: false,
  },
  parameters: {
    layout: 'fullscreen',
  },
};
export default meta;

type Story = StoryObj<typeof Sonner>;

const TriggerRow = (
  { children }: { children?: React.ReactNode },
) => (
  <div className="flex flex-wrap items-center gap-3 p-6">
    {children}
  </div>
);

export const Default: Story = {
  render: (args) => (
    <>
      <Sonner {...args} />
      <TriggerRow>
        <Button onClick={() => toast('Saved.')}>Fire toast</Button>
      </TriggerRow>
    </>
  ),
};

export const RichColors: Story = {
  args: { richColors: true, closeButton: true },
  render: (args) => (
    <>
      <Sonner {...args} />
      <TriggerRow>
        <Button onClick={() => toast.success('Profile updated.')}>Success</Button>
        <Button onClick={() => toast.info('Heads up.')}>Info</Button>
        <Button onClick={() => toast.warning('Storage almost full.')}>Warning</Button>
        <Button onClick={() => toast.error('Could not connect.')}>Error</Button>
      </TriggerRow>
    </>
  ),
};

export const Expanded: Story = {
  args: { expand: true, richColors: true },
  render: (args) => (
    <>
      <Sonner {...args} />
      <TriggerRow>
        <Button
          onClick={() => {
            toast.success('First toast.');
            toast.info('Second toast.');
            toast.warning('Third toast.');
          }}
        >
          Stack three toasts
        </Button>
      </TriggerRow>
    </>
  ),
};

export const TopCenter: Story = {
  args: { position: 'top-center' },
  render: (args) => (
    <>
      <Sonner {...args} />
      <TriggerRow>
        <Button onClick={() => toast('Anchored to top-center.')}>Fire toast</Button>
      </TriggerRow>
    </>
  ),
};

export const PromiseLifecycle: Story = {
  args: { richColors: true },
  render: (args) => (
    <>
      <Sonner {...args} />
      <TriggerRow>
        <Button
          onClick={() => {
            const draft = new Promise<string>((resolve) => {
              setTimeout(() => resolve('draft-123'), 1500);
            });
            toast.promise(draft, {
              loading: 'Saving draft…',
              success: (id: string) => `Saved as ${id}.`,
              error: 'Could not save.',
            });
          }}
        >
          Save draft (promise)
        </Button>
      </TriggerRow>
    </>
  ),
};

const POSITIONS = [
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
] as const;

type Position = (typeof POSITIONS)[number];

const AllPositionsDemo = (
  args: React.ComponentProps<typeof Sonner>,
) => {
  const [position, setPosition] = React.useState<Position>('bottom-right');
  return (
    <>
      <Sonner {...args} position={position} />
      <div className="flex flex-col gap-3 p-6">
        <div className="flex flex-wrap gap-2">
          {POSITIONS.map((option) => (
            <Button
              key={option}
              variant={option === position
                ? 'primary'
                : 'outline'}
              onClick={() => setPosition(option)}
            >
              {option}
            </Button>
          ))}
        </div>
        <Button onClick={() => toast(`Toast anchored to ${position}.`)}>
          Fire toast
        </Button>
      </div>
    </>
  );
};

export const AllPositions: Story = {
  render: (args) => <AllPositionsDemo {...args} />,
};
