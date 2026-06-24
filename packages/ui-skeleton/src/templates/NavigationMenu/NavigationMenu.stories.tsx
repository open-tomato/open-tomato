import type { Meta, StoryObj } from '@storybook/react';

import { NavigationMenu, type NavigationMenuItem } from './NavigationMenu';

const productsContent = (
  <div className="grid w-[400px] grid-cols-2 gap-3">
    <a
      href="/products/atoms"
      className="rounded-md p-3 hover:bg-accent hover:text-accent-foreground"
    >
      <p className="text-sm font-semibold">Atoms</p>
      <p className="text-xs text-muted-foreground">
        Single-element wrappers with one job each.
      </p>
    </a>
    <a
      href="/products/molecules"
      className="rounded-md p-3 hover:bg-accent hover:text-accent-foreground"
    >
      <p className="text-sm font-semibold">Molecules</p>
      <p className="text-xs text-muted-foreground">
        Atom-composing widgets with shared slot vocabulary.
      </p>
    </a>
    <a
      href="/products/organisms"
      className="rounded-md p-3 hover:bg-accent hover:text-accent-foreground"
    >
      <p className="text-sm font-semibold">Organisms</p>
      <p className="text-xs text-muted-foreground">
        Molecule-composing wrappers with internal state.
      </p>
    </a>
    <a
      href="/products/templates"
      className="rounded-md p-3 hover:bg-accent hover:text-accent-foreground"
    >
      <p className="text-sm font-semibold">Templates</p>
      <p className="text-xs text-muted-foreground">
        Page-surface scaffolds that organize organisms.
      </p>
    </a>
  </div>
);

const learnContent = (
  <ul className="grid w-[300px] gap-1">
    <li>
      <a
        href="/docs/introduction"
        className="block rounded-md p-3 text-sm hover:bg-accent hover:text-accent-foreground"
      >
        Introduction
      </a>
    </li>
    <li>
      <a
        href="/docs/installation"
        className="block rounded-md p-3 text-sm hover:bg-accent hover:text-accent-foreground"
      >
        Installation
      </a>
    </li>
    <li>
      <a
        href="/docs/theming"
        className="block rounded-md p-3 text-sm hover:bg-accent hover:text-accent-foreground"
      >
        Theming
      </a>
    </li>
  </ul>
);

const sampleItems: NavigationMenuItem[] = [
  { type: 'link', label: 'Home', href: '/' },
  { type: 'menu', label: 'Products', content: productsContent },
  { type: 'menu', label: 'Learn', content: learnContent },
  { type: 'separator' },
  { type: 'link', label: 'Pricing', href: '/pricing' },
  { type: 'link', label: 'Blog', href: '/blog' },
];

const meta: Meta<typeof NavigationMenu> = {
  title: 'Templates/NavigationMenu',
  component: NavigationMenu,
  tags: ['autodocs'],
  argTypes: {
    orientation: {
      control: 'inline-radio',
      options: ['horizontal', 'vertical'],
    },
  },
  args: {
    orientation: 'horizontal',
    items: sampleItems,
    'aria-label': 'Primary',
  },
};
export default meta;

type Story = StoryObj<typeof NavigationMenu>;

export const Default: Story = {};

export const Vertical: Story = {
  args: { orientation: 'vertical' },
};

export const Controlled: Story = {
  args: { value: 'navigation-menu-item-1' },
};

export const WithRealisticPageBody: Story = {
  render: function WithRealisticPageBodyStory(args) {
    return (
      <div className="flex min-h-[420px] w-full flex-col">
        <header className="border-b border-border px-4 py-2">
          <NavigationMenu {...args} />
        </header>
        <main className="prose flex-1 p-8 text-foreground">
          <h1 className="mb-4 text-2xl font-semibold">Documentation</h1>
          <p className="text-muted-foreground">
            The NavigationMenu template frames the page chrome — the page body
            sits below the trigger rail and the projected viewport sits between
            them when a menu is open.
          </p>
        </main>
      </div>
    );
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-12">
      {(['horizontal', 'vertical'] as const).map((orientation) => (
        <section key={orientation} className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            orientation={orientation}
          </h2>
          <NavigationMenu
            orientation={orientation}
            aria-label={`Primary (${orientation})`}
            items={[
              { type: 'link', label: 'Home', href: '/' },
              {
                type: 'menu',
                label: `Products (${orientation})`,
                content: productsContent,
              },
              { type: 'separator' },
              { type: 'link', label: 'Pricing', href: '/pricing' },
            ]}
          />
        </section>
      ))}
    </div>
  ),
};
