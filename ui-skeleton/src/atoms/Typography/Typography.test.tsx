import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { Typography } from './Typography';

describe('Typography', () => {
  it('renders children', () => {
    render(<Typography>Hello</Typography>);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('defaults to a <p> with the body variant when no props are provided', () => {
    render(<Typography data-testid="t">Body</Typography>);
    const node = screen.getByTestId('t');
    expect(node.tagName).toBe('P');
    expect(node).toHaveAttribute('data-slot', 'typography');
    expect(node).toHaveAttribute('data-variant', 'body');
    expect(node).toHaveAttribute('data-as', 'p');
    expect(node).toHaveClass('text-base');
  });

  it('renders an <h1> for variant="display" and applies the display class', () => {
    render(
      <Typography variant="display" data-testid="t">
        Big
      </Typography>,
    );
    const node = screen.getByTestId('t');
    expect(node.tagName).toBe('H1');
    expect(node).toHaveClass('text-6xl');
  });

  it('maps each heading variant to the matching tag by default', () => {
    const cases: ReadonlyArray<['h1' | 'h2' | 'h3' | 'h4', string]> = [
      ['h1', 'H1'],
      ['h2', 'H2'],
      ['h3', 'H3'],
      ['h4', 'H4'],
    ];
    const { rerender } = render(
      <Typography variant="h1" data-testid="t">
        x
      </Typography>,
    );
    for (const [variant, tag] of cases) {
      rerender(
        <Typography variant={variant} data-testid="t">
          x
        </Typography>,
      );
      const node = screen.getByTestId('t');
      expect(node.tagName).toBe(tag);
      expect(node).toHaveAttribute('data-variant', variant);
      expect(node).toHaveAttribute('data-as', variant);
    }
  });

  it('renders a <code> for variant="code" with font-mono', () => {
    render(
      <Typography variant="code" data-testid="t">
        npm install
      </Typography>,
    );
    const node = screen.getByTestId('t');
    expect(node.tagName).toBe('CODE');
    expect(node).toHaveClass('font-mono');
  });

  it('renders <span> for variant="caption" and variant="kbd" by default', () => {
    const { rerender } = render(
      <Typography variant="caption" data-testid="t">
        cap
      </Typography>,
    );
    expect(screen.getByTestId('t').tagName).toBe('SPAN');
    expect(screen.getByTestId('t')).toHaveClass('text-muted-foreground');

    rerender(
      <Typography variant="kbd" data-testid="t">
        K
      </Typography>,
    );
    expect(screen.getByTestId('t').tagName).toBe('SPAN');
    expect(screen.getByTestId('t')).toHaveClass('font-mono');
  });

  it('the `as` prop overrides the default tag mapping for a variant', () => {
    render(
      <Typography variant="h1" as="span" data-testid="t">
        Looks like h1
      </Typography>,
    );
    const node = screen.getByTestId('t');
    expect(node.tagName).toBe('SPAN');
    expect(node).toHaveAttribute('data-variant', 'h1');
    expect(node).toHaveAttribute('data-as', 'span');
    expect(node).toHaveClass('text-4xl');
  });

  it('applies the weight axis class', () => {
    render(
      <Typography weight="semibold" data-testid="t">
        w
      </Typography>,
    );
    expect(screen.getByTestId('t')).toHaveClass('font-semibold');
  });

  it('applies the align axis class', () => {
    render(
      <Typography align="center" data-testid="t">
        a
      </Typography>,
    );
    expect(screen.getByTestId('t')).toHaveClass('text-center');
  });

  it('forwards arbitrary HTML attributes to the rendered element', () => {
    render(
      <Typography id="my-id" lang="en" data-testid="t">
        x
      </Typography>,
    );
    const node = screen.getByTestId('t');
    expect(node).toHaveAttribute('id', 'my-id');
    expect(node).toHaveAttribute('lang', 'en');
  });

  it('has no a11y violations for a representative document', async () => {
    const { container } = render(
      <article>
        <Typography variant="h1">Title</Typography>
        <Typography variant="body">Paragraph body text.</Typography>
        <Typography variant="caption">Caption</Typography>
        <Typography variant="code">npm install</Typography>
      </article>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
