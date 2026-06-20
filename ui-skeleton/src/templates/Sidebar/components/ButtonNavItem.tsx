import type React from 'react';

import { forwardRef, isValidElement } from 'react';

import { cn } from '@/index';

import { sidebarNavLinkIconVariants } from '../sidebar.variants';

import { buttonNavItemVariants, type ButtonNavItemVariants } from './NavItems.variants';

export interface ButtonItemProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color' | 'className'>,
  ButtonNavItemVariants {
  /** The label for the button item. */
  label: React.ReactNode;
  /** Optional leading icon node, rendered before children. */
  leading?: React.ReactNode;
  /** Optional trailing icon node, rendered after children. */
  trailing?: React.ReactNode;
  /** Shows loading state and disables interaction. */
  loading?: boolean;
  /** Whether the button item is active. */
  active: boolean;
  /** Whether the button item is collapsed. */
  collapsed: boolean;
  /** Click event handler for the button item. */
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

export const ButtonNavItem = forwardRef<HTMLButtonElement, ButtonItemProps>(
  (
    {
      label, 
      leading: LeadingNode, 
      trailing: TrailingNode, 
      active, 
      collapsed, 
      onClick, 
      disabled,
      loading,
      ...rest
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (  
      <button 
        ref={ref}
        onClick={onClick}
        className={cn(buttonNavItemVariants({ active, collapsed }))}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        aria-disabled={isDisabled || undefined}
        {...rest}
        // style={{

      //   fontSize: 14,
      //   fontWeight: active
      //     ? 600
      //     : 500,
      //   textAlign: 'left',
      //   width: '100%',
      //   transition: 'background var(--dur-fast) var(--ease-out)',
      // }}
      >
        {/* <item.Icon size={18} style={{ color: active
        ? 'var(--primary)'
        : 'var(--fg2)' }} /> */}
        {LeadingNode && isValidElement(LeadingNode) && (
          <span
            aria-hidden
            data-slot="sidebar-nav-link-leading"
            className={cn(sidebarNavLinkIconVariants())}
          >
            {LeadingNode}
          </span>
        )}
        {!collapsed && (
          <span data-slot="sidebar-nav-link-label" className="flex-1 truncate">
            {label}
          </span>
        )}
        {!collapsed && TrailingNode && isValidElement(TrailingNode) && (
          <span
            aria-hidden
            data-slot="sidebar-nav-link-trailing"
            className={cn(sidebarNavLinkIconVariants())}
          >
            {TrailingNode}
          </span>
        )}
      </button>
    );
  },
);

ButtonNavItem.displayName = 'ButtonNavItem';
