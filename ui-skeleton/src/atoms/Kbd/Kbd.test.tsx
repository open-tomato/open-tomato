import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { Kbd } from './Kbd';

describe('Kbd', () => {
  it('renders children inside a <kbd> element', () => {
    render(<Kbd>Esc</Kbd>);
    const node = screen.getByText('Esc');
    expect(node).toBeInTheDocument();
    expect(node.tagName).toBe('KBD');
  });

  it('applies the variant class for the solid lg combination', () => {
    render(
      <Kbd variant="solid" size="lg" data-testid="kbd">
        Cmd
      </Kbd>,
    );
    const node = screen.getByTestId('kbd');
    expect(node).toHaveClass('bg-muted');
    expect(node).toHaveClass('h-7');
  });

  it('exposes the resolved variant and size via data attributes', () => {
    render(
      <Kbd variant="ghost" size="sm" data-testid="kbd">
        Tab
      </Kbd>,
    );
    const node = screen.getByTestId('kbd');
    expect(node).toHaveAttribute('data-slot', 'kbd');
    expect(node).toHaveAttribute('data-variant', 'ghost');
    expect(node).toHaveAttribute('data-size', 'sm');
  });

  it('defaults to outline/md when variants are omitted', () => {
    render(<Kbd data-testid="kbd">K</Kbd>);
    const node = screen.getByTestId('kbd');
    expect(node).toHaveAttribute('data-variant', 'outline');
    expect(node).toHaveAttribute('data-size', 'md');
    expect(node).toHaveClass('border-border');
    expect(node).toHaveClass('h-6');
  });

  it('has no a11y violations', async () => {
    const { container } = render(
      <span>
        Press <Kbd>Ctrl</Kbd> + <Kbd>K</Kbd> to open the command bar.
      </span>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
