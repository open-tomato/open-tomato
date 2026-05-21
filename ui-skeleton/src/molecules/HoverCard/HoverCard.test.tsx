import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { Button } from '@/atoms/Button';

import { HoverCard } from './HoverCard';

describe('HoverCard', () => {
  it('renders the trigger and hides content by default', () => {
    render(
      <HoverCard trigger={<Button>Hover me</Button>}>
        <p>Hidden body</p>
      </HoverCard>,
    );
    expect(screen.getByRole('button', { name: /Hover me/ })).toBeInTheDocument();
    expect(screen.queryByText('Hidden body')).not.toBeInTheDocument();
  });

  it('opens portaled content when the trigger is hovered', async () => {
    const user = userEvent.setup();
    render(
      <HoverCard openDelay={0} closeDelay={0} trigger={<Button>Hover me</Button>}>
        <p>Body content</p>
      </HoverCard>,
    );

    await user.hover(screen.getByRole('button', { name: /Hover me/ }));
    const body = await screen.findByText('Body content');
    expect(body).toBeInTheDocument();
    const content = body.closest('[data-slot="hover-card-content"]');
    expect(content).not.toBeNull();
    expect(content).toHaveAttribute('data-size', 'md');
  });

  it('composes Card and propagates size to the Card padding axis', async () => {
    const user = userEvent.setup();
    render(
      <HoverCard
        size="lg"
        openDelay={0}
        closeDelay={0}
        trigger={<Button>Preview</Button>}
      >
        <p>Rich preview</p>
      </HoverCard>,
    );

    await user.hover(screen.getByRole('button', { name: /Preview/ }));

    const body = await screen.findByText('Rich preview');
    const card = body.closest('[data-padding]');
    expect(card).not.toBeNull();
    expect(card).toHaveAttribute('data-padding', 'lg');
    expect(card).toHaveAttribute('data-variant', 'elevated');
  });

  it('forwards openDelay and closeDelay to Radix Root', async () => {
    const user = userEvent.setup();
    render(
      <HoverCard openDelay={0} closeDelay={0} trigger={<Button>Open</Button>}>
        <p>Quick body</p>
      </HoverCard>,
    );

    await user.hover(screen.getByRole('button', { name: /Open/ }));
    expect(await screen.findByText('Quick body')).toBeInTheDocument();
  });

  it('has no a11y violations when open', async () => {
    const user = userEvent.setup();
    const { baseElement } = render(
      <HoverCard
        openDelay={0}
        closeDelay={0}
        trigger={<Button>Hover</Button>}
        contentProps={{ 'aria-label': 'Preview details' }}
      >
        <p>Body</p>
      </HoverCard>,
    );

    await user.hover(screen.getByRole('button', { name: /Hover/ }));
    await screen.findByText('Body');
    expect(
      await axe(baseElement, { rules: { region: { enabled: false } } }),
    ).toHaveNoViolations();
  });
});
