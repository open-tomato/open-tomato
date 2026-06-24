import type { Meta, StoryObj } from '@storybook/react';

import { Button } from '@/atoms/Button';

import { ButtonGroup } from './ButtonGroup';

const meta: Meta<typeof ButtonGroup> = {
  title: 'Molecules/ButtonGroup',
  component: ButtonGroup,
  tags: ['autodocs'],
  argTypes: {
    orientation: {
      control: 'inline-radio',
      options: ['horizontal', 'vertical'],
    },
    attached: { control: 'boolean' },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'icon'],
    },
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost', 'destructive'],
    },
  },
  args: {
    orientation: 'horizontal',
    attached: false,
    size: 'md',
    variant: 'outline',
  },
};
export default meta;

type Story = StoryObj<typeof ButtonGroup>;

export const Default: Story = {
  render: (args) => (
    <ButtonGroup {...args}>
      <Button>Left</Button>
      <Button>Center</Button>
      <Button>Right</Button>
    </ButtonGroup>
  ),
};

export const Attached: Story = {
  args: { attached: true, variant: 'outline' },
  render: (args) => (
    <ButtonGroup {...args}>
      <Button>Day</Button>
      <Button>Week</Button>
      <Button>Month</Button>
      <Button>Year</Button>
    </ButtonGroup>
  ),
};

export const Vertical: Story = {
  args: { orientation: 'vertical', variant: 'secondary' },
  render: (args) => (
    <ButtonGroup {...args}>
      <Button>Top</Button>
      <Button>Middle</Button>
      <Button>Bottom</Button>
    </ButtonGroup>
  ),
};

export const VerticalAttached: Story = {
  args: { orientation: 'vertical', attached: true, variant: 'outline' },
  render: (args) => (
    <ButtonGroup {...args}>
      <Button>Top</Button>
      <Button>Middle</Button>
      <Button>Bottom</Button>
    </ButtonGroup>
  ),
};

export const PerChildOverride: Story = {
  render: (args) => (
    <ButtonGroup {...args} variant="outline" size="md">
      <Button>Inherits group</Button>
      <Button variant="destructive">Local override</Button>
      <Button size="lg">Larger</Button>
    </ButtonGroup>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div key={size} className="flex items-start gap-6">
          <ButtonGroup variant="outline" size={size}>
            <Button>Left</Button>
            <Button>Center</Button>
            <Button>Right</Button>
          </ButtonGroup>
          <ButtonGroup attached variant="outline" size={size}>
            <Button>Left</Button>
            <Button>Center</Button>
            <Button>Right</Button>
          </ButtonGroup>
        </div>
      ))}
    </div>
  ),
};
