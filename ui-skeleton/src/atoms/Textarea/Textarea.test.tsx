import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Textarea } from './Textarea';

describe('Textarea', () => {
  it('renders a textbox with the placeholder', () => {
    render(<Textarea placeholder="Write here" />);
    expect(screen.getByPlaceholderText('Write here')).toBeInTheDocument();
  });

  it('exposes the role textbox', () => {
    render(<Textarea aria-label="comment" />);
    expect(screen.getByRole('textbox', { name: 'comment' })).toBeInstanceOf(HTMLTextAreaElement);
  });

  it('applies the variant class for the error variant', () => {
    render(<Textarea aria-label="x" variant="error" />);
    expect(screen.getByRole('textbox', { name: 'x' })).toHaveClass('border-destructive');
  });

  it('applies the size class for lg', () => {
    render(<Textarea aria-label="x" size="lg" />);
    expect(screen.getByRole('textbox', { name: 'x' })).toHaveClass('h-10');
  });

  it('exposes resolved variant, size, density, and tone via data attributes', () => {
    render(
      <Textarea aria-label="x" variant="success" size="sm" density="compact" tone="subtle" />,
    );
    const el = screen.getByRole('textbox', { name: 'x' });
    expect(el).toHaveAttribute('data-variant', 'success');
    expect(el).toHaveAttribute('data-size', 'sm');
    expect(el).toHaveAttribute('data-density', 'compact');
    expect(el).toHaveAttribute('data-tone', 'subtle');
    expect(el).toHaveAttribute('data-slot', 'textarea');
  });

  it('defaults to default/md/comfortable/neutral when variants are omitted', () => {
    render(<Textarea aria-label="x" />);
    const el = screen.getByRole('textbox', { name: 'x' });
    expect(el).toHaveAttribute('data-variant', 'default');
    expect(el).toHaveAttribute('data-size', 'md');
    expect(el).toHaveAttribute('data-density', 'comfortable');
    expect(el).toHaveAttribute('data-tone', 'neutral');
    expect(el).toHaveClass('border-input');
    expect(el).toHaveClass('h-9');
  });

  it('propagates density=compact via the substituted min-h class', () => {
    render(<Textarea aria-label="x" density="compact" />);
    const el = screen.getByRole('textbox', { name: 'x' });
    expect(el).toHaveAttribute('data-density', 'compact');
    expect(el).toHaveClass('[&]:min-h-7');
    expect(el).toHaveClass('py-0');
    expect(el).not.toHaveClass('[&]:h-7');
  });

  it('propagates tone=subtle to the textarea class', () => {
    render(<Textarea aria-label="x" tone="subtle" />);
    const el = screen.getByRole('textbox', { name: 'x' });
    expect(el).toHaveAttribute('data-tone', 'subtle');
    expect(el).toHaveClass('border-0');
    expect(el).toHaveClass('bg-muted/40');
  });

  it('propagates tone=inverted to the textarea class', () => {
    render(<Textarea aria-label="x" tone="inverted" />);
    const el = screen.getByRole('textbox', { name: 'x' });
    expect(el).toHaveAttribute('data-tone', 'inverted');
    expect(el).toHaveClass('bg-foreground');
    expect(el).toHaveClass('text-background');
  });

  it('automatically sets aria-invalid when variant=error', () => {
    render(<Textarea aria-label="bad" variant="error" />);
    expect(screen.getByRole('textbox', { name: 'bad' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('does not set aria-invalid for non-error variants', () => {
    render(<Textarea aria-label="ok" variant="success" />);
    expect(screen.getByRole('textbox', { name: 'ok' })).not.toHaveAttribute('aria-invalid');
  });

  it('honours an explicit aria-invalid override on error variant', () => {
    render(<Textarea aria-label="ok" variant="error" aria-invalid={false} />);
    expect(screen.getByRole('textbox', { name: 'ok' })).toHaveAttribute('aria-invalid', 'false');
  });

  it('forwards ref to the underlying textarea element', () => {
    const ref = React.createRef<HTMLTextAreaElement>();
    render(<Textarea aria-label="x" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });

  it('forwards disabled to the textarea', () => {
    render(<Textarea aria-label="x" disabled />);
    expect(screen.getByRole('textbox', { name: 'x' })).toBeDisabled();
  });

  it('forwards rows and cols passthrough', () => {
    render(<Textarea aria-label="x" rows={6} cols={40} />);
    const el = screen.getByRole('textbox', { name: 'x' });
    expect(el).toHaveAttribute('rows', '6');
    expect(el).toHaveAttribute('cols', '40');
  });

  it('accepts user keystrokes', async () => {
    const user = userEvent.setup();
    render(<Textarea aria-label="x" />);
    const el = screen.getByRole('textbox', { name: 'x' });
    await user.type(el, 'hello');
    expect(el).toHaveValue('hello');
  });

  it('omits the data-auto-resize attribute by default', () => {
    render(<Textarea aria-label="x" />);
    expect(screen.getByRole('textbox', { name: 'x' })).not.toHaveAttribute('data-auto-resize');
  });

  it('sets data-auto-resize when autoResize is true', () => {
    render(<Textarea aria-label="x" autoResize />);
    expect(screen.getByRole('textbox', { name: 'x' })).toHaveAttribute('data-auto-resize', '');
  });

  it('adjusts inline height on input when autoResize is true', async () => {
    const user = userEvent.setup();
    render(<Textarea aria-label="x" autoResize />);
    const el = screen.getByRole('textbox', { name: 'x' }) as HTMLTextAreaElement;
    Object.defineProperty(el, 'scrollHeight', { configurable: true, value: 144 });
    await user.type(el, 'line 1\nline 2');
    expect(el.style.height).toBe('144px');
  });

  it('does not modify inline height when autoResize is omitted', async () => {
    const user = userEvent.setup();
    render(<Textarea aria-label="x" />);
    const el = screen.getByRole('textbox', { name: 'x' }) as HTMLTextAreaElement;
    await user.type(el, 'line 1');
    expect(el.style.height).toBe('');
  });

  it('re-adjusts height when controlled value changes with autoResize on', () => {
    const { rerender } = render(<Textarea aria-label="x" autoResize value="short" onChange={() => {}} />);
    const el = screen.getByRole('textbox', { name: 'x' }) as HTMLTextAreaElement;
    Object.defineProperty(el, 'scrollHeight', { configurable: true, value: 200 });
    rerender(<Textarea aria-label="x" autoResize value="much\nlonger\nvalue" onChange={() => {}} />);
    expect(el.style.height).toBe('200px');
  });

  it('invokes the supplied onChange handler', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Textarea aria-label="x" onChange={handleChange} />);
    await user.type(screen.getByRole('textbox', { name: 'x' }), 'a');
    expect(handleChange).toHaveBeenCalled();
  });

  it('has no a11y violations', async () => {
    const { container } = render(
      <>
        <label htmlFor="comment-textarea">Comment</label>
        <Textarea id="comment-textarea" />
      </>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
