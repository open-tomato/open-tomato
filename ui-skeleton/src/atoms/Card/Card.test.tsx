import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { Card } from './Card';

describe('Card', () => {
  it('renders children inside the content slot', () => {
    render(<Card>Body</Card>);
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('applies the variant class for the elevated lg combination', () => {
    render(
      <Card variant="elevated" padding="lg" data-testid="card">
        Body
      </Card>,
    );
    const node = screen.getByTestId('card');
    expect(node).toHaveClass('shadow-elev-2');
    expect(node).toHaveClass('gap-6');
  });

  it('exposes the resolved variant and padding via data attributes', () => {
    render(
      <Card variant="outlined" padding="sm" data-testid="card">
        Body
      </Card>,
    );
    const node = screen.getByTestId('card');
    expect(node).toHaveAttribute('data-variant', 'outlined');
    expect(node).toHaveAttribute('data-padding', 'sm');
  });

  it('defaults to default/md when variants are omitted', () => {
    render(<Card data-testid="card">Body</Card>);
    const node = screen.getByTestId('card');
    expect(node).toHaveAttribute('data-variant', 'default');
    expect(node).toHaveAttribute('data-padding', 'md');
    expect(node).toHaveClass('border');
    expect(node).toHaveClass('gap-4');
  });

  it('renders title and description inside a header section', () => {
    render(
      <Card title="Login" description="Use your email">
        Body
      </Card>,
    );
    const title = screen.getByText('Login');
    const description = screen.getByText('Use your email');
    expect(title.closest('[data-slot="card-header"]')).not.toBeNull();
    expect(description.closest('[data-slot="card-header"]')).not.toBeNull();
  });

  it('renders a custom header node when `header` is provided', () => {
    render(
      <Card header={<div data-testid="custom-header">Custom</div>} title="Ignored">
        Body
      </Card>,
    );
    expect(screen.getByTestId('custom-header')).toBeInTheDocument();
    expect(screen.queryByText('Ignored')).not.toBeInTheDocument();
  });

  it('omits the header section when no header props are supplied', () => {
    const { container } = render(<Card>Body</Card>);
    expect(container.querySelector('[data-slot="card-header"]')).toBeNull();
  });

  it('renders a footer section when `footer` is provided', () => {
    render(<Card footer={<button type="button">Save</button>}>Body</Card>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('omits the footer section when `footer` is not supplied', () => {
    const { container } = render(<Card>Body</Card>);
    expect(container.querySelector('[data-slot="card-footer"]')).toBeNull();
  });

  it('has no a11y violations', async () => {
    const { container } = render(
      <Card title="Account" description="Manage your settings">
        <p>Profile</p>
      </Card>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
