import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { Alert } from './Alert';

describe('Alert', () => {
  it('renders leading, title, description, body, and actions slots', () => {
    render(
      <Alert
        leading={<span data-testid="leading-icon">!</span>}
        title="Heads up"
        description="Something happened."
        actions={<button type="button">Acknowledge</button>}
      >
        Body content
      </Alert>,
    );
    expect(screen.getByTestId('leading-icon')).toBeInTheDocument();
    expect(screen.getByText('Heads up')).toBeInTheDocument();
    expect(screen.getByText('Something happened.')).toBeInTheDocument();
    expect(screen.getByText('Body content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Acknowledge' })).toBeInTheDocument();
  });

  it('composes the underlying Card with role=alert', () => {
    render(<Alert title="Notice">Body</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('data-slot', 'alert-root');
  });

  it('propagates size to the composed Card padding and Typography variant', () => {
    render(
      <Alert size="lg" title="Heads up" description="Detail">
        Body
      </Alert>,
    );
    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('data-size', 'lg');
    expect(alert).toHaveAttribute('data-padding', 'lg');
    expect(screen.getByText('Heads up')).toHaveAttribute('data-variant', 'h3');
  });

  it('exposes severity via data-severity and renders a custom header override', () => {
    render(
      <Alert
        severity="error"
        header={<div data-testid="custom-header">Custom</div>}
        title="Ignored"
        description="Ignored"
      >
        Body
      </Alert>,
    );
    expect(screen.getByRole('alert')).toHaveAttribute('data-severity', 'error');
    expect(screen.getByTestId('custom-header')).toBeInTheDocument();
    expect(screen.queryByText('Ignored')).not.toBeInTheDocument();
  });

  it('has no a11y violations', async () => {
    const { container } = render(
      <Alert severity="success" title="Saved" description="Your changes are live." />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
