import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { Button } from '@/atoms/Button';

import { Collapsible } from './Collapsible';

describe('Collapsible', () => {
  it('renders the trigger and hides content by default', () => {
    render(
      <Collapsible trigger={<Button>Toggle</Button>}>
        <p>Hidden body</p>
      </Collapsible>,
    );
    expect(screen.getByRole('button', { name: /Toggle/ })).toBeInTheDocument();
    expect(screen.queryByText('Hidden body')).not.toBeInTheDocument();
  });

  it('composes the underlying Radix root with data-slot, data-size and data-chevron', () => {
    const { container } = render(
      <Collapsible size="lg" chevron="leading" trigger={<Button>Toggle</Button>}>
        <p>Body</p>
      </Collapsible>,
    );
    const root = container.querySelector('[data-slot="collapsible-root"]');
    expect(root).not.toBeNull();
    expect(root).toHaveAttribute('data-size', 'lg');
    expect(root).toHaveAttribute('data-chevron', 'leading');
  });

  it('toggles content visibility and chevron data-state when the trigger is clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Collapsible trigger={<Button>Toggle</Button>}>
        <p>Hidden body</p>
      </Collapsible>,
    );

    const chevron = container.querySelector('[data-slot="collapsible-chevron"]');
    expect(chevron).not.toBeNull();
    expect(chevron).toHaveAttribute('data-state', 'closed');

    await user.click(screen.getByRole('button', { name: /Toggle/ }));

    expect(screen.getByText('Hidden body')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="collapsible-chevron"]'))
      .toHaveAttribute('data-state', 'open');
  });

  it('omits the auto-injected chevron when chevron="none"', () => {
    const { container } = render(
      <Collapsible chevron="none" trigger={<Button>Toggle</Button>}>
        <p>Body</p>
      </Collapsible>,
    );
    expect(container.querySelector('[data-slot="collapsible-chevron"]')).toBeNull();
  });

  it('has no a11y violations', async () => {
    const { container } = render(
      <Collapsible defaultOpen trigger={<Button>Toggle</Button>}>
        <p>Body content</p>
      </Collapsible>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
