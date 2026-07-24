import { cva, type VariantProps } from 'class-variance-authority';

/**
 * DocsSidebar — the docs left rail: sticky, section-grouped nav links. Sticks
 * below the portal header and scrolls independently when the nav outgrows the
 * viewport.
 */
export const docsSidebarNav = cva(
  'sticky top-20 max-h-[calc(100vh-100px)] self-start overflow-y-auto',
);

/** The mono section label above each group of links. */
export const docsSidebarSection = cva(
  'mb-1.5 pl-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-fg3',
);

/**
 * A sidebar nav link. `!` beats tokens.css's unlayered `a` rule (accent color
 * + underline). The active row gets the sunk fill and a 2px primary rail.
 */
export const docsSidebarLink = cva(
  'block rounded-sm border-l-2 px-2.5 py-[5px] text-[13.5px] !no-underline',
  {
    variants: {
      active: {
        true: 'border-primary bg-surface-sunk font-semibold !text-fg1',
        false: 'border-transparent font-normal !text-fg2 hover:bg-surface-sunk/50',
      },
    },
    defaultVariants: { active: false },
  },
);

export type DocsSidebarLinkVariants = VariantProps<typeof docsSidebarLink>;
