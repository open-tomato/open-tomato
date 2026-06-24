import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { AspectRatio } from './AspectRatio';

describe('AspectRatio', () => {
  it('renders children inside the ratio wrapper', () => {
    render(
      <AspectRatio ratio="video">
        <span data-testid="child">cover</span>
      </AspectRatio>,
    );
    expect(screen.getByTestId('child')).toHaveTextContent('cover');
  });

  it('applies the variant class for the portrait ratio', () => {
    render(
      <AspectRatio ratio="portrait" data-testid="ratio">
        <span>x</span>
      </AspectRatio>,
    );
    expect(screen.getByTestId('ratio')).toHaveClass('aspect-[3/4]');
  });

  it('exposes the resolved ratio via data-ratio', () => {
    render(
      <AspectRatio ratio="square" data-testid="ratio">
        <span>x</span>
      </AspectRatio>,
    );
    expect(screen.getByTestId('ratio')).toHaveAttribute('data-ratio', 'square');
  });

  it('defaults to the video ratio when ratio is omitted', () => {
    render(
      <AspectRatio data-testid="ratio">
        <span>x</span>
      </AspectRatio>,
    );
    const node = screen.getByTestId('ratio');
    expect(node).toHaveAttribute('data-ratio', 'video');
    expect(node).toHaveClass('aspect-[16/9]');
  });

  it('has no a11y violations', async () => {
    const { container } = render(
      <AspectRatio ratio="square">
        <img src="/x.jpg" alt="example" />
      </AspectRatio>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
