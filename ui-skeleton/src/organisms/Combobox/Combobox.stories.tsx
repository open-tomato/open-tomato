import type { Meta, StoryObj } from '@storybook/react';

import * as React from 'react';

import { Combobox, type ComboboxItem } from './Combobox';

const frameworks: ComboboxItem[] = [
  { value: 'next', label: 'Next.js', keywords: ['react', 'vercel'] },
  { value: 'remix', label: 'Remix', keywords: ['react', 'shopify'] },
  { value: 'astro', label: 'Astro', keywords: ['static', 'ssg', 'content'] },
  { value: 'sveltekit', label: 'SvelteKit', keywords: ['svelte'] },
  { value: 'nuxt', label: 'Nuxt', keywords: ['vue'] },
  { value: 'solidstart', label: 'SolidStart', keywords: ['solid'] },
  { value: 'qwikcity', label: 'QwikCity', keywords: ['qwik', 'resumability'] },
  { value: 'redwood', label: 'Redwood', keywords: ['react', 'fullstack'] },
  { value: 'blitz', label: 'Blitz', keywords: ['react', 'fullstack'] },
  { value: 'angular', label: 'Angular', keywords: ['google'] },
  { value: 'ember', label: 'Ember' },
  { value: 'backbone', label: 'Backbone' },
  { value: 'meteor', label: 'Meteor' },
  { value: 'sails', label: 'Sails.js' },
  { value: 'gatsby', label: 'Gatsby', keywords: ['ssg', 'react'], disabled: true },
  { value: 'fresh', label: 'Fresh', keywords: ['deno'] },
  { value: 'enhance', label: 'Enhance', keywords: ['html-first'] },
  { value: 'lit', label: 'Lit', keywords: ['web-components'] },
  { value: 'stencil', label: 'Stencil', keywords: ['web-components'] },
  { value: 'preact', label: 'Preact' },
];

const meta: Meta<typeof Combobox> = {
  title: 'Organisms/Combobox',
  component: Combobox,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    placeholder: { control: 'text' },
    searchPlaceholder: { control: 'text' },
    emptyMessage: { control: 'text' },
    disabled: { control: 'boolean' },
  },
  args: {
    size: 'md',
    items: frameworks,
    placeholder: 'Pick a framework',
    searchPlaceholder: 'Search frameworks…',
    emptyMessage: 'No framework found.',
    'aria-label': 'Framework',
  },
  parameters: {
    layout: 'centered',
  },
};
export default meta;

type Story = StoryObj<typeof Combobox>;

export const Default: Story = {};

export const Preselected: Story = {
  args: { defaultValue: 'astro' },
};

export const SmallSize: Story = {
  args: { size: 'sm' },
};

export const LargeSize: Story = {
  args: { size: 'lg' },
};

export const DisabledTrigger: Story = {
  args: { disabled: true, defaultValue: 'remix' },
};

export const EmptyByDefault: Story = {
  args: { items: [], placeholder: 'No options yet' },
};

export const Controlled: Story = {
  render: (args) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [value, setValue] = React.useState<string | undefined>('next');
    return (
      <div className="flex flex-col gap-3">
        <Combobox {...args} value={value} onValueChange={setValue} />
        <p className="text-sm text-muted-foreground">
          Selected: <code>{value ?? '(none)'}</code>
        </p>
      </div>
    );
  },
};

export const AllSizes: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <Combobox key={size} {...args} size={size} />
      ))}
    </div>
  ),
};
