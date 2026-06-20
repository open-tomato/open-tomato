import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { Slider } from './Slider';

describe('Slider', () => {
  it('renders a slider with the accessible name from aria-label', () => {
    render(<Slider defaultValue={[40]} aria-label="Volume" />);
    expect(screen.getByRole('slider', { name: 'Volume' })).toBeInTheDocument();
  });

  it('renders one thumb per defaultValue entry', () => {
    render(<Slider defaultValue={[20, 80]} aria-label="Range" />);
    expect(screen.getAllByRole('slider')).toHaveLength(2);
  });

  it('falls back to two thumbs at [min,max] when neither value nor defaultValue is provided', () => {
    const { container } = render(<Slider aria-label="Range" />);
    expect(container.querySelectorAll('[data-slot="slider-thumb"]')).toHaveLength(2);
  });

  it('exposes the resolved size via data attribute on the root', () => {
    const { container } = render(<Slider defaultValue={[10]} size="lg" aria-label="x" />);
    expect(container.querySelector('[data-slot="slider"]'))
      .toHaveAttribute('data-size', 'lg');
  });

  it('applies the size class to the thumb for the lg size', () => {
    const { container } = render(<Slider defaultValue={[10]} size="lg" aria-label="x" />);
    expect(container.querySelector('[data-slot="slider-thumb"]'))
      .toHaveClass('size-5');
  });

  it('applies the size class to the thumb for the sm size', () => {
    const { container } = render(<Slider defaultValue={[10]} size="sm" aria-label="x" />);
    expect(container.querySelector('[data-slot="slider-thumb"]'))
      .toHaveClass('size-3');
  });

  it('defaults to md size when size is omitted', () => {
    const { container } = render(<Slider defaultValue={[10]} aria-label="x" />);
    expect(container.querySelector('[data-slot="slider"]'))
      .toHaveAttribute('data-size', 'md');
    expect(container.querySelector('[data-slot="slider-thumb"]'))
      .toHaveClass('size-4');
  });

  it('renders the track and range slots inside the root', () => {
    const { container } = render(<Slider defaultValue={[50]} aria-label="x" />);
    expect(container.querySelector('[data-slot="slider-track"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="slider-range"]')).not.toBeNull();
  });

  it('forwards aria-valuenow / valuemin / valuemax to the thumb', () => {
    render(<Slider defaultValue={[42]} min={0} max={100} aria-label="x" />);
    const thumb = screen.getByRole('slider');
    expect(thumb).toHaveAttribute('aria-valuenow', '42');
    expect(thumb).toHaveAttribute('aria-valuemin', '0');
    expect(thumb).toHaveAttribute('aria-valuemax', '100');
  });

  it('reflects disabled on the underlying primitive', () => {
    const { container } = render(<Slider defaultValue={[20]} aria-label="x" disabled />);
    expect(container.querySelector('[data-slot="slider"]'))
      .toHaveAttribute('data-disabled');
  });

  it('reflects vertical orientation on the root via data attribute', () => {
    const { container } = render(<Slider orientation="vertical" defaultValue={[20]} aria-label="x" />);
    expect(container.querySelector('[data-slot="slider"]'))
      .toHaveAttribute('data-orientation', 'vertical');
  });

  it('has no a11y violations', async () => {
    const { container } = render(<Slider defaultValue={[40]} aria-label="Volume" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
