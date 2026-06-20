import type { Meta, StoryObj } from '@storybook/react';

import { Typography } from './Typography';

const meta: Meta<typeof Typography> = {
  title: 'Atoms/Typography',
  component: Typography,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['display', 'h1', 'h2', 'h3', 'h4', 'body', 'caption', 'code', 'kbd'],
    },
    as: {
      control: 'select',
      options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'code'],
    },
    weight: {
      control: 'select',
      options: ['light', 'regular', 'medium', 'semibold', 'bold'],
    },
    align: {
      control: 'select',
      options: ['left', 'center', 'right', 'justify'],
    },
    children: { control: 'text' },
  },
  args: {
    variant: 'body',
    children: 'The quick brown fox jumps over the lazy dog.',
  },
};
export default meta;

type Story = StoryObj<typeof Typography>;

export const Default: Story = {};

export const AllVariants: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      {(['display', 'h1', 'h2', 'h3', 'h4', 'body', 'caption', 'code', 'kbd'] as const).map(
        (variant) => (
          <div key={variant} className="flex items-baseline gap-3">
            <span className="text-muted-foreground w-20 text-xs uppercase tracking-wide">
              {variant}
            </span>
            <Typography {...args} variant={variant}>
              {variant === 'code' || variant === 'kbd'
                ? variant
                : args.children}
            </Typography>
          </div>
        ),
      )}
    </div>
  ),
};

export const SemanticOverride: Story = {
  render: (args) => (
    <div className="flex flex-col gap-3">
      <Typography {...args} variant="h2" as="h1">
        Visually h2, semantically h1
      </Typography>
      <Typography {...args} variant="caption" as="p">
        Caption styling on a paragraph element
      </Typography>
      <Typography {...args} variant="body" as="span">
        Body styling on a span element
      </Typography>
    </div>
  ),
};

export const Weights: Story = {
  render: (args) => (
    <div className="flex flex-col gap-2">
      {(['light', 'regular', 'medium', 'semibold', 'bold'] as const).map((weight) => (
        <Typography key={weight} {...args} variant="body" weight={weight}>
          {weight}: {args.children}
        </Typography>
      ))}
    </div>
  ),
};

export const Alignment: Story = {
  render: (args) => (
    <div className="flex w-full max-w-md flex-col gap-3">
      {(['left', 'center', 'right', 'justify'] as const).map((align) => (
        <Typography key={align} {...args} variant="body" align={align}>
          {align}: The quick brown fox jumps over the lazy dog repeatedly.
        </Typography>
      ))}
    </div>
  ),
};

export const Article: Story = {
  render: () => (
    <article className="flex max-w-2xl flex-col gap-4">
      <Typography variant="display">Hello, world</Typography>
      <Typography variant="h2">A section heading</Typography>
      <Typography variant="body">
        Body copy reads at the base font size with relaxed leading for comfortable
        scanning across long passages.
      </Typography>
      <Typography variant="h3">A subsection</Typography>
      <Typography variant="body">
        Inline
        {' '}
        <Typography variant="code" as="code">
          code
        </Typography>
        {' '}
        and
        {' '}
        <Typography variant="kbd" as="span">
          ⌘K
        </Typography>
        {' '}
        chips compose cleanly inside body text.
      </Typography>
      <Typography variant="caption">Caption text in a muted color.</Typography>
    </article>
  ),
};
