import type { Meta, StoryObj } from '@storybook/react-vite';

import { BrandGlyph } from './BrandGlyph';

/**
 * Brand marks the shared lucide `Icon` cannot supply (lucide dropped its
 * brand icons). Paints with `currentColor` — set text color on a parent.
 */
const meta = {
  title: 'Portal/BrandGlyph',
  component: BrandGlyph,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof BrandGlyph>;

export default meta;
type Story = StoryObj<typeof meta>;

export const GitHub: Story = {
  args: { name: 'github', size: 24, label: 'GitHub' },
};

export const Discord: Story = {
  args: { name: 'discord', size: 24, label: 'Discord' },
};
