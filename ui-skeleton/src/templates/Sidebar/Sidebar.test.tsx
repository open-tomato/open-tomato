import { render, renderHook, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { Sidebar, type SidebarNavItem, useSidebar } from './Sidebar';

const baseNav: SidebarNavItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    leading: <span data-testid="dashboard-leading">D</span>,
    active: true,
  },
  {
    label: 'Reports',
    href: '/reports',
    leading: <span data-testid="reports-leading">R</span>,
  },
  {
    label: 'Settings',
    href: '/settings',
    trailing: <span data-testid="settings-trailing">3</span>,
  },
];

describe('Sidebar', () => {
  it('renders the aside landmark with all three slots and the resolved data attributes in desktop (expanded) state', () => {
    const { container } = render(
      <Sidebar
        header={<span data-testid="brand">Acme</span>}
        nav={baseNav}
        footer={<span data-testid="user-menu">Sign out</span>}
        navAriaLabel="Primary"
      />,
    );

    const root = container.querySelector('[data-slot="sidebar-root"]');
    expect(root).not.toBeNull();
    expect(root?.tagName).toBe('ASIDE');
    expect(root).toHaveAttribute('data-side', 'left');
    expect(root).toHaveAttribute('data-density', 'comfortable');
    expect(root).toHaveAttribute('data-mode', 'expanded');
    expect(root).toHaveAttribute('data-state', 'expanded');
    expect(root).not.toHaveAttribute('aria-hidden');

    // Three landmark slots inside the rail.
    expect(container.querySelector('[data-slot="sidebar-header"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="sidebar-footer"]')).not.toBeNull();

    const nav = screen.getByRole('navigation', { name: 'Primary' });
    expect(nav).toHaveAttribute('data-slot', 'sidebar-nav');

    expect(screen.getByTestId('brand')).toBeInTheDocument();
    expect(screen.getByTestId('user-menu')).toBeInTheDocument();
  });

  it('renders one <a> per nav descriptor with the optional leading and trailing slots inside aria-hidden spans', () => {
    render(
      <Sidebar nav={baseNav} navAriaLabel="Primary" />,
    );

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(3);

    expect(screen.getByRole('link', { name: /Dashboard/ })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /Reports/ })).toHaveAttribute('href', '/reports');
    expect(screen.getByRole('link', { name: /Settings/ })).toHaveAttribute('href', '/settings');

    // Active descriptor maps to data-active + aria-current="page".
    const dashboardLink = screen.getByRole('link', { name: /Dashboard/ });
    expect(dashboardLink).toHaveAttribute('data-active', '');
    expect(dashboardLink).toHaveAttribute('aria-current', 'page');

    // Inactive descriptors omit data-active.
    const reportsLink = screen.getByRole('link', { name: /Reports/ });
    expect(reportsLink).not.toHaveAttribute('data-active');
    expect(reportsLink).not.toHaveAttribute('aria-current');

    // Leading and trailing render raw inside aria-hidden spans.
    const leadingSpan = screen.getByTestId('dashboard-leading').parentElement;
    expect(leadingSpan).toHaveAttribute('aria-hidden');
    expect(leadingSpan).toHaveAttribute('data-slot', 'sidebar-nav-link-leading');

    const trailingSpan = screen.getByTestId('settings-trailing').parentElement;
    expect(trailingSpan).toHaveAttribute('aria-hidden');
    expect(trailingSpan).toHaveAttribute('data-slot', 'sidebar-nav-link-trailing');
  });

  it('flips the slide-out direction via the data-side attribute (left vs right)', () => {
    const { container, rerender } = render(
      <Sidebar nav={baseNav} side="left" />,
    );

    let root = container.querySelector('[data-slot="sidebar-root"]');
    expect(root).toHaveAttribute('data-side', 'left');

    rerender(<Sidebar nav={baseNav} side="right" />);

    root = container.querySelector('[data-slot="sidebar-root"]');
    expect(root).toHaveAttribute('data-side', 'right');
  });

  it('propagates density into the header, nav, and footer subpart cvas via data-density', () => {
    const { container, rerender } = render(
      <Sidebar
        header={<span>Acme</span>}
        nav={baseNav}
        footer={<span>Sign out</span>}
        density="comfortable"
      />,
    );

    let root = container.querySelector('[data-slot="sidebar-root"]');
    expect(root).toHaveAttribute('data-density', 'comfortable');

    rerender(
      <Sidebar
        header={<span>Acme</span>}
        nav={baseNav}
        footer={<span>Sign out</span>}
        density="compact"
      />,
    );

    root = container.querySelector('[data-slot="sidebar-root"]');
    expect(root).toHaveAttribute('data-density', 'compact');
  });

  it('flips to the mobile-hide state when mode="hidden" and stamps aria-hidden + data-mode', () => {
    const { container } = render(
      <Sidebar
        mode="hidden"
        header={<span data-testid="brand">Acme</span>}
        nav={baseNav}
        footer={<span data-testid="user-menu">Sign out</span>}
        navAriaLabel="Primary"
      />,
    );

    const root = container.querySelector('[data-slot="sidebar-root"]');
    expect(root).toHaveAttribute('data-mode', 'hidden');
    expect(root).toHaveAttribute('data-state', 'hidden');
    expect(root).toHaveAttribute('aria-hidden', 'true');

    // Content still mounted in the DOM — the hidden mode animates via
    // CSS transform, not unmounting — so consumers can rehydrate
    // without losing focus state when the rail re-expands.
    // `aria-hidden=true` on the parent <aside> drops descendant links
    // from the accessibility tree, so query by selector to confirm the
    // anchors remain in the DOM despite being inert.
    expect(screen.getByTestId('brand')).toBeInTheDocument();
    expect(screen.getByTestId('user-menu')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-slot="sidebar-nav-link"]')).toHaveLength(3);
  });

  it('keeps the icon-rail in the accessibility tree when mode="rail" (no aria-hidden, links still focusable)', () => {
    const { container } = render(
      <Sidebar
        mode="rail"
        header={<span data-testid="brand">Acme</span>}
        nav={baseNav}
        navAriaLabel="Primary"
      />,
    );

    const root = container.querySelector('[data-slot="sidebar-root"]');
    expect(root).toHaveAttribute('data-mode', 'rail');
    expect(root).toHaveAttribute('data-state', 'rail');
    // The rail branch must NOT stamp aria-hidden — labels collapse
    // visually but icons remain focusable and announceable. Stamping
    // aria-hidden here would create "ghost focusable" anchors (WCAG
    // 4.1.2: focus lands on links AT cannot announce).
    expect(root).not.toHaveAttribute('aria-hidden');
    expect(screen.getAllByRole('link')).toHaveLength(3);
  });

  it('exposes the resolved variant values via the SidebarContext + useSidebar hook', () => {
    const consumed: Array<{
      mode: string;
      side: string;
      density: string;
    }> = [];

    function Consumer() {
      const value = useSidebar();
      consumed.push({ ...value });
      return <span data-testid="context-consumer">{value.mode}</span>;
    }

    render(
      <Sidebar
        mode="hidden"
        side="right"
        density="compact"
        nav={baseNav}
        header={<Consumer />}
      />,
    );

    expect(screen.getByTestId('context-consumer')).toHaveTextContent('hidden');
    expect(consumed.at(-1)).toEqual({
      mode: 'hidden',
      side: 'right',
      density: 'compact',
    });
  });

  it('throws a descriptive error when useSidebar is called outside a <Sidebar> tree', () => {
    // Suppress React's error-boundary console.error spam for the deliberate throw.
    const originalError = console.error;
    console.error = () => {};

    try {
      expect(() => renderHook(() => useSidebar())).toThrow(
        /useSidebar must be used inside <Sidebar>/,
      );
    } finally {
      console.error = originalError;
    }
  });

  it('omits the header and footer landmark elements when those slots are not supplied', () => {
    const { container } = render(
      <Sidebar nav={baseNav} />,
    );

    expect(container.querySelector('[data-slot="sidebar-header"]')).toBeNull();
    expect(container.querySelector('[data-slot="sidebar-footer"]')).toBeNull();
    expect(container.querySelector('[data-slot="sidebar-nav"]')).not.toBeNull();
  });

  it('uses the descriptor id when supplied and falls back to href as the React key (no console warning)', () => {
    const items: SidebarNavItem[] = [
      { id: 'item-a', label: 'A', href: '/a' },
      { id: 'item-b', label: 'B', href: '/b' },
      { label: 'C', href: '/c' },
    ];

    const warn = console.error;
    const calls: string[] = [];
    console.error = (...args: unknown[]) => {
      const first = args[0];
      if (typeof first === 'string') calls.push(first);
    };

    try {
      render(<Sidebar nav={items} />);
    } finally {
      console.error = warn;
    }

    // No "Each child in a list should have a unique key" warning.
    expect(calls.find((call) => call.includes('unique "key"'))).toBeUndefined();
    expect(screen.getAllByRole('link')).toHaveLength(3);
  });

  it('has no a11y violations in the desktop (expanded) state', async () => {
    const { container } = render(
      <Sidebar
        header={<span>Acme</span>}
        nav={baseNav}
        footer={<span>Sign out</span>}
        navAriaLabel="Primary"
        aria-label="Application sidebar"
      />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no a11y violations in the mobile-hide state (content slid off-screen, aria-hidden=true)', async () => {
    const { container } = render(
      <Sidebar
        mode="hidden"
        header={<span>Acme</span>}
        nav={baseNav}
        footer={<span>Sign out</span>}
        navAriaLabel="Primary"
        aria-label="Application sidebar"
      />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no a11y violations in the icon-rail state (rail remains in the AT tree)', async () => {
    const { container } = render(
      <Sidebar
        mode="rail"
        header={<span>Acme</span>}
        nav={baseNav}
        footer={<span>Sign out</span>}
        navAriaLabel="Primary"
        aria-label="Application sidebar"
      />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
