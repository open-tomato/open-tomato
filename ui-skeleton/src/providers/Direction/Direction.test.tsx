import { useDirection } from '@radix-ui/react-direction';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import * as React from 'react';
import { describe, expect, it } from 'vitest';

import { Direction } from './Direction';

/**
 * Test-only consumer that reads the direction context via Radix's official
 * read-side hook. The hook is the public contract — asserting against it
 * confirms the provider mounts Radix's `DirectionProvider` correctly without
 * introspecting Radix internals or scraping `data-*` attributes.
 */
function DirectionConsumer(): React.JSX.Element {
  const dir = useDirection();
  return <span data-testid="observed-dir">{dir}</span>;
}

describe('Direction', () => {
  it('renders children', () => {
    render(
      <Direction>
        <span data-testid="child">child node</span>
      </Direction>,
    );
    expect(screen.getByTestId('child')).toHaveTextContent('child node');
  });

  it('applies the dir prop to the Radix direction context', () => {
    render(
      <Direction dir="rtl">
        <DirectionConsumer />
      </Direction>,
    );
    expect(screen.getByTestId('observed-dir')).toHaveTextContent('rtl');
  });

  it('defaults to ltr when dir is omitted', () => {
    render(
      <Direction>
        <DirectionConsumer />
      </Direction>,
    );
    expect(screen.getByTestId('observed-dir')).toHaveTextContent('ltr');
  });

  it('has no a11y violations', async () => {
    const { container } = render(
      <Direction dir="rtl">
        <main>
          <p>Some descendant content.</p>
        </main>
      </Direction>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
