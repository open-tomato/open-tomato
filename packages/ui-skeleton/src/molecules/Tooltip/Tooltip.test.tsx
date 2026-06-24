import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { Button } from '@/atoms/Button';

import { Tooltip } from './Tooltip';

/**
 * Resolve the VISIBLE Tooltip Content (the popper-wrapped div carrying
 * `data-slot="tooltip-content"`). Radix also renders a visually-hidden
 * duplicate `<span role="tooltip">` inside the same Content for
 * `aria-describedby` wiring — both contain the body text, so `findByText`
 * collides. Scoping to the visible Content disambiguates and keeps the
 * assertions tied to the rendered surface.
 */
const findVisibleContent = async (): Promise<HTMLElement> => waitFor(() => {
  const node = document.querySelector('[data-slot="tooltip-content"]');
  if (node === null) throw new Error('tooltip-content not in DOM yet');
  return node as HTMLElement;
});

describe('Tooltip', () => {
  it('renders the trigger and hides content by default', () => {
    render(
      <Tooltip trigger={<Button>Save</Button>} content="Save changes" delayDuration={0} />,
    );
    expect(screen.getByRole('button', { name: /Save/ })).toBeInTheDocument();
    expect(screen.queryByText('Save changes')).not.toBeInTheDocument();
  });

  it('opens portaled content when the trigger is focused', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip trigger={<Button>Save</Button>} content="Save changes" delayDuration={0} />,
    );

    await user.tab();
    const tooltipContent = await findVisibleContent();
    expect(tooltipContent).toHaveAttribute('data-size', 'md');
    expect(within(tooltipContent).getAllByText('Save changes').length).toBeGreaterThan(0);
  });

  it('propagates size to the data-size attribute on the portaled content', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip
        size="lg"
        trigger={<Button>Help</Button>}
        content="Extended help"
        delayDuration={0}
      />,
    );

    await user.tab();
    const tooltipContent = await findVisibleContent();
    expect(tooltipContent).toHaveAttribute('data-size', 'lg');
  });

  it('wraps content in Typography(caption) for muted tooltip text styling', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip
        trigger={<Button>Inspect</Button>}
        content="Inspect the element"
        delayDuration={0}
      />,
    );

    await user.tab();
    const tooltipContent = await findVisibleContent();
    const body = within(tooltipContent).getAllByText('Inspect the element')[0];
    expect(body).toHaveAttribute('data-slot', 'tooltip-body');
    expect(body).toHaveAttribute('data-variant', 'caption');
  });

  it('has no a11y violations when open', async () => {
    const user = userEvent.setup();
    const { baseElement } = render(
      <main>
        <Tooltip
          trigger={<Button>Save</Button>}
          content="Save changes"
          delayDuration={0}
          contentProps={{ 'aria-label': 'Save changes tooltip' }}
        />
      </main>,
    );

    await user.tab();
    await findVisibleContent();
    /**
     * The `region` rule is disabled because Radix portals the tooltip Content
     * to `document.body` — outside the test's `<main>` landmark. In real
     * usage the consumer's app shell provides the landmark; the portaled
     * tooltip itself sits above the page flow by design.
     */
    expect(
      await axe(baseElement, { rules: { region: { enabled: false } } }),
    ).toHaveNoViolations();
  });
});
