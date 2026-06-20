import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { Button } from '@/atoms/Button';

import { ButtonGroup } from './ButtonGroup';

describe('ButtonGroup', () => {
  it('renders each Button child as a native button', () => {
    render(
      <ButtonGroup>
        <Button>Left</Button>
        <Button>Middle</Button>
        <Button>Right</Button>
      </ButtonGroup>,
    );
    expect(screen.getAllByRole('button')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Left' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Right' })).toBeInTheDocument();
  });

  it('composes the wrapper with role=group and surfaces orientation + attached', () => {
    render(
      <ButtonGroup orientation="vertical" attached>
        <Button>Top</Button>
        <Button>Bottom</Button>
      </ButtonGroup>,
    );
    const group = screen.getByRole('group');
    expect(group).toHaveAttribute('data-slot', 'button-group-root');
    expect(group).toHaveAttribute('data-orientation', 'vertical');
    expect(group).toHaveAttribute('data-attached', '');
  });

  it('propagates size and variant to Button children via React.cloneElement', () => {
    render(
      <ButtonGroup variant="outline" size="lg">
        <Button>First</Button>
        <Button>Second</Button>
      </ButtonGroup>,
    );
    expect(screen.getByRole('button', { name: 'First' })).toHaveAttribute('data-size', 'lg');
    expect(screen.getByRole('button', { name: 'First' })).toHaveAttribute('data-variant', 'outline');
    expect(screen.getByRole('button', { name: 'Second' })).toHaveAttribute('data-size', 'lg');
    expect(screen.getByRole('button', { name: 'Second' })).toHaveAttribute('data-variant', 'outline');
  });

  it('respects per-child overrides over the group-level size and variant', () => {
    render(
      <ButtonGroup variant="outline" size="lg">
        <Button>Inherits</Button>
        <Button variant="destructive" size="sm">Overrides</Button>
      </ButtonGroup>,
    );
    expect(screen.getByRole('button', { name: 'Inherits' })).toHaveAttribute('data-variant', 'outline');
    expect(screen.getByRole('button', { name: 'Inherits' })).toHaveAttribute('data-size', 'lg');
    expect(screen.getByRole('button', { name: 'Overrides' })).toHaveAttribute('data-variant', 'destructive');
    expect(screen.getByRole('button', { name: 'Overrides' })).toHaveAttribute('data-size', 'sm');
  });

  it('defaults to horizontal orientation and non-attached when omitted', () => {
    render(
      <ButtonGroup>
        <Button>Only</Button>
      </ButtonGroup>,
    );
    const group = screen.getByRole('group');
    expect(group).toHaveAttribute('data-orientation', 'horizontal');
    expect(group).not.toHaveAttribute('data-attached');
  });

  it('has no a11y violations', async () => {
    const { container } = render(
      <ButtonGroup variant="outline" aria-label="Text alignment">
        <Button>Left</Button>
        <Button>Center</Button>
        <Button>Right</Button>
      </ButtonGroup>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
