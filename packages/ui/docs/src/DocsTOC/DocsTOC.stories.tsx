import type { Meta, StoryObj } from '@storybook/react-vite';

import { DocsTOC } from './DocsTOC';

/**
 * DocsTOC: the sticky "On this page" anchor list plus an optional "edit this
 * page" card.
 */
const meta = {
  title: 'Portal/DocsTOC',
  component: DocsTOC,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    anchors: [
      { id: 'step-1', label: 'Initialize a workspace' },
      { id: 'step-2', label: 'Seed your first run' },
      { id: 'step-3', label: 'Review and merge' },
    ],
    editHref: '#edit',
  },
  decorators: [
    (Story) => (
      <div className="w-[220px] bg-bg p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DocsTOC>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Anchor list with the edit card. */
export const Default: Story = {};

/** An active anchor highlighted by a scroll-spy. */
export const WithActive: Story = { args: { active: 'step-2' } };

/** No edit card — omit `editHref`. */
export const NoEditCard: Story = { args: { editHref: undefined } };
