import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { Breadcrumb, type BreadcrumbItem } from './Breadcrumb';

const sampleItems: BreadcrumbItem[] = [
  { type: 'crumb', label: 'Home', href: '/' },
  { type: 'separator' },
  { type: 'crumb', label: 'Library', href: '/library' },
  { type: 'separator' },
  { type: 'crumb', label: 'Settings' },
];

describe('Breadcrumb', () => {
  it('renders the nav root with the default aria-label and an ordered list', () => {
    const { container } = render(<Breadcrumb items={sampleItems} />);

    const root = container.querySelector('[data-slot="breadcrumb-root"]');
    expect(root).not.toBeNull();
    expect(root?.tagName).toBe('NAV');
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();

    const list = container.querySelector('[data-slot="breadcrumb-list"]');
    expect(list).not.toBeNull();
    expect(list?.tagName).toBe('OL');

    const crumbItems = container.querySelectorAll('[data-slot="breadcrumb-item"]');
    expect(crumbItems).toHaveLength(3);
  });

  it('renders linkable crumbs as anchors and the last crumb as aria-current="page" without an anchor', () => {
    render(<Breadcrumb items={sampleItems} />);

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Library' })).toHaveAttribute('href', '/library');

    expect(screen.queryByRole('link', { name: 'Settings' })).toBeNull();
    const current = screen.getByText('Settings');
    expect(current.tagName).toBe('SPAN');
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(current).toHaveAttribute('data-slot', 'breadcrumb-page');
  });

  it('marks a crumb with current: true as the current page and skips its anchor even when href is supplied', () => {
    render(
      <Breadcrumb
        items={[
          { type: 'crumb', label: 'Home', href: '/' },
          { type: 'separator' },
          { type: 'crumb', label: 'Forced', href: '/forced', current: true },
          { type: 'separator' },
          { type: 'crumb', label: 'Last', href: '/last' },
        ]}
      />,
    );

    expect(screen.queryByRole('link', { name: 'Forced' })).toBeNull();
    expect(screen.getByText('Forced')).toHaveAttribute('aria-current', 'page');

    // The last crumb in items[] resolves as current and is also rendered
    // without an anchor wrapper, even though it carries an `href`.
    expect(screen.queryByRole('link', { name: 'Last' })).toBeNull();
    expect(screen.getByText('Last')).toHaveAttribute('aria-current', 'page');

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
  });

  it('renders the default ChevronRight separator and honors per-separator icon overrides', () => {
    const { container } = render(
      <Breadcrumb
        items={[
          { type: 'crumb', label: 'A', href: '/a' },
          { type: 'separator' },
          { type: 'crumb', label: 'B', href: '/b' },
          { type: 'separator', icon: <span data-testid="custom-sep">/</span> },
          { type: 'crumb', label: 'C' },
        ]}
      />,
    );

    const separators = container.querySelectorAll('[data-slot="breadcrumb-separator"]');
    expect(separators).toHaveLength(2);
    separators.forEach((node) => {
      expect(node).toHaveAttribute('aria-hidden');
      expect(node).toHaveAttribute('role', 'presentation');
      expect(node.tagName).toBe('LI');
    });

    // Default separator renders the lucide-react ChevronRight svg.
    expect(separators[0]?.querySelector('svg')).not.toBeNull();
    // The custom override replaces the default icon entirely.
    expect(separators[1]?.querySelector('[data-testid="custom-sep"]')).not.toBeNull();
    expect(separators[1]?.querySelector('svg')).toBeNull();
  });

  it('propagates size to the root text class and the separator icon class', () => {
    const { container } = render(
      <Breadcrumb
        size="lg"
        items={[
          { type: 'crumb', label: 'A', href: '/a' },
          { type: 'separator' },
          { type: 'crumb', label: 'B' },
        ]}
      />,
    );

    const root = container.querySelector('[data-slot="breadcrumb-root"]');
    expect(root).toHaveAttribute('data-size', 'lg');
    expect(root?.className).toMatch(/\btext-base\b/);

    const separator = container.querySelector('[data-slot="breadcrumb-separator"]');
    expect(separator?.className).toContain('[&_svg]:size-4');
  });

  it('renders a non-linkable, non-current crumb as a plain span without aria-current', () => {
    render(
      <Breadcrumb
        items={[
          { type: 'crumb', label: 'Plain' },
          { type: 'separator' },
          { type: 'crumb', label: 'Last' },
        ]}
      />,
    );
    const plain = screen.getByText('Plain');
    expect(plain.tagName).toBe('SPAN');
    expect(plain).not.toHaveAttribute('aria-current');
  });

  it('forwards the ref to the underlying nav element', () => {
    const ref = { current: null as HTMLElement | null };
    render(
      <Breadcrumb
        ref={ref}
        items={[
          { type: 'crumb', label: 'Home', href: '/' },
          { type: 'separator' },
          { type: 'crumb', label: 'Current' },
        ]}
      />,
    );
    expect(ref.current).toBeInstanceOf(HTMLElement);
    expect(ref.current?.tagName).toBe('NAV');
  });

  it('honours a consumer-supplied aria-label on the nav root', () => {
    render(
      <Breadcrumb
        aria-label="Section trail"
        items={[
          { type: 'crumb', label: 'A', href: '/a' },
          { type: 'separator' },
          { type: 'crumb', label: 'B' },
        ]}
      />,
    );
    expect(
      screen.getByRole('navigation', { name: 'Section trail' }),
    ).toBeInTheDocument();
  });

  it('has no a11y violations', async () => {
    const { container } = render(<Breadcrumb items={sampleItems} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
