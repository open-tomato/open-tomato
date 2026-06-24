import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { Button } from '@/atoms/Button';

import { Popover } from './Popover';

describe('Popover', () => {
  it('renders the trigger and hides content by default', () => {
    render(
      <Popover trigger={<Button>Open</Button>}>
        <p>Hidden body</p>
      </Popover>,
    );
    expect(screen.getByRole('button', { name: /Open/ })).toBeInTheDocument();
    expect(screen.queryByText('Hidden body')).not.toBeInTheDocument();
  });

  it('opens portaled content when the trigger is clicked', async () => {
    const user = userEvent.setup();
    render(
      <Popover trigger={<Button>Open</Button>}>
        <p>Body content</p>
      </Popover>,
    );

    await user.click(screen.getByRole('button', { name: /Open/ }));
    const body = await screen.findByText('Body content');
    expect(body).toBeInTheDocument();
    const content = body.closest('[data-slot="popover-content"]');
    expect(content).not.toBeNull();
    expect(content).toHaveAttribute('data-size', 'md');
  });

  it('composes Card and propagates size to the Card padding axis when title is set', async () => {
    const user = userEvent.setup();
    render(
      <Popover
        size="lg"
        trigger={<Button>Open</Button>}
        title="Settings"
        description="Tune behavior."
      >
        <p>Body</p>
      </Popover>,
    );

    await user.click(screen.getByRole('button', { name: /Open/ }));

    expect(await screen.findByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Tune behavior.')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();

    const card = screen.getByText('Settings').closest('[data-padding]');
    expect(card).not.toBeNull();
    expect(card).toHaveAttribute('data-padding', 'lg');
    expect(card).toHaveAttribute('data-variant', 'elevated');
  });

  it('skips Card composition when neither title nor description is provided', async () => {
    const user = userEvent.setup();
    render(
      <Popover trigger={<Button>Open</Button>}>
        <p>Plain body</p>
      </Popover>,
    );

    await user.click(screen.getByRole('button', { name: /Open/ }));
    const body = await screen.findByText('Plain body');
    const content = body.closest('[data-slot="popover-content"]');
    expect(content).not.toBeNull();
    expect(content?.querySelector('[data-padding]')).toBeNull();
  });

  it('has no a11y violations when open', async () => {
    const user = userEvent.setup();
    const { baseElement } = render(
      <Popover
        trigger={<Button>Open</Button>}
        title="Heads up"
        description="Detail"
        contentProps={{ 'aria-label': 'Heads up popover' }}
      >
        <p>Body</p>
      </Popover>,
    );

    await user.click(screen.getByRole('button', { name: /Open/ }));
    await screen.findByText('Body');
    expect(await axe(baseElement)).toHaveNoViolations();
  });
});
