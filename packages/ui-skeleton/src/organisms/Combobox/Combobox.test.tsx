import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Combobox, matchesQuery, type ComboboxItem } from './Combobox';

const baseItems: ComboboxItem[] = [
  { value: 'next', label: 'Next.js' },
  { value: 'remix', label: 'Remix' },
  { value: 'astro', label: 'Astro', keywords: ['static', 'ssg'] },
  { value: 'sveltekit', label: 'SvelteKit' },
  { value: 'gatsby', label: 'Gatsby', disabled: true },
];

describe('matchesQuery (helper)', () => {
  it('returns true for any item when the query is empty', () => {
    expect(matchesQuery({ value: 'a', label: 'A' }, '')).toBe(true);
  });

  it('matches case-insensitively against label, value, and keywords', () => {
    const item: ComboboxItem = {
      value: 'astro',
      label: 'Astro',
      keywords: ['static', 'SSG'],
    };
    expect(matchesQuery(item, 'AST')).toBe(true);
    expect(matchesQuery(item, 'tro')).toBe(true);
    expect(matchesQuery(item, 'STATIC')).toBe(true);
    expect(matchesQuery(item, 'ssg')).toBe(true);
    expect(matchesQuery(item, 'remix')).toBe(false);
  });

  it('falls back to value/keywords when label is not a string', () => {
    const item: ComboboxItem = {
      value: 'foo',
      label: <span>Decorated</span>,
      keywords: ['bar'],
    };
    expect(matchesQuery(item, 'foo')).toBe(true);
    expect(matchesQuery(item, 'bar')).toBe(true);
    expect(matchesQuery(item, 'decorated')).toBe(false);
  });
});

describe('Combobox', () => {
  it('renders the trigger with the placeholder when no value is selected and hides the listbox', () => {
    render(
      <Combobox
        size="lg"
        items={baseItems}
        placeholder="Pick a framework"
        aria-label="Framework"
      />,
    );

    const trigger = screen.getByRole('combobox', { name: 'Framework' });
    expect(trigger).toHaveAttribute('data-slot', 'combobox-trigger');
    expect(trigger).toHaveAttribute('data-size', 'lg');
    expect(trigger).toHaveAttribute('data-state', 'closed');
    expect(trigger).toHaveAttribute('data-placeholder', 'true');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).not.toHaveAttribute('aria-controls');
    expect(trigger).toHaveTextContent('Pick a framework');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('opens the popover when the trigger is clicked and renders one option per item', async () => {
    const user = userEvent.setup();
    render(
      <Combobox
        items={baseItems}
        placeholder="Pick"
        searchPlaceholder="Search frameworks…"
        aria-label="Framework"
      />,
    );

    await user.click(screen.getByRole('combobox', { name: 'Framework' }));

    const listbox = await screen.findByRole('listbox', { name: 'Framework' });
    expect(listbox).toHaveAttribute('data-slot', 'combobox-list');

    const options = within(listbox).getAllByRole('option');
    expect(options).toHaveLength(baseItems.length);
    expect(options.map((o) => o.getAttribute('data-value'))).toEqual([
      'next',
      'remix',
      'astro',
      'sveltekit',
      'gatsby',
    ]);

    // Disabled descriptor reflects on the rendered option.
    const gatsby = within(listbox).getByRole('option', { name: 'Gatsby' });
    expect(gatsby).toHaveAttribute('data-disabled', 'true');
    expect(gatsby).toHaveAttribute('aria-disabled', 'true');

    // Search Input is rendered and labelled.
    expect(
      screen.getByPlaceholderText('Search frameworks…'),
    ).toHaveAttribute('data-slot', 'combobox-search-input');

    // Trigger aria flips to expanded with aria-controls wired.
    const trigger = screen.getByRole('combobox', { name: 'Framework' });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('data-state', 'open');
    expect(trigger.getAttribute('aria-controls')).toBe(listbox.getAttribute('id'));
  });

  it('filters items via the search input and renders the empty message when nothing matches', async () => {
    const user = userEvent.setup();
    render(
      <Combobox
        items={baseItems}
        placeholder="Pick"
        searchPlaceholder="Search"
        emptyMessage="No frameworks found."
        aria-label="Framework"
      />,
    );

    await user.click(screen.getByRole('combobox', { name: 'Framework' }));
    const search = await screen.findByPlaceholderText('Search');

    // Substring match against the string `label`.
    await user.type(search, 'ast');
    let listbox = await screen.findByRole('listbox', { name: 'Framework' });
    let options = within(listbox).getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('Astro');

    // Keyword match — typing 'static' surfaces Astro via its keywords[].
    await user.clear(search);
    await user.type(search, 'static');
    listbox = await screen.findByRole('listbox', { name: 'Framework' });
    options = within(listbox).getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('Astro');

    // Zero-match query collapses the listbox and surfaces the empty message.
    await user.clear(search);
    await user.type(search, 'zzz-nothing');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByText('No frameworks found.')).toBeInTheDocument();
  });

  it('selects an option on click, fires onValueChange, closes the popover, and surfaces the label on the trigger', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn<(value: string) => void>();
    render(
      <Combobox
        items={baseItems}
        placeholder="Pick"
        aria-label="Framework"
        onValueChange={onValueChange}
      />,
    );

    await user.click(screen.getByRole('combobox', { name: 'Framework' }));
    const remix = await screen.findByRole('option', { name: 'Remix' });
    await user.click(remix);

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenLastCalledWith('remix');

    const trigger = screen.getByRole('combobox', { name: 'Framework' });
    expect(trigger).toHaveTextContent('Remix');
    expect(trigger).toHaveAttribute('data-state', 'closed');
    expect(trigger).not.toHaveAttribute('data-placeholder');

    // Listbox unmounts when the popover closes.
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('navigates with ArrowDown / ArrowUp and selects with Enter via aria-activedescendant', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn<(value: string) => void>();
    render(
      <Combobox
        items={baseItems}
        placeholder="Pick"
        searchPlaceholder="Search"
        aria-label="Framework"
        onValueChange={onValueChange}
      />,
    );

    await user.click(screen.getByRole('combobox', { name: 'Framework' }));
    const search = await screen.findByPlaceholderText('Search');
    // Auto-focus via onOpenAutoFocus should have parked focus on the input.
    expect(search).toHaveFocus();

    // ArrowDown moves the activedescendant from `next` (auto-focused as the
    // first enabled filtered item) to `remix`.
    await user.keyboard('{ArrowDown}');
    const remix = await screen.findByRole('option', { name: 'Remix' });
    expect(remix).toHaveAttribute('data-focused', 'true');
    expect(search).toHaveAttribute('aria-activedescendant', remix.id);

    // ArrowUp wraps back to `next`.
    await user.keyboard('{ArrowUp}');
    const next = await screen.findByRole('option', { name: 'Next.js' });
    expect(next).toHaveAttribute('data-focused', 'true');

    // Disabled `gatsby` is skipped — pressing End jumps to the last enabled
    // option (`sveltekit`), not gatsby.
    await user.keyboard('{End}');
    const svelte = await screen.findByRole('option', { name: 'SvelteKit' });
    expect(svelte).toHaveAttribute('data-focused', 'true');

    // Enter activates the focused option.
    await user.keyboard('{Enter}');
    expect(onValueChange).toHaveBeenLastCalledWith('sveltekit');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('blocks selection of a disabled item on click', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn<(value: string) => void>();
    render(
      <Combobox
        items={baseItems}
        placeholder="Pick"
        aria-label="Framework"
        onValueChange={onValueChange}
      />,
    );

    await user.click(screen.getByRole('combobox', { name: 'Framework' }));
    const gatsby = await screen.findByRole('option', { name: 'Gatsby' });
    await user.click(gatsby);

    expect(onValueChange).not.toHaveBeenCalled();
    // Listbox stays mounted — the popover did not close.
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
  });

  it('reflects `aria-selected` on the previously selected option when reopened', async () => {
    const user = userEvent.setup();
    const Harness = (): React.JSX.Element => {
      const [value, setValue] = React.useState<string | undefined>(undefined);
      return (
        <Combobox
          items={baseItems}
          placeholder="Pick"
          aria-label="Framework"
          value={value}
          onValueChange={setValue}
        />
      );
    };

    render(<Harness />);

    await user.click(screen.getByRole('combobox', { name: 'Framework' }));
    await user.click(await screen.findByRole('option', { name: 'Remix' }));

    // Reopen — Remix should now be marked as selected.
    await user.click(screen.getByRole('combobox', { name: 'Framework' }));
    const remix = await screen.findByRole('option', { name: 'Remix' });
    expect(remix).toHaveAttribute('aria-selected', 'true');
    expect(remix.querySelector('[data-slot="combobox-option-indicator"]'))
      .not.toBeNull();
  });

  it('propagates the size axis to the trigger, listbox, and options', async () => {
    const user = userEvent.setup();
    render(
      <Combobox
        size="sm"
        items={baseItems}
        placeholder="Pick"
        aria-label="Framework"
      />,
    );

    const trigger = screen.getByRole('combobox', { name: 'Framework' });
    expect(trigger).toHaveAttribute('data-size', 'sm');

    await user.click(trigger);
    const listbox = await screen.findByRole('listbox', { name: 'Framework' });
    expect(listbox).toHaveAttribute('data-size', 'sm');

    // The composed Popover content propagates the same axis to its own data-size.
    const popoverContent = listbox.closest('[data-slot="popover-content"]');
    expect(popoverContent).not.toBeNull();
    expect(popoverContent).toHaveAttribute('data-size', 'sm');
  });

  it('has no a11y violations in the closed and open states', async () => {
    const user = userEvent.setup();
    const { baseElement } = render(
      <Combobox
        items={baseItems}
        placeholder="Pick a framework"
        searchPlaceholder="Search frameworks"
        aria-label="Framework"
      />,
    );

    // Closed state — the listbox isn't in the DOM yet, so the trigger button
    // alone needs to satisfy axe.
    expect(
      await axe(baseElement, { rules: { region: { enabled: false } } }),
    ).toHaveNoViolations();

    // Open state — Radix portals the listbox into document.body, so the a11y
    // scan MUST cover the whole document.body per the portal-based-organism
    // rule in `skills/organism-authoring/SKILL.md`.
    await user.click(screen.getByRole('combobox', { name: 'Framework' }));
    await screen.findByRole('listbox', { name: 'Framework' });
    expect(
      await axe(document.body, { rules: { region: { enabled: false } } }),
    ).toHaveNoViolations();
  });
});
